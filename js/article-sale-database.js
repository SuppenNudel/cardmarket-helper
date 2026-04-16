const ARTICLE_SALE_DB_NAME = 'cardmarket-helper';
const ARTICLE_SALE_DB_VERSION = 1;
const ARTICLE_SALES_STORE = 'articleSales';
const ARTICLE_SALE_META_STORE = 'articleSaleMeta';
const PENDING_ARTICLE_SALE_KEY = 'pendingArticleSale';
const PENDING_ARTICLE_SALE_MAX_AGE_MS = 10 * 60 * 1000;
const ARTICLE_SALE_MAX_ENTRIES = 5000;

function openArticleSaleDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(ARTICLE_SALE_DB_NAME, ARTICLE_SALE_DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(ARTICLE_SALES_STORE)) {
                db.createObjectStore(ARTICLE_SALES_STORE, { keyPath: 'articleId' });
            }

            if (!db.objectStoreNames.contains(ARTICLE_SALE_META_STORE)) {
                db.createObjectStore(ARTICLE_SALE_META_STORE, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function idbRequestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function idbTransactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
        transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
    });
}

function normalizeArticleSaleTimestamp(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function isPendingArticleSaleExpired(pendingArticleSale) {
    if (!pendingArticleSale || !pendingArticleSale.createdAt) {
        return true;
    }

    const createdAt = new Date(pendingArticleSale.createdAt).getTime();
    if (Number.isNaN(createdAt)) {
        return true;
    }

    return Date.now() - createdAt > PENDING_ARTICLE_SALE_MAX_AGE_MS;
}

async function getArticleSaleTimestamp(articleId) {
    if (!articleId) {
        return null;
    }

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readonly');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const record = await idbRequestToPromise(store.get(String(articleId)));
        db.close();

        return record && typeof record.listedAt === 'string' ? record.listedAt : null;
    } catch (error) {
        console.error('Error loading article sale timestamp:', error);
        return null;
    }
}

async function getArticleSaleTimestamps() {
    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readonly');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const records = await idbRequestToPromise(store.getAll());
        db.close();

        return records.reduce((accumulator, entry) => {
            if (entry && entry.articleId && typeof entry.listedAt === 'string') {
                accumulator[String(entry.articleId)] = entry.listedAt;
            }
            return accumulator;
        }, {});
    } catch (error) {
        console.error('Error loading article sale timestamps:', error);
        return {};
    }
}

async function saveArticleSaleTimestamp(articleId, timestamp) {
    if (!articleId || !timestamp) {
        return;
    }

    const normalizedTimestamp = normalizeArticleSaleTimestamp(timestamp);
    if (!normalizedTimestamp) {
        return;
    }

    try {
        console.log('[pending-sale] Saving listed-at timestamp:', {
            articleId: String(articleId),
            listedAt: normalizedTimestamp
        });

        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readwrite');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const existing = await idbRequestToPromise(store.get(String(articleId)));
        store.put({
            ...(existing || {}),
            articleId: String(articleId),
            listedAt: normalizedTimestamp
        });
        await idbTransactionDone(transaction);
        db.close();

        console.log('[pending-sale] Listed-at timestamp saved:', {
            articleId: String(articleId),
            listedAt: normalizedTimestamp
        });

        await cleanupOldArticleSaleTimestamps();
    } catch (error) {
        console.error('[pending-sale] Error saving article sale timestamp:', {
            articleId: String(articleId),
            error
        });
    }
}

async function cleanupOldArticleSaleTimestamps() {
    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readwrite');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const records = await idbRequestToPromise(store.getAll());

        if (records.length > ARTICLE_SALE_MAX_ENTRIES) {
            records.sort((left, right) => {
                const leftDate = new Date(left.listedAt).getTime();
                const rightDate = new Date(right.listedAt).getTime();
                return rightDate - leftDate;
            });

            const staleRecords = records.slice(ARTICLE_SALE_MAX_ENTRIES);
            for (const record of staleRecords) {
                if (record && record.articleId) {
                    store.delete(String(record.articleId));
                }
            }
        }

        await idbTransactionDone(transaction);
        db.close();
    } catch (error) {
        console.error('Error cleaning up article sale timestamps:', error);
    }
}

