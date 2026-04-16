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
        console.debug('[pending-sale] Saving listed-at timestamp:', {
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

        console.debug('[pending-sale] Listed-at timestamp saved:', {
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

function normalizeArticleModificationData(value) {
    if (!value) {
        return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        const summaryLines = Array.isArray(value.summaryLines)
            ? value.summaryLines.map((line) => String(line).trim()).filter(Boolean)
            : [];
        const detailLines = Array.isArray(value.detailLines)
            ? value.detailLines.map((line) => String(line).trim()).filter(Boolean)
            : [];

        if (summaryLines.length === 0) {
            return null;
        }

        return { summaryLines, detailLines };
    }

    if (typeof value === 'string') {
        const [commentText, commentDetails] = value.split('||', 2);
        const summaryLines = String(commentText || value)
            .split(/\s*\|\s*|,\s+/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (summaryLines.length === 0) {
            return null;
        }

        const detailLines = commentDetails
            ? String(commentDetails)
                .split(/\s*\|\s*/)
                .map((line) => line.trim())
                .filter(Boolean)
            : [];

        return { summaryLines, detailLines };
    }

    return null;
}

async function getArticleModificationData(articleId) {
    if (!articleId) {
        return null;
    }

    try {
        const db = await openArticleSaleDatabase();
        const transaction = db.transaction(ARTICLE_SALES_STORE, 'readonly');
        const store = transaction.objectStore(ARTICLE_SALES_STORE);
        const record = await idbRequestToPromise(store.get(String(articleId)));
        db.close();

        if (!record) {
            return null;
        }

        if (record.modificationData) {
            return normalizeArticleModificationData(record.modificationData);
        }

        return normalizeArticleModificationData(record.modificationComment);
    } catch (error) {
        console.error('Error loading article modification data:', error);
        return null;
    }
}

async function saveArticleModificationData(articleId, modificationData) {
    if (!articleId || !modificationData) {
        return;
    }

    const normalizedData = normalizeArticleModificationData(modificationData);
    if (!normalizedData) {
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
            modificationData: normalizedData,
            modificationComment: null
        });
        await idbTransactionDone(transaction);
        db.close();
    } catch (error) {
        console.error('Error saving article modification data:', error);
    }
}

async function getArticleModificationComment(articleId) {
    const data = await getArticleModificationData(articleId);
    if (!data || !Array.isArray(data.summaryLines) || data.summaryLines.length === 0) {
        return null;
    }

    return data.summaryLines.join(', ');
}

async function saveArticleModificationComment(articleId, comment) {
    return saveArticleModificationData(articleId, comment);
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
