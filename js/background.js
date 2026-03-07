// Background script for cross-origin network requests from content scripts
// Includes centralized caching, rate limiting, and request deduplication

console.log('Background script loading...');

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_24H = 24 * 60 * 60 * 1000;
const RATE_LIMIT_DELAY = 100; // 100ms between requests (10 req/sec for Scryfall)

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
