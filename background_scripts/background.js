async function loadCustomScryfallData() {
    console.log("background.js - loadCustomScryfallData");
    const customScryfall = await (await fetch(browser.runtime.getURL('data/scryfall_data.json'))).json();
    console.log(customScryfall);

    browser.storage.local.set({ scryfall: customScryfall })
        .then(() => {
            console.log('Data saved successfully');
        })
        .catch((error) => {
            console.error('Error saving data:', error);
        });
}

(async function main() {
    console.log("Loading background script");
    loadCustomScryfallData()
})();



