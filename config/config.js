async function initStorage(storageKey, defaultValue) {
    try {
        let storageData = await browser.storage.sync.get(storageKey);

        // if key doesn't hold data yet
        if(!storageData[storageKey] ||  Object.keys(storageData[storageKey]).length === 0) {
            storageData[storageKey] = defaultValue;
            await browser.storage.sync.set({ storageKey: storageData[storageKey] });
        }
        return storageData[storageKey];
    } catch (error) {
        console.error(`Error when init control ${storageKey}:`, error);
    }
}

async function initFormats() {
    try {
        // Retrieve the 'formats' object from storage.local
        let storageData = await browser.storage.sync.get('formats');

        // If 'formats' object doesn't exist yet or is empty, initialize it with default values
        if (!storageData.formats || Object.keys(storageData.formats).length === 0) {
            storageData.formats = formatsDefault;
            // await browser.storage.sync.set({ 'formats': storageData.formats });
        }
        return storageData.formats;
    } catch (error) {
        console.error(`Error when init formats:`, error);
    }
}

function setupAnalyseToggle(format) {
    document.getElementById('mtgtop8-'+format).addEventListener("change", async (event) => {
        let storageData = await browser.storage.sync.get('formats');
        storageData.formats[format].mtgtop8 = event.target.checked;
        await browser.storage.sync.set({ 'formats': storageData.formats });
    });
}

function setupHideToggle(format) {
    document.getElementById('hide-'+format).addEventListener("change", async (event) => {
        let storageData = await browser.storage.sync.get('formats');
        storageData.formats[format].hideIfNotLegalIn = event.target.checked;
        await browser.storage.sync.set({ 'formats': storageData.formats });
    });
}

function setupControl(controlId, storageKey) {
    document.getElementById(controlId).addEventListener("change", async (event) => {
        const value = event.target.value;
        await browser.storage.sync.set({ storageKey: value });
    });
}

function setupThumbnailSize() {
    const thumbnailSwitch = document.getElementById("thumbnail-switch");
    const slider = document.getElementById("thumbnail-range");
    const output = document.getElementById("output");

    function syncThumbnailUi(isEnabled) {
        slider.disabled = !isEnabled;
        output.textContent = slider.value;
    }

    browser.storage.sync.get('thumbnail').then(storageData => {
        const storedValue = Number(storageData.thumbnail);
        const hasCustomValue = Number.isFinite(storedValue) && storedValue > 0;

        if (hasCustomValue) {
            slider.value = String(storedValue);
        }

        thumbnailSwitch.checked = hasCustomValue;
        syncThumbnailUi(hasCustomValue);
    });

    slider.oninput = async function() {
        output.textContent = this.value;
        await browser.storage.sync.set({ 'thumbnail': this.value });
    }

    thumbnailSwitch.onchange = async function(event) {
        const checked = event.target.checked;
        syncThumbnailUi(checked);
        await browser.storage.sync.set({ 'thumbnail': checked ? slider.value : 0 });
    }
}

const PRICE_AUTOFILL_DEFAULTS = {
    minRivalSales: 300,
    minRivalAvailableItems: 250,
    priceSource: 'lowestRival',
    undercutMode: 'fixed',
    undercutValue: 0.01,
    minimumPrice: 0.05,
    includeCalculatedRivals: true,
    includePowersellers: true,
    includeProfessional: false
};

function setupPriceAutofill() {
    const numericFields = [
        'minRivalSales',
        'minRivalAvailableItems',
        'undercutValue',
        'minimumPrice'
    ];
    const selectFields = ['priceSource', 'undercutMode'];
    const checkboxFields = ['includeCalculatedRivals', 'includePowersellers', 'includeProfessional'];
    const allFields = [...numericFields, ...selectFields, ...checkboxFields];

    browser.storage.sync.get('priceAutofill').then(result => {
        const stored = result.priceAutofill || {};
        for (const key of allFields) {
            const el = document.getElementById(`pa-${key}`);
            if (!el) continue;
            
            if (checkboxFields.includes(key)) {
                el.checked = stored[key] ?? PRICE_AUTOFILL_DEFAULTS[key];
            } else {
                el.value = stored[key] ?? PRICE_AUTOFILL_DEFAULTS[key];
            }
        }
    });

    for (const key of allFields) {
        const el = document.getElementById(`pa-${key}`);
        if (!el) continue;
        
        el.addEventListener('change', async () => {
            const result = await browser.storage.sync.get('priceAutofill');
            const current = result.priceAutofill || {};
            const value = checkboxFields.includes(key)
                ? el.checked
                : selectFields.includes(key)
                    ? el.value
                    : Number(el.value);
            const updated = { ...PRICE_AUTOFILL_DEFAULTS, ...current, [key]: value };
            await browser.storage.sync.set({ priceAutofill: updated });
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setupThumbnailSize();
    setupPriceAutofill();
});
