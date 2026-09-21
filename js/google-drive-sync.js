// Google Drive appDataFolder sync for user-owned extension data.

const GOOGLE_DRIVE_SYNC_KEY = 'googleDriveSync';
const GOOGLE_DRIVE_SYNC_META_KEY = 'googleDriveSyncMeta';
const GOOGLE_OAUTH_WORKER_URL = 'https://cardmarket-helper.rohm-cedric.workers.dev';
const GOOGLE_OAUTH_PROVIDER = 'cloudflare-worker-v1';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_PACKED_KEY_PREFIX = 'packed_';
const DRIVE_STORAGE_MODE_HIDDEN = 'appDataFolder';
const DRIVE_DEBOUNCE_MS = 30000;
const DRIVE_SYNC_ALARM_NAME = 'googleDriveSyncPeriodic';
const DRIVE_SYNC_ALARM_PERIOD_MINUTES = 15;
const DRIVE_AUTH_ALARM_NAME = 'googleDriveAuthPolling';
const DRIVE_AUTH_ALARM_PERIOD_MINUTES = 1;
const DRIVE_SYNC_FILES = {
    settings: 'settings.json',
    packed: 'packed-orders.json',
    collection: 'collection.json'
};
const DRIVE_CACHE_PREFIXES = ['pricedata', 'productdata', 'mtgtop8_cache_'];
const DRIVE_INTERNAL_KEYS = new Set([
    GOOGLE_DRIVE_SYNC_KEY,
    GOOGLE_DRIVE_SYNC_META_KEY,
    '__syncToLocalMigrationV1Done',
    '__packedKeySplitMigrationV1Done'
]);
const DRIVE_COLLECTION_KEYS = ['collection', 'filename', 'fileModifiedTime'];
const DRIVE_EXCLUDED_KEYS = new Set(['orders']);

let googleDriveSyncTimer = null;
let googleDriveSyncInProgress = false;
let googleDriveSuppressMetaUpdate = false;

function isDrivePackedKey(key) {
    return typeof key === 'string' && key.startsWith(DRIVE_PACKED_KEY_PREFIX);
}

function isDriveCacheKey(key) {
    return DRIVE_CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
}

function isDriveCollectionKey(key) {
    return DRIVE_COLLECTION_KEYS.includes(key);
}

function isDriveSettingsKey(key) {
    return !DRIVE_INTERNAL_KEYS.has(key)
        && !DRIVE_EXCLUDED_KEYS.has(key)
        && !isDriveCacheKey(key)
        && !isDrivePackedKey(key)
        && !isDriveCollectionKey(key);
}

function nowMs() {
    return Date.now();
}

function getPackedOrderId(key) {
    return key.slice(DRIVE_PACKED_KEY_PREFIX.length);
}

function getPackedKey(orderId) {
    return DRIVE_PACKED_KEY_PREFIX + orderId;
}

function sanitizeSyncConfig(config) {
    return {
        isConfigured: true,
        isConnected: Boolean(config && config.refreshToken),
        pendingAuth: config && config.pendingAuth ? {
            authorizationUrl: config.pendingAuth.authorizationUrl,
            expiresAt: config.pendingAuth.expiresAt,
            interval: config.pendingAuth.interval,
            storageMode: DRIVE_STORAGE_MODE_HIDDEN
        } : null,
        storageMode: config && config.storageMode || DRIVE_STORAGE_MODE_HIDDEN,
        lastSyncAt: config && config.lastSyncAt || null,
        lastError: config && config.lastError || null
    };
}

async function getSyncConfig() {
    const result = await browser.storage.local.get(GOOGLE_DRIVE_SYNC_KEY);
    const config = result[GOOGLE_DRIVE_SYNC_KEY] || {};
    if (config.authProvider && config.authProvider !== GOOGLE_OAUTH_PROVIDER) {
        const migrated = {
            authProvider: GOOGLE_OAUTH_PROVIDER,
            lastSyncAt: config.lastSyncAt || null,
            lastError: null
        };
        await browser.storage.local.set({ [GOOGLE_DRIVE_SYNC_KEY]: migrated });
        return migrated;
    }
    if (config.clientId || config.clientSecret) {
        const migrated = {
            authProvider: GOOGLE_OAUTH_PROVIDER,
            lastSyncAt: config.lastSyncAt || null,
            lastError: null
        };
        await browser.storage.local.set({ [GOOGLE_DRIVE_SYNC_KEY]: migrated });
        return migrated;
    }
    return config;
}

