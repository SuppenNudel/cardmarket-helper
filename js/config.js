const STORAGE_KEY = 'config';

function addConfigButton() {
    const offcanvasNav = document.querySelector('#offcanvas-nav > ul');
    
    if (offcanvasNav) {
        const settingsItem = document.createElement('li');
        settingsItem.className = 'nav-item hvr-sweep-to-right';
        
        const settingsLink = document.createElement('a');
        settingsLink.href = '#';
        settingsLink.title = 'Helper Extension Settings';
        settingsLink.className = 'nav-link';
        settingsLink.textContent = 'Helper Extension Settings';
        
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const optionsUrl = browser.runtime.getURL('config/config.html');
            window.open(optionsUrl, '_blank');
        });
        
        settingsItem.appendChild(settingsLink);
        offcanvasNav.appendChild(settingsItem);
    }
}


async function initConfig() {
    defaultValue = {};
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


(async function main() {
    console.log("config.js");
    addConfigButton();
})();