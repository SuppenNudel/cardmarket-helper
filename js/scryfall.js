const mkmToScryfallIds = {
    '609877': '640be32d-dcc8-408a-b8a6-077472f1e70b'
}

const scryfallIdToUrls = {
    '640be32d-dcc8-408a-b8a6-077472f1e70b': 'https://www.cardmarket.com/en/Magic/Products/Singles/Secret-Lair-Extra-Life-2021/Craterhoof-Behemoth-V2'
}

// - map cardmarket to manabox for ownership check
// - check how to rotate the thumbnail
async function cardByMkmId(mkmId) {
    var response;
    if (mkmId in mkmToScryfallIds) {
        const scryfallId = mkmToScryfallIds[mkmId]
        response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5',
                    'Accept': '*/*'
                },
                mode: 'cors'
            }
        );
    } else {
        response = await fetch(`https://api.scryfall.com/cards/cardmarket/${mkmId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5',
                    'Accept': '*/*'
                },
                mode: 'cors'
            }
        );
    }
    const cardObject = await response.json();
    if (mkmId in mkmToScryfallIds && cardObject.object == "card" && cardObject.cardmarket_id) {
        console.log(`Unnecessary id in scryfall_data:`, mkmId);
    }
    return cardObject;
}

const rot90Layout = ["split"];
const rot270Layout = ["art_series"];
const notRotKeywords = ["Aftermath"];

function rotateCard(theImage, scryfallCard) {
    const containsAny = scryfallCard.keywords.some(item => notRotKeywords.includes(item));
    if (!containsAny) {
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
    if (scryfallCard.id) {
        return scryfallCard;
    }
}

// to get legality
async function cardById(scryfallId) {
    return scryfallRequest(`/cards/${scryfallId}`);
}

async function scryfallSearch(query) {
    return scryfallRequest(`/cards/search?unique=prints&q=!"${query}"`);
}

async function scryfallCardsCollection(cardNames) {
    const url = "https://api.scryfall.com/cards/collection";
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5',
        'Accept': '*/*',
            mode: 'cors'
    };

    // Convert the Set of card names into an array
    const cardNameArray = Array.from(cardNames);

    // Split the card names into batches of 75
    const batches = [];
    while (cardNameArray.length > 0) {
        batches.push(cardNameArray.splice(0, 75));
    }

    // Function to fetch a single batch of cards
    const fetchBatch = async (batch) => {
        const body = JSON.stringify({
            identifiers: batch.map(name => ({ name })),
        });

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("Error Details:", errorDetails);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        return response.json();
    };

    // Fetch all batches and combine the results
    const allResults = [];
    for (const batch of batches) {
        const result = await fetchBatch(batch);
        allResults.push(...result.data); // `data` contains the fetched card information
    }

    return allResults;
}


async function scryfallRequest(path) {
    const response = await fetch(`https://api.scryfall.com${path}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5',
                'Accept': '*/*'
            },
            mode: 'cors'
        }
    );
    const json = await response.json();
    if (response.ok) {
        return json; // aka scryfallCard
    } else {
        throw json;
    }
}

async function generateCardmarketUrl(manaBoxCard) {
    var scryfallCard = await cardById(manaBoxCard['Scryfall ID']);

    if (['7ED'].includes(manaBoxCard['Set code'])) {
        // is:${manaBoxCard['Foil'] == 'normal' ? 'non-foil' : manaBoxCard['Foil']}
        const card = await scryfallRequest(`/cards/search?q=s:${manaBoxCard['Set code']} cn:${manaBoxCard['Collector number'].replace('★', '')} is:non-foil`);
        scryfallCard = card['data'][0];
    }

    var cardmarketUrl = scryfallCard['purchase_uris']['cardmarket'];

    if (cardmarketUrl.includes('Search')) {
        if (scryfallIdToUrls[scryfallCard.id]) {
            cardmarketUrl = scryfallIdToUrls[scryfallCard.id];
        } else if (manaBoxCard['Set code'] == "GN3") {
            cardmarketUrl = `https://www.cardmarket.com/en/Magic/Products/Singles/Game-Night-2022/${manaBoxCard['Name'].replace(' ', '-')}`;
        } else {
            return null;
        }
    }
    var url = new URL(cardmarketUrl);

    var currentURL = new URL(window.location.href);
    currentURL.searchParams.forEach(function (value, key) {
        url.searchParams.append(key, value);
    });

    url.searchParams.set('isFoil', manaBoxCard.Foil == "foil" ? 'Y' : 'N');

    return url.toString();
}

console.log("scryfall.js");