async function setSyncConfig(updates) {
    const current = await getSyncConfig();
    const next = { ...current, ...updates };
    await browser.storage.local.set({ [GOOGLE_DRIVE_SYNC_KEY]: next });
    return next;
}

async function getSyncMeta() {
    const result = await browser.storage.local.get(GOOGLE_DRIVE_SYNC_META_KEY);
    return result[GOOGLE_DRIVE_SYNC_META_KEY] || {
        settingsUpdatedAt: {},
        packedDeletedAt: {},
        collectionUpdatedAt: 0
    };
}

async function setSyncMeta(meta) {
    await browser.storage.local.set({ [GOOGLE_DRIVE_SYNC_META_KEY]: meta });
}

async function updateSyncMeta(changes) {
    if (googleDriveSuppressMetaUpdate) {
        return;
    }
    const meta = await getSyncMeta();
    const changedAt = nowMs();
    let changed = false;

    meta.settingsUpdatedAt = meta.settingsUpdatedAt || {};
    meta.packedDeletedAt = meta.packedDeletedAt || {};

    for (const [key, change] of Object.entries(changes)) {
        if (isDriveSettingsKey(key)) {
            meta.settingsUpdatedAt[key] = changedAt;
            changed = true;
        } else if (isDrivePackedKey(key)) {
            const orderId = getPackedOrderId(key);
            if (change.newValue === undefined) {
                meta.packedDeletedAt[orderId] = changedAt;
            } else {
                delete meta.packedDeletedAt[orderId];
            }
            changed = true;
        } else if (isDriveCollectionKey(key)) {
            meta.collectionUpdatedAt = changedAt;
            changed = true;
        }
    }

    if (changed) {
        await setSyncMeta(meta);
        scheduleGoogleDriveSync();
    }
}

function scheduleGoogleDriveSync() {
    clearTimeout(googleDriveSyncTimer);
    googleDriveSyncTimer = setTimeout(() => {
        GoogleDriveSync.syncNow().catch(error => {
            console.warn('Google Drive sync failed:', error);
        });
    }, DRIVE_DEBOUNCE_MS);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
        const message = data && (data.error_description || data.error && data.error.message || data.error) || response.statusText;
        throw new Error(message);
    }
    return data;
}

async function ensureAccessToken() {
    const config = await getSyncConfig();
    if (!config.refreshToken) {
        throw new Error('Google Drive is not connected.');
    }
    if (config.accessToken && config.expiresAt && config.expiresAt - 60000 > nowMs()) {
        return config.accessToken;
    }

    const token = await fetchJson(`${GOOGLE_OAUTH_WORKER_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: config.refreshToken })
    });

    await setSyncConfig({
        accessToken: token.access_token,
        expiresAt: nowMs() + ((token.expires_in || 3600) * 1000),
        lastError: null
    });
    return token.access_token;
}

async function driveFetch(url, options = {}) {
    const accessToken = await ensureAccessToken();
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
    };
    return fetchJson(url, { ...options, headers });
}

async function findDriveFileId(fileName) {
    const query = encodeURIComponent(`name='${fileName.replace(/'/g, "\\'")}' and trashed=false`);
    const fields = encodeURIComponent('files(id,name,modifiedTime)');
    const result = await driveFetch(`${GOOGLE_DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=${fields}`);
    return result.files && result.files[0] ? result.files[0].id : null;
}

async function readDriveFile(fileName) {
    const fileId = await findDriveFileId(fileName);
    if (!fileId) {
        return null;
    }
    return driveFetch(`${GOOGLE_DRIVE_FILES_URL}/${fileId}?alt=media`);
}

