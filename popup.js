async function initStorage(storageKey, defaultValue) {
    try {
        let storageData = await browser.storage.local.get(storageKey);

        // if key doesn't hold data yet
        if(!storageData[storageKey] ||  Object.keys(storageData[storageKey]).length === 0) {
            storageData[storageKey] = defaultValue;
            await browser.storage.local.set({ storageKey: storageData[storageKey] });
        }
        return storageData[storageKey];
    } catch (error) {
        console.error(`Error when init control ${storageKey}:`, error);
    }
}

async function initFormats() {
    try {
        // Retrieve the 'formats' object from storage.local
        let storageData = await browser.storage.local.get('formats');

        // If 'formats' object doesn't exist yet or is empty, initialize it with default values
        if (!storageData.formats || Object.keys(storageData.formats).length === 0) {
            storageData.formats = formatsDefault;
            await browser.storage.local.set({ 'formats': storageData.formats });
        }
        return storageData.formats;
    } catch (error) {
        console.error(`Error when init formats:`, error);
    }
}

function setupAnalyseToggle(format) {
    document.getElementById('mtgtop8-'+format).addEventListener("change", async (event) => {
        let storageData = await browser.storage.local.get('formats');
        storageData.formats[format].mtgtop8 = event.target.checked;
        await browser.storage.local.set({ 'formats': storageData.formats });
    });
}

function setupHideToggle(format) {
    document.getElementById('hide-'+format).addEventListener("change", async (event) => {
        let storageData = await browser.storage.local.get('formats');
        storageData.formats[format].hideIfNotLegalIn = event.target.checked;
        await browser.storage.local.set({ 'formats': storageData.formats });
    });
}

function setupControl(controlId, storageKey) {
    document.getElementById(controlId).addEventListener("change", async (event) => {
        const value = event.target.value;
        await browser.storage.local.set({ storageKey: value });
    });
}

function setupThumbnailSize() {
    const thumbnailSwitch = document.getElementById("thumbnail-switch");
    const slider = document.getElementById("thumbnail-range");
    const output = document.getElementById("output");
    browser.storage.local.get('thumbnail').then(storageData => {
        const value = storageData.thumbnail;
        if(value) {
            output.innerText = value;
            slider.value = value;
            thumbnailSwitch.checked = true;
        } else {
            thumbnailSwitch.checked = false;
        }
    });

    slider.oninput = async function() {
        output.innerText = this.value;
        thumbnailSwitch.checked = true;
        await browser.storage.local.set({ 'thumbnail': this.value });
    }
    thumbnailSwitch.onchange = async function(event) {
        const checked = event.target.checked;
        await browser.storage.local.set({ 'thumbnail': checked ? slider.value : 0 });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    initFormats().then(formats => {
        for(const [format, value] of Object.entries(formats)) {
            document.getElementById('mtgtop8-'+format).checked = value.mtgtop8;
            document.getElementById('hide-'+format).checked = value.hideIfNotLegalIn;
        }
    });

    for(var format in formatsDefault) {
        setupAnalyseToggle(format);
        setupHideToggle(format);
    }

    setupThumbnailSize();
});
