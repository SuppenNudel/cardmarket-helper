// Background script for cross-origin network requests from content scripts
// Includes centralized caching, rate limiting, and request deduplication

console.log('Background script loading...');

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_24H = 24 * 60 * 60 * 1000;
const RATE_LIMIT_DELAY = 100; // 100ms between requests (10 req/sec for Scryfall)
const STORAGE_MIGRATION_FLAG = '__syncToLocalMigrationV1Done';

const KEY_ACCESSORIES = 'accessories';
const KEY_PRICEDATA_ACCESSORIES = 'pricedata-accessories';

const CARD_GAMES = {
    "Magic": 1,
    "Pokemon": 6,
    "YuGiOh": 3,
    "OnePiece": 18,
    "Lorcana": 19,
    "Riftbound": 22,
    "FleshAndBlood": 16,
    "StarWarsUnlimited": 21,
    "Digimon": 17,
    "DragonBallSuper": 13,
    "Vanguard": 8,
    "WeissSchwarz": 10,
    "FinalFantasy": 9,
    "FoW": 7,
    "BattleSpiritsSaga": 20,
    "WoW": 2,
    "StarWarsDestiny": 15,
    "Dragoborne": 11,
    "MyLittlePony": 12,
    "Spoils": 5
};

// ============================================================================
// Cache Manager
// ============================================================================

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.inflightRequests = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.lastRequestTime = 0;
        this.loadPersistentCache();
    }
    
    async loadPersistentCache() {
        try {
            const allKeys = await browser.storage.local.get(null);
            
            for (const [key, value] of Object.entries(allKeys)) {
                if (value && (key.startsWith('pricedata') || key.startsWith('productdata') || key.startsWith('mtgtop8_cache_'))) {
                    this.cache.set(key, value);
                    console.log(`CacheManager: Loaded ${key} from persistent storage`);
                }
            }
        } catch (error) {
            console.error('CacheManager: Error loading persistent cache:', error);
        }
    }
    
    async saveToPersistentStorage(key, data) {
        try {
            await browser.storage.local.set({ [key]: data });
        } catch (error) {
            console.error(`CacheManager: Error saving ${key}:`, error);
        }
    }
    
    isDataOutdated(createdAt, maxAge = CACHE_DURATION_24H) {
        if (!createdAt) return true;
        const cachedDate = new Date(createdAt);
        const currentDate = new Date();
        return (currentDate - cachedDate) > maxAge;
    }
    
    async get(key) {
        const cached = this.cache.get(key);
        
        if (cached) {
            const timestamp = cached.createdAt || cached.timestamp;
            if (timestamp && !this.isDataOutdated(timestamp)) {
                console.log(`CacheManager: Cache hit for ${key}`);
                return cached;
            }
            console.log(`CacheManager: Cache expired for ${key}`);
        }
        
        return null;
    }
    
    set(key, data) {
        this.cache.set(key, data);
        this.saveToPersistentStorage(key, data);
    }
    
    async fetchWithDeduplication(url, options = {}) {
        if (this.inflightRequests.has(url)) {
            console.log(`CacheManager: Request already in flight for ${url}, waiting...`);
            return this.inflightRequests.get(url);
        }
        
        const requestPromise = this.rateLimitedFetch(url, options);
        this.inflightRequests.set(url, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.inflightRequests.delete(url);
        }
    }
    
    async rateLimitedFetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, options, resolve, reject });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
                await this.delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
            }
            
            const { url, options, resolve, reject } = this.requestQueue.shift();
            this.lastRequestTime = Date.now();
            
            console.log(`CacheManager: Fetching ${url}`);
            
            try {
                const response = await fetch(url, {
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body || null,
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'default'
                });
                
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                resolve(data);
            } catch (error) {
                console.error(`CacheManager: Fetch failed for ${url}:`, error);
                reject(error);
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const cacheManager = new CacheManager();

// ============================================================================
// Permission Check
// ============================================================================

async function checkPermissions() {
    const required = [
        'https://api.scryfall.com/*',
        'https://downloads.s3.cardmarket.com/*',
        'https://raw.githubusercontent.com/*'
    ];
    
    for (const origin of required) {
        const hasPermission = await browser.permissions.contains({ origins: [origin] });
        if (!hasPermission) {
            console.error(`Background: Missing required permission for ${origin}`);
            console.error('Please grant permissions in about:addons → Cardmarket Helper → Permissions');
            return false;
        }
    }
    
    console.log('Background: All required permissions granted');
    return true;
}

checkPermissions();

// ============================================================================
// One-Time Storage Migration (sync -> local)
// ============================================================================

async function migrateSyncStorageToLocalIfNeeded() {
    try {
        const migrationState = await browser.storage.local.get(STORAGE_MIGRATION_FLAG);
        if (migrationState[STORAGE_MIGRATION_FLAG]) {
            return;
        }

        const [syncData, localData] = await Promise.all([
            browser.storage.sync.get(null),
            browser.storage.local.get(null)
        ]);

        const entriesToMigrate = Object.entries(syncData || {}).filter(([key]) => {
            if (key === STORAGE_MIGRATION_FLAG) {
                return false;
            }
            return localData[key] === undefined;
        });

        if (entriesToMigrate.length > 0) {
            const payload = Object.fromEntries(entriesToMigrate);
            await browser.storage.local.set(payload);
            console.log(`Background: Migrated ${entriesToMigrate.length} key(s) from storage.sync to storage.local`);
        }

        await browser.storage.local.set({
            [STORAGE_MIGRATION_FLAG]: {
                migratedAt: Date.now(),
                migratedKeys: entriesToMigrate.length
            }
        });
    } catch (error) {
        // Keep startup resilient; migration should never break extension behavior.
        console.warn('Background: sync-to-local migration skipped due to error:', error);
    }
}

// Silent best-effort migration at startup.
migrateSyncStorageToLocalIfNeeded();

// ============================================================================
// Orders (Packed State) Sync - storage.sync <-> storage.local
// ============================================================================
// Each packed order gets its own "packed_<orderId>" key (value = timestamp),
// instead of one big "orders" object. storage.sync enforces an 8KB-per-item
// quota, so a single combined key caps out at ~145 orders; per-key storage is
// instead bounded by the 100KB total / 512 item quota (~500+ orders).
// Only these small keys are synced; everything else stays in storage.local.

const PACKED_KEY_PREFIX = 'packed_';
const PACKED_KEY_SPLIT_MIGRATION_FLAG = '__packedKeySplitMigrationV1Done';
// Orders are shipped well within this window; anything older is stale and safe to drop.
const PACKED_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function isPackedKey(key) {
    return typeof key === 'string' && key.startsWith(PACKED_KEY_PREFIX);
}

async function migratePackedOrdersToPerKeyIfNeeded() {
    try {
        const migrationState = await browser.storage.local.get(PACKED_KEY_SPLIT_MIGRATION_FLAG);
        if (migrationState[PACKED_KEY_SPLIT_MIGRATION_FLAG]) {
            return;
        }

        const [localResult, syncResult] = await Promise.all([
            browser.storage.local.get('orders'),
            browser.storage.sync.get('orders')
        ]);

        const legacyOrders = { ...(syncResult.orders || {}), ...(localResult.orders || {}) };
        const payload = {};
        for (const [orderId, entry] of Object.entries(legacyOrders)) {
            if (entry && entry.timestamp) {
                payload[PACKED_KEY_PREFIX + orderId] = entry.timestamp;
            }
        }

        if (Object.keys(payload).length > 0) {
            await Promise.all([
                browser.storage.local.set(payload),
                browser.storage.sync.set(payload)
            ]);
            console.log(`Background: Migrated ${Object.keys(payload).length} packed order(s) to per-key storage`);
        }

        await Promise.all([
            browser.storage.local.remove('orders'),
            browser.storage.sync.remove('orders'),
            browser.storage.local.set({ [PACKED_KEY_SPLIT_MIGRATION_FLAG]: true })
        ]);
    } catch (error) {
        console.warn('Background: packed orders key-split migration skipped due to error:', error);
    }
}

async function reconcileOrdersWithSync() {
    try {
        const [localData, syncData] = await Promise.all([
            browser.storage.local.get(null),
            browser.storage.sync.get(null)
        ]);

        const now = Date.now();
        const localSet = {};
        const syncSet = {};
        const localRemove = [];
        const syncRemove = [];

        const allKeys = new Set([
            ...Object.keys(localData).filter(isPackedKey),
            ...Object.keys(syncData).filter(isPackedKey)
        ]);

        for (const key of allKeys) {
            const localValue = localData[key];
            const syncValue = syncData[key];
            const newest = Math.max(localValue || 0, syncValue || 0);

            if (now - newest > PACKED_MAX_AGE_MS) {
                // Order is well past shipping, packed marker is no longer needed.
                if (localValue !== undefined) localRemove.push(key);
                if (syncValue !== undefined) syncRemove.push(key);
                continue;
            }

            if (localValue !== newest) localSet[key] = newest;
            if (syncValue !== newest) syncSet[key] = newest;
        }

        await Promise.all([
            Object.keys(localSet).length > 0 ? browser.storage.local.set(localSet) : null,
            Object.keys(syncSet).length > 0 ? browser.storage.sync.set(syncSet) : null,
            localRemove.length > 0 ? browser.storage.local.remove(localRemove) : null,
            syncRemove.length > 0 ? browser.storage.sync.remove(syncRemove) : null
        ]);
    } catch (error) {
        console.warn('Background: orders sync reconciliation failed:', error);
    }
}

async function mirrorPackedKey(targetArea, key, newValue) {
    try {
        const current = await targetArea.get(key);
        // Skip redundant writes so mirroring both directions can't loop forever.
        if (current[key] === newValue) {
            return;
        }
        if (newValue === undefined) {
            await targetArea.remove(key);
        } else {
            await targetArea.set({ [key]: newValue });
        }
    } catch (error) {
        console.warn(`Background: failed to mirror packed key ${key}:`, error);
    }
}

browser.storage.onChanged.addListener((changes, area) => {
    const packedChanges = Object.entries(changes).filter(([key]) => isPackedKey(key));
    if (packedChanges.length === 0) {
        return;
    }
    const targetArea = area === 'local' ? browser.storage.sync : (area === 'sync' ? browser.storage.local : null);
    if (!targetArea) {
        return;
    }
    for (const [key, change] of packedChanges) {
        mirrorPackedKey(targetArea, key, change.newValue);
    }
});

(async function initPackedOrdersSync() {
    await migratePackedOrdersToPerKeyIfNeeded();
    await reconcileOrdersWithSync();
})();

// ============================================================================
// Data Handlers
// ============================================================================

function getCardmarketDataUrl(key, gameId) {
    switch (key) {
        case 'pricedata':
            return `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_${gameId}.json`;
        case KEY_PRICEDATA_ACCESSORIES:
            return `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_accessories.json`;
        case 'productdata':
            return `https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_${gameId}.json`;
        case 'nonsingles':
            return `https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_${gameId}.json`;
        case KEY_ACCESSORIES:
            return `https://downloads.s3.cardmarket.com/productCatalog/productList/products_accessories.json`;
        default:
            throw new Error(`Unknown data key: ${key}`);
    }
}

async function handleCardmarketDataRequest(key, game) {
    // For game-independent data types (like accessories), game parameter is optional
    const cacheKey = key + (game || '');
    
    // Check cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Fetch fresh data
    let url;
    
    if (key === KEY_ACCESSORIES || key === KEY_PRICEDATA_ACCESSORIES) {
        // Accessories don't need a game ID
        url = getCardmarketDataUrl(key, null);
    } else {
        // Game-dependent data 
        const gameId = CARD_GAMES[game];
        if (!gameId) {
            throw new Error(`Game "${game}" is not supported yet`);
        }
        url = getCardmarketDataUrl(key, gameId);
    }
    const rawData = await cacheManager.fetchWithDeduplication(url);
    
    // Transform data (convert array to dictionary)
    let infoKey;
    switch (key) {
        case 'pricedata':
            infoKey = 'priceGuides';
            break;
        case 'productdata':
            infoKey = 'products';
            break;
        default:
            infoKey = 'products';
    }
    
    if (rawData[infoKey] && Array.isArray(rawData[infoKey])) {
        const dictionary = rawData[infoKey].reduce((acc, obj) => {
            acc[obj.idProduct] = obj;
            return acc;
        }, {});
        rawData[infoKey] = dictionary;
    }
    
    // Cache it
    cacheManager.set(cacheKey, rawData);
    
    return rawData;
}

async function handleMtgtop8DataRequest(formatName) {
    const cacheKey = `mtgtop8_cache_${formatName}`;
    
    // Check cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
        return cached.data;
    }
    
    // Fetch fresh data
    const url = `https://raw.githubusercontent.com/SuppenNudel/mtgtop8-topcards/refs/heads/main/${formatName}.json`;
    const data = await cacheManager.fetchWithDeduplication(url);
    
    // Cache it with timestamp
    const cacheData = {
        data: data,
        timestamp: Date.now()
    };
    cacheManager.set(cacheKey, cacheData);
    
    return data;
}