async function writeDriveFile(fileName, data) {
    const fileId = await findDriveFileId(fileName);
    const boundary = 'cardmarket-helper-' + Math.random().toString(36).slice(2);
    const metadata = fileId ? { name: fileName } : { name: fileName, parents: ['appDataFolder'] };
    const body = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(data),
        `--${boundary}--`,
        ''
    ].join('\r\n');

    const url = fileId
        ? `${GOOGLE_DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`
        : `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart`;
    return driveFetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
    });
}

async function buildLocalSettingsState(localData, meta) {
    const items = {};
    for (const [key, value] of Object.entries(localData)) {
        if (isDriveSettingsKey(key)) {
            items[key] = {
                value,
                updatedAt: meta.settingsUpdatedAt && meta.settingsUpdatedAt[key] || 0
            };
        }
    }
    return { version: 1, updatedAt: nowMs(), items };
}

async function buildLocalPackedState(localData, meta) {
    const orders = {};
    for (const [key, value] of Object.entries(localData)) {
        if (isDrivePackedKey(key) && value) {
            orders[getPackedOrderId(key)] = {
                packedAt: value,
                updatedAt: value
            };
        }
    }
    return {
        version: 1,
        updatedAt: nowMs(),
        orders,
        deletedAt: meta.packedDeletedAt || {}
    };
}

async function buildLocalCollectionState(localData, meta) {
    if (!localData.collection) {
        return null;
    }
    return {
        version: 1,
        updatedAt: meta.collectionUpdatedAt || localData.fileModifiedTime || 0,
        collection: localData.collection,
        filename: localData.filename || null,
        fileModifiedTime: localData.fileModifiedTime || null
    };
}

async function applyMergedState(merged) {
    googleDriveSuppressMetaUpdate = true;
    try {
        const setPayload = {};
        const removeKeys = [];

        for (const [key, entry] of Object.entries(merged.settings.items || {})) {
            setPayload[key] = entry.value;
        }

        for (const [orderId, entry] of Object.entries(merged.packed.orders || {})) {
            setPayload[getPackedKey(orderId)] = entry.packedAt;
        }

        for (const orderId of Object.keys(merged.packed.deletedAt || {})) {
            removeKeys.push(getPackedKey(orderId));
        }

        if (merged.collection) {
            setPayload.collection = merged.collection.collection;
            setPayload.filename = merged.collection.filename;
            setPayload.fileModifiedTime = merged.collection.fileModifiedTime;
        }

        if (Object.keys(setPayload).length > 0) {
            await browser.storage.local.set(setPayload);
        }
        if (removeKeys.length > 0) {
            await browser.storage.local.remove(removeKeys);
        }

        console.log('Google Drive packed state applied:', {
            set: Object.keys(setPayload).filter(isDrivePackedKey),
            removed: removeKeys.filter(isDrivePackedKey)
        });

        const meta = await getSyncMeta();
        meta.settingsUpdatedAt = {};
        for (const [key, entry] of Object.entries(merged.settings.items || {})) {
            meta.settingsUpdatedAt[key] = entry.updatedAt || 0;
        }
        meta.packedDeletedAt = merged.packed.deletedAt || {};
        meta.collectionUpdatedAt = merged.collection ? merged.collection.updatedAt || 0 : meta.collectionUpdatedAt || 0;
        await setSyncMeta(meta);
    } finally {
        googleDriveSuppressMetaUpdate = false;
    }
}

function mergeSettings(localState, remoteState) {
    const merged = { version: 1, updatedAt: nowMs(), items: {} };
    const keys = new Set([
        ...Object.keys(localState.items || {}),
        ...Object.keys(remoteState && remoteState.items || {})
    ]);
    for (const key of keys) {
        const localEntry = localState.items && localState.items[key];
        const remoteEntry = remoteState && remoteState.items && remoteState.items[key];
        if (!remoteEntry || (localEntry && (localEntry.updatedAt || 0) >= (remoteEntry.updatedAt || 0))) {
            merged.items[key] = localEntry;
        } else {
            merged.items[key] = remoteEntry;
        }
    }
    return merged;
}

