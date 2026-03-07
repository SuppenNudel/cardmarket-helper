// Scryfall API - uses background script for rate-limited requests

async function cardByMkmId(mkmId) {
    try {
        const cardObject = await browser.runtime.sendMessage({
            action: 'scryfallRequest',
            path: `/cards/cardmarket/${mkmId}`,
            options: {
                headers: {
                    'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5'
                }
            }
        });
        
        if (!cardObject) {
            throw new Error('No response from background script');
        }
        
        if (cardObject.success === false) {
            const errorMsg = cardObject.error || 'Unknown error';
            if (errorMsg.includes('404')) {
                return null;
            }
            throw new Error(errorMsg);
        }
        
        return cardObject.success ? cardObject.data : cardObject;
    } catch (error) {
        const message = String(error && error.message ? error.message : error);
        if (message.includes('404')) {
            return null;
        }
        throw error;
    }
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
    if (scryfallCard && scryfallCard.id) {
        return scryfallCard;
    }
}

async function cardById(scryfallId) {
    return scryfallRequest(`/cards/${scryfallId}`);
}

async function scryfallSearch(query) {
    return scryfallRequest(`/cards/search?unique=prints&q=!"${query}"`);
}

async function scryfallCardsCollection(cardNames) {
    const url = "https://api.scryfall.com/cards/collection";
    
    try {
        const cardNameArray = Array.from(cardNames);
        
        const batches = [];
        while (cardNameArray.length > 0) {
            batches.push(cardNameArray.splice(0, 75));
        }
        
        const fetchBatch = async (batch) => {
            const body = JSON.stringify({
                identifiers: batch.map(name => ({ name })),
            });

            const result = await browser.runtime.sendMessage({
                action: 'scryfallRequest',
                path: url,
                options: {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5'
                    },
                    body: body
                }
            });
            
            if (!result) {
                throw new Error('No response from background script');
            }
            
            if (result.success === false) {
                throw new Error(result.error || 'Unknown error');
            }
            
            return result.success ? result.data : result;
        };

        const allResults = [];
        for (const batch of batches) {
            const result = await fetchBatch(batch);
            allResults.push(...result.data);
        }

        return allResults;
    } catch (error) {
        console.error("Error fetching Scryfall card collection:", error);
        return null;
    }
}

async function scryfallRequest(path) {
    try {
        const result = await browser.runtime.sendMessage({
            action: 'scryfallRequest',
            path: path,
            options: {
                headers: {
                    'User-Agent': 'NudelForceFirefoxCardmarket/1.1.5'
                }
            }
        });
        
        if (!result) {
            throw new Error('No response from background script');
        }
        
        if (result.success === false) {
            throw new Error(result.error || 'Unknown error');
        }
        
        return result.success ? result.data : result;
    } catch (error) {
        console.error("Error in scryfallRequest:", error);
        throw error;
    }
}

async function generateCardmarketUrl(manaBoxCard) {
    const pageLang = (document.documentElement.lang || "en").split("-")[0];
    var scryfallCard = await cardById(manaBoxCard['Scryfall ID']);

    if (['7ED'].includes(manaBoxCard['Set code'])) {
        // is:${manaBoxCard['Foil'] == 'normal' ? 'non-foil' : manaBoxCard['Foil']}
        const card = await scryfallRequest(`/cards/search?q=s:${manaBoxCard['Set code']} cn:${manaBoxCard['Collector number'].replace('★', '')} is:non-foil`);
        scryfallCard = card['data'][0];
    }

    var cardmarketUrl = scryfallCard['purchase_uris']['cardmarket'];

    if (cardmarketUrl.includes('Search')) {
        if (manaBoxCard['Set code'] == "GN3") {
            cardmarketUrl = `https://www.cardmarket.com/${pageLang}/Magic/Products/Singles/Game-Night-2022/${manaBoxCard['Name'].replace(' ', '-')}`;
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