async function handleScryfallRequest(path, options = {}) {
    const url = path.startsWith('http') ? path : `https://api.scryfall.com${path}`;
    
    // Add default headers if not present
    if (!options.headers) {
        options.headers = {};
    }
    if (!options.headers['User-Agent']) {
        options.headers['User-Agent'] = 'NudelForceFirefoxCardmarket/1.1.5';
    }
    if (!options.headers['Content-Type'] && options.method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
    }
    
    // Use rate-limited fetch for Scryfall
    return await cacheManager.fetchWithDeduplication(url, options);
}

// ============================================================================
// Message Handler
// ============================================================================

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background: Received message:', request && request.action);

    if (!request || !request.action) {
        return false;
    }

    // Handle different action types
    const handleAction = async () => {
        try {
            let result;
            
            switch (request.action) {
                case 'getCardmarketData':
                    result = await handleCardmarketDataRequest(request.key, request.game);
                    break;
                    
                case 'getMtgtop8Data':
                    result = await handleMtgtop8DataRequest(request.formatName);
                    break;
                    
                case 'scryfallRequest':
                    result = await handleScryfallRequest(request.path, request.options);
                    break;
                    
                case 'fetch':
                    // Legacy support for direct fetch requests
                    result = await cacheManager.fetchWithDeduplication(request.url, request.options || {});
                    break;

                case 'getInstallType':
                    result = await browser.management.getSelf().then(info => info.installType);
                    break;
                    
                default:
                    throw new Error(`Unknown action: ${request.action}`);
            }
            
            sendResponse({ success: true, data: result });
        } catch (error) {
            console.error(`Background: Error handling ${request.action}:`, error);
            sendResponse({ success: false, error: error.message || String(error) });
        }
    };

    handleAction();
    return true; // Keep message channel open for async response
});

console.log('Background script loaded with centralized cache manager');
