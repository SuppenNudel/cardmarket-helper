async function cardByMkmId(mkmId) {
    if(!scryfall_data) {
        scryfall_data = await loadCustomScryfallData();
    }
    var response;
    if (mkmId in scryfall_data['scryfallids']) {
        const scryfallId = scryfall_data['scryfallids'][mkmId]
        response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    } else {
        response = await fetch(`https://api.scryfall.com/cards/cardmarket/${mkmId}`);
    }
    const cardObject = await response.json();
    if (mkmId in scryfall_data['scryfallids'] && cardObject.object == "card" && cardObject.cardmarket_id) {
        console.log(`Unnecessary id in scryfall_data:`, mkmId);
    }
    return cardObject;
}

async function cardById(scryfallId) {
    return scryfallRequest(`https://api.scryfall.com/cards/${scryfallId}`);
}

async function scryfallRequest(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok', response);
        }
        const scryfallCard = await response.json();
        return scryfallCard;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Re-throw the error for handling at the caller's level
    }
}

async function generateCardmarketUrl(manaBoxCard) {
    var purchase_uri = scryfall_data['purchase_uris'][manaBoxCard['Scryfall ID']]
    if(purchase_uri) {
        return purchase_uri;
    }
    var scryfallCard = await cardById(manaBoxCard['Scryfall ID']);
    
    if(['7ED'].includes(manaBoxCard['Set code'])) {
        // is:${manaBoxCard['Foil'] == 'normal' ? 'non-foil' : manaBoxCard['Foil']}
        const card = await scryfallRequest(`https://api.scryfall.com/cards/search?q=s:${manaBoxCard['Set code']} cn:${manaBoxCard['Collector number'].replace('★', '')} is:non-foil`);
        scryfallCard = card['data'][0];
    }

    const cardmarketUrl = scryfallCard['purchase_uris']['cardmarket'];
    var url = new URL(cardmarketUrl);
    
    var currentURL = new URL(window.location.href);
    currentURL.searchParams.forEach(function(value, key) {
        url.searchParams.append(key, value);
    });
    
    url.searchParams.set('isFoil', manaBoxCard.Foil == "foil" ? 'Y' : 'N');
    console.log(cardmarketUrl);

    if(cardmarketUrl.includes('Search')) {
        return null;
    }
    return url.toString();
}

var scryfall_data;

async function loadCustomScryfallData() {
    const result = await browser.storage.local.get('scryfall');
    scryfall_data = result.scryfall;
    return scryfall_data;
}

(async function main() {
    console.log("loading scryfall.js");
    scryfall_data = await loadCustomScryfallData();
})();
