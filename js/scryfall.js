// - map cardmarket to manabox for ownership check
// - check how to rotate the thumbnail
async function cardByMkmId(mkmId) {
    const cardObject = await backgroundFetch(
        `https://api.scryfall.com/cards/cardmarket/${mkmId}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5',
                'Accept': '*/*'
            }
        }
    );
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

    try {
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

            const result = await backgroundFetch(url, {
                method: "POST",
                headers: headers,
                body: body
            });
            return result;
        };

        // Fetch all batches and combine the results
        const allResults = [];
        for (const batch of batches) {
            const result = await fetchBatch(batch);
            allResults.push(...result.data); // `data` contains the fetched card information
        }

        return allResults;
    } catch (error) {
        console.error("Error fetching Scryfall card collection:", error);
        return null;
    }
}


async function scryfallRequest(path) {
    const json = await backgroundFetch(`https://api.scryfall.com${path}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5',
                'Accept': '*/*'
            }
        }
    );
    return json; // aka scryfallCard
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
        if (manaBoxCard['Set code'] == "GN3") {
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

    url.searchParams.set('language', LANG_MAP[manaBoxCard['Language']]);
    url.searchParams.set('minCondition', CONDITION_MAP_ID[manaBoxCard['Condition']]);
    url.searchParams.set('isFoil', manaBoxCard.Foil == "normal" ? 'N' : 'Y');

    return url.toString();
}

console.log("scryfall.js");
