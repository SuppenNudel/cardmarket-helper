function mapDataToName(dataArray) {
    console.log("background - mapDataToName(dataArray)");
    const groupedData = {};

    dataArray.forEach(data => {
        if ('Name' in data) {
            const name = data.Name;

            // If the name doesn't exist in the groupedData, create an array
            if (!groupedData[name]) {
                groupedData[name] = [];
            }

            // Push the current data into the array under the name key
            groupedData[name].push(data);
        } else {
            console.error("Invalid data format. Expected 'Name' property.");
        }
    });

    return groupedData;
}

async function loadCustomScryfallData() {
    console.log("background.js - loadCustomScryfallData");
    const customScryfall = await (await fetch(browser.runtime.getURL('scryfall_data.json'))).json();
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



