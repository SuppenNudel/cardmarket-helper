
// Fetch Pioneer card data from the provided URL
async function fetchFormatCardData(format) {
    const formatName = format.name;
    const url = `https://raw.githubusercontent.com/SuppenNudel/mtgtop8-topcards/refs/heads/main/${formatName}.json`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        // Return the Format card data
        return data;
    } catch (error) {
        // console.error(`Failed to fetch ${format} card data:`, error);
        return {};
    }
}


function getFormats() {
    const formats = [
        { name: "Standard", scryfallkey: "standard" },
        { name: "Pioneer", scryfallkey: "pioneer"},
        { name: "Modern", scryfallkey: "modern" },
        { name: "Legacy", scryfallkey: "legacy" },
        { name: "Pauper", scryfallkey: "pauper" }
    ];
    return formats;
}


// Filter Pioneer card data for specific card names
async function fetchFilteredMtgtop8Data(format, card_names) {
    const formatData = await fetchFormatCardData(format);
    const result = {};
    card_names.forEach(name => {
        if (formatData[name]) {
            // Ensure cardName exists in resultMap
            if (!result[name]) {
                result[name] = {};
            }
            result[name][true] = { decks: formatData[name]['mainboard']['decks'], avg: formatData[name]['mainboard']['avg'] };
            result[name][false] = { decks: formatData[name]['sideboard']['decks'], avg: formatData[name]['sideboard']['avg'] };
        }
    });
    return result;
}


// Utility: parse decks count from text (not used in new data format)
function parseDecksCount(text) {
    const match = text.match(/(\d+)\s+decks/);
    return match ? parseInt(match[1], 10) : null;
}