function mergePacked(localState, remoteState) {
    const merged = { version: 1, updatedAt: nowMs(), orders: {}, deletedAt: {} };
    const remoteOrders = remoteState && remoteState.orders || {};
    const remoteDeletedAt = remoteState && remoteState.deletedAt || {};
    const localOrders = localState.orders || {};
    const localDeletedAt = localState.deletedAt || {};
    const orderIds = new Set([
        ...Object.keys(localOrders),
        ...Object.keys(remoteOrders),
        ...Object.keys(localDeletedAt),
        ...Object.keys(remoteDeletedAt)
    ]);

    for (const orderId of orderIds) {
        const localOrder = localOrders[orderId];
        const remoteOrder = remoteOrders[orderId];
        const packedEntry = !remoteOrder || (localOrder && (localOrder.updatedAt || 0) >= (remoteOrder.updatedAt || 0))
            ? localOrder
            : remoteOrder;
        const deletedAt = Math.max(localDeletedAt[orderId] || 0, remoteDeletedAt[orderId] || 0);

        if (packedEntry && (packedEntry.updatedAt || 0) > deletedAt) {
            merged.orders[orderId] = packedEntry;
        } else if (deletedAt > 0) {
            merged.deletedAt[orderId] = deletedAt;
        }
    }
    return merged;
}

function mergeCollection(localState, remoteState) {
    if (!remoteState) {
        return localState;
    }
    if (!localState) {
        return remoteState;
    }
    return (localState.updatedAt || 0) >= (remoteState.updatedAt || 0) ? localState : remoteState;
}

async function buildLocalState() {
    const [localData, meta] = await Promise.all([
        browser.storage.local.get(null),
        getSyncMeta()
    ]);
    return {
        settings: await buildLocalSettingsState(localData, meta),
        packed: await buildLocalPackedState(localData, meta),
        collection: await buildLocalCollectionState(localData, meta)
    };
}

async function pullRemoteState() {
    const [settings, packed, collection] = await Promise.all([
        readDriveFile(DRIVE_SYNC_FILES.settings),
        readDriveFile(DRIVE_SYNC_FILES.packed),
        readDriveFile(DRIVE_SYNC_FILES.collection)
    ]);
    return { settings, packed, collection };
}

async function pushMergedState(merged) {
    const writes = [
        writeDriveFile(DRIVE_SYNC_FILES.settings, merged.settings),
        writeDriveFile(DRIVE_SYNC_FILES.packed, merged.packed)
    ];
    if (merged.collection) {
        writes.push(writeDriveFile(DRIVE_SYNC_FILES.collection, merged.collection));
    }
    await Promise.all(writes);
}

async function syncNow() {
    if (googleDriveSyncInProgress) {
        return sanitizeSyncConfig(await getSyncConfig());
    }
    const config = await getSyncConfig();
    if (!config.refreshToken) {
        return sanitizeSyncConfig(config);
    }
    googleDriveSyncInProgress = true;
    try {
        const localState = await buildLocalState();
        const remoteState = await pullRemoteState();
        const merged = {
            settings: mergeSettings(localState.settings, remoteState.settings),
            packed: mergePacked(localState.packed, remoteState.packed),
            collection: mergeCollection(localState.collection, remoteState.collection)
        };
        console.log('Google Drive packed state merged:', {
            local: Object.keys(localState.packed.orders || {}),
            remote: Object.keys(remoteState.packed && remoteState.packed.orders || {}),
            remoteDeleted: Object.keys(remoteState.packed && remoteState.packed.deletedAt || {}),
            merged: Object.keys(merged.packed.orders || {}),
            mergedDeleted: Object.keys(merged.packed.deletedAt || {})
        });
        await applyMergedState(merged);
        await pushMergedState(merged);
        const config = await setSyncConfig({ lastSyncAt: nowMs(), lastError: null });
        return sanitizeSyncConfig(config);
    } catch (error) {
        await setSyncConfig({ lastError: error.message || String(error) });
        throw error;
    } finally {
        googleDriveSyncInProgress = false;
    }
}

