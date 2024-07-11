// - map cardmarket to manabox for ownership check
// - check how to rotate the thumbnail
/*
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
*/

const rot90Layout = ["split"];
const rot270Layout = ["art_series"];
const notRotKeywords = ["Aftermath"];

function rotateCard(theImage, scryfallCard) {
    const containsAny = scryfallCard.keywords.some(item => notRotKeywords.includes(item));
    if(!containsAny) {
        if (rot90Layout.includes(scryfallCard.layout)) {
            theImage.style = "transform: rotate(90deg);";
        } else if (rot270Layout.includes(scryfallCard.layout)) {
            theImage.style = "transform: rotate(270deg);";
        }
    }
}

async function getScryfallCardFromImage(theImage) {
    const mkmId = theImage.getAttribute("mkmId");
    if (!mkmId) {
        return null;
    }
    const scryfallCard = await cardByMkmId(mkmId);
    //rotateCard(theImage, scryfallCard);
    if(scryfallCard.id) {
        return scryfallCard;
    }
}

// to get legality
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
    if(cardmarketUrl.includes('Search')) {
        if(manaBoxCard['Set code'] == "GN3") {
            url = new URL(`https://www.cardmarket.com/en/Magic/Products/Singles/Game-Night-2022/${manaBoxCard['Name'].replace(' ','-')}`)
        } else {
            return null;
        }
    }
    
    var currentURL = new URL(window.location.href);
    currentURL.searchParams.forEach(function(value, key) {
        url.searchParams.append(key, value);
    });
    
    url.searchParams.set('isFoil', manaBoxCard.Foil == "foil" ? 'Y' : 'N');

    return url.toString();
}

var scryfall_data;

async function loadCustomScryfallData() {
    const result = await browser.storage.local.get('scryfall');
    scryfall_data = result.scryfall;
    return scryfall_data;
}

(async function main() {
    scryfall_data = await loadCustomScryfallData();
})();
