// MTG Top8 data fetching - uses background script for centralized caching

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchFormatCardData(format) {
    const formatName = format.name;
    
    try {
        const response = await browser.runtime.sendMessage({
            action: 'getMtgtop8Data',
            formatName: formatName
        });
        
        if (!response) {
            throw new Error('No response from background script');
        }
        
        if (response.success) {
            return response.data;
        } else {
            throw new Error(response.error || 'Unknown error from background script');
        }
    } catch (error) {
        console.error(`Failed to fetch ${formatName} card data:`, error);
        return null;
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

async function fetchFilteredMtgtop8Data(format, card_names) {
    const formatData = await fetchFormatCardData(format);
    
    if (!formatData || formatData === null) {
        console.warn(`No format data available for ${format.name}`);
        return null;
    }
    
    const result = {};
    card_names.forEach(name => {
        if (formatData[name]) {
            if (!result[name]) {
                result[name] = {};
            }
            result[name][true] = { 
                decks: formatData[name]['mainboard']['decks'], 
                avg: formatData[name]['mainboard']['avg'] 
            };
            result[name][false] = { 
                decks: formatData[name]['sideboard']['decks'], 
                avg: formatData[name]['sideboard']['avg'] 
            };
        }
    });
    return result;
}

function parseDecksCount(text) {
    const match = text.match(/(\d+)\s+decks/);
    return match ? parseInt(match[1], 10) : null;
}
