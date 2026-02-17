
// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Fetch Pioneer card data from the provided URL with caching
async function fetchFormatCardData(format) {
    const formatName = format.name;
    const cacheKey = `mtgtop8_cache_${formatName}`;
    
    // Try to get cached data
    try {
        const cached = await browser.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            const { data, timestamp } = cached[cacheKey];
            const now = Date.now();
            // Check if cache is still valid
            if (now - timestamp < CACHE_DURATION) {
                console.debug(`Using cached data for ${formatName}`);
                return data;
            }
        }
    } catch (error) {
        console.error(`Error reading cache for ${formatName}:`, error);
    }
    
    // Fetch fresh data
    const url = `https://raw.githubusercontent.com/SuppenNudel/mtgtop8-topcards/refs/heads/main/${formatName}.json`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        
        // Cache the data
        try {
            await browser.storage.local.set({
                [cacheKey]: {
                    data: data,
                    timestamp: Date.now()
                }
            });
            console.debug(`Cached data for ${formatName}`);
        } catch (error) {
            console.error(`Error caching data for ${formatName}:`, error);
        }
        
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
