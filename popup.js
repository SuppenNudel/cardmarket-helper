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
        console.error('Error:', error);
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
});