async function getArticleLastModified(articleId) {
    if (!articleId) {
        return null;
    }

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readonly');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const record = await idbRequestToPromise(store.get(String(articleId)));
        db.close();

        return record && typeof record.lastModifiedAt === 'string' ? record.lastModifiedAt : null;
    } catch (error) {
        console.error('Error loading article last modified:', error);
        return null;
    }
}

async function saveArticleLastModified(articleId, timestamp) {
    if (!articleId || !timestamp) {
        return;
    }

    const normalizedTimestamp = normalizeArticleSaleTimestamp(timestamp);
    if (!normalizedTimestamp) {
        return;
    }

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readwrite');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const existing = await idbRequestToPromise(store.get(String(articleId)));
        store.put({
            ...(existing || {}),
            articleId: String(articleId),
            lastModifiedAt: normalizedTimestamp
        });
        await idbTransactionDone(transaction);
        db.close();
    } catch (error) {
        console.error('Error saving article last modified:', error);
    }
}

async function getArticleModificationComment(articleId) {
    if (!articleId) {
        return null;
    }

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readonly');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const record = await idbRequestToPromise(store.get(String(articleId)));
        db.close();

        return record && typeof record.modificationComment === 'string' ? record.modificationComment : null;
    } catch (error) {
        console.error('Error loading article modification comment:', error);
        return null;
    }
}

async function saveArticleModificationComment(articleId, comment) {
    if (!articleId || !comment) {
        return;
    }

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readwrite');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const existing = await idbRequestToPromise(store.get(String(articleId)));
        store.put({
            ...(existing || {}),
            articleId: String(articleId),
            modificationComment: String(comment)
        });
        await idbTransactionDone(transaction);
        db.close();
    } catch (error) {
        console.error('Error saving article modification comment:', error);
    }
}

async function savePendingArticleSale(pendingArticleSale) {
    if (!pendingArticleSale || !pendingArticleSale.createdAt) {
        return;
    }

    const normalizedTimestamp = normalizeArticleSaleTimestamp(pendingArticleSale.createdAt);
    if (!normalizedTimestamp) {
        return;
    }

    const entry = {
        key: PENDING_ARTICLE_SALE_KEY,
        value: {
            createdAt: normalizedTimestamp,
            productId: pendingArticleSale.productId ? String(pendingArticleSale.productId) : null,
            isFoil: pendingArticleSale.isFoil || 'N',
            path: pendingArticleSale.path || null,
            knownArticleIds: Array.isArray(pendingArticleSale.knownArticleIds)
                ? pendingArticleSale.knownArticleIds.map((articleId) => String(articleId)).filter(Boolean)
                : []
        }
    };

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALE_META_STORE, 'readwrite');
        transaction.objectStore(ARTICLE_SALE_META_STORE).put(entry);
        await idbTransactionDone(transaction);
        db.close();
    } catch (error) {
        console.error('Error saving pending article sale:', error);
    }
}

async function getPendingArticleSale() {
    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALE_META_STORE, 'readonly');
        const store = transaction.objectStore(ARTICLE_SALE_META_STORE);
        const record = await idbRequestToPromise(store.get(PENDING_ARTICLE_SALE_KEY));
        db.close();

        const pendingArticleSale = record ? record.value : null;
        if (isPendingArticleSaleExpired(pendingArticleSale)) {
            await clearPendingArticleSale();
            return null;
        }

        return pendingArticleSale;
    } catch (error) {
        console.error('Error loading pending article sale:', error);
        return null;
    }
}

async function clearPendingArticleSale() {
    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALE_META_STORE, 'readwrite');
        transaction.objectStore(ARTICLE_SALE_META_STORE).delete(PENDING_ARTICLE_SALE_KEY);
        await idbTransactionDone(transaction);
        db.close();
    } catch (error) {
        console.error('Error clearing pending article sale:', error);
    }
}