function createOAuthState() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function startAuth() {
    const state = createOAuthState();
    await fetchJson(`${GOOGLE_OAUTH_WORKER_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
    });
    const pendingAuth = {
        state,
        authorizationUrl: `${GOOGLE_OAUTH_WORKER_URL}/auth?state=${encodeURIComponent(state)}`,
        expiresAt: nowMs() + (10 * 60 * 1000),
        interval: 2,
        storageMode: DRIVE_STORAGE_MODE_HIDDEN
    };
    const next = await setSyncConfig({ authProvider: GOOGLE_OAUTH_PROVIDER, pendingAuth, lastError: null });
    return sanitizeSyncConfig(next);
}

async function pollAuth() {
    const config = await getSyncConfig();
    if (!config.pendingAuth || !config.pendingAuth.state) {
        throw new Error('No Google Drive authorization is pending.');
    }
    if (config.pendingAuth.expiresAt < nowMs()) {
        await setSyncConfig({ pendingAuth: null });
        throw new Error('Google Drive authorization expired. Please connect again.');
    }

    const response = await fetch(`${GOOGLE_OAUTH_WORKER_URL}/status?state=${encodeURIComponent(config.pendingAuth.state)}`, {
        cache: 'no-store'
    });
    const result = await response.json();
    if (response.status === 202) {
        return sanitizeSyncConfig(config);
    }
    if (!response.ok || result.status !== 'complete') {
        await setSyncConfig({ pendingAuth: null, lastError: result.error || 'Google Drive authorization failed.' });
        throw new Error(result.error || 'Google Drive authorization failed.');
    }

    const next = await setSyncConfig({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: nowMs() + ((result.expiresIn || 3600) * 1000),
        connectedAt: nowMs(),
        authProvider: GOOGLE_OAUTH_PROVIDER,
        storageMode: DRIVE_STORAGE_MODE_HIDDEN,
        pendingAuth: null,
        lastError: null
    });
    await syncNow();
    return sanitizeSyncConfig(next);
}

async function pollPendingAuthInBackground() {
    const config = await getSyncConfig();
    if (!config.pendingAuth) {
        return;
    }
    try {
        await pollAuth();
    } catch (error) {
        console.warn('Google Drive background authorization polling failed:', error);
    }
}

const GoogleDriveSync = {
    async getStatus() {
        return sanitizeSyncConfig(await getSyncConfig());
    },

    startAuth,
    pollAuth,
    syncNow,

    async disconnect() {
        clearTimeout(googleDriveSyncTimer);
        const config = await getSyncConfig();
        await browser.storage.local.set({
            [GOOGLE_DRIVE_SYNC_KEY]: {
                authProvider: GOOGLE_OAUTH_PROVIDER,
                lastSyncAt: config.lastSyncAt || null,
                lastError: null
            }
        });
        return sanitizeSyncConfig(await getSyncConfig());
    }
};

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
        return;
    }
    updateSyncMeta(changes).catch(error => {
        console.warn('Google Drive sync metadata update failed:', error);
    });
});

if (browser.alarms) {
    browser.alarms.create(DRIVE_SYNC_ALARM_NAME, { periodInMinutes: DRIVE_SYNC_ALARM_PERIOD_MINUTES });
    browser.alarms.create(DRIVE_AUTH_ALARM_NAME, { periodInMinutes: DRIVE_AUTH_ALARM_PERIOD_MINUTES });
    browser.alarms.onAlarm.addListener(alarm => {
        if (alarm.name === DRIVE_SYNC_ALARM_NAME) {
            GoogleDriveSync.syncNow().catch(error => {
                console.warn('Periodic Google Drive sync failed:', error);
            });
        } else if (alarm.name === DRIVE_AUTH_ALARM_NAME) {
            pollPendingAuthInBackground();
        }
    });
}

GoogleDriveSync.syncNow().catch(() => {
    // Status is surfaced on the options page; startup should stay quiet.
});
