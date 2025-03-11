const STORAGE_KEY = 'config';

async function initConfig() {
    defaultValue = {};
    // await browser.storage.sync.clear();
    try {
        let storageData = await browser.storage.sync.get(STORAGE_KEY);

        // if key doesn't hold data yet
        if(!storageData[STORAGE_KEY] ||  Object.keys(storageData[STORAGE_KEY]).length === 0) {
            storageData[STORAGE_KEY] = defaultValue;
            await browser.storage.sync.set({ [STORAGE_KEY]: storageData[STORAGE_KEY] });
        }
        return storageData[STORAGE_KEY];
    } catch (error) {
        console.error(`Error when init control ${STORAGE_KEY}:`, error);
    }
}

async function saveConfig(value) {
    try {
        plainConfig = JSON.parse(JSON.stringify(value));
        await browser.storage.sync.set({ [STORAGE_KEY]: plainConfig });
    } catch (error) {
        console.error(`Error when saving control ${STORAGE_KEY}:`, error);
    }
}
