async function waitFor(searchElement, selector, attribute, interval = 100, timeout = 5000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            const element = searchElement.querySelector(selector);
            if (element && element.hasAttribute(attribute)) {
                clearInterval(timer); // Stop polling
                resolve(element); // Resolve the promise with the found element
            }

            // Stop after a certain timeout
            if (Date.now() - startTime > timeout) {
                clearInterval(timer);
                reject(new Error(`Attribute "${attribute}" not found on element "${selector}" within ${timeout}ms`));
            }
        }, interval);
    });
}

function updateContentOfMagicCard(articleRow, pricePromise, collectionPromise, formatsPromise, ofXDecksPromise) {
    mkmIdPromise = waitFor(articleRow, "div.col-thumbnail img", "mkmId")
        .then(image => image.getAttribute("mkmId"));

    Promise.all([mkmIdPromise, pricePromise]).then(([mkmId, prices]) => {
        const [pricedata, productdata] = prices;

        const mkmProduct = productdata.products[mkmId];
        const cardname = mkmProduct.name;
        const cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
        cardNameElement.style.display = "-webkit-box"; // enables line break

        scryfallSearch(cardname).then(result => result.data)
            .then(scryfallCards => {
                formatsPromise.then(formats => {
                    var legalInAtLeastOne = false;
                    var anySelected = true;
                    for (var format in formats) {
                        if (formats[format].hideIfNotLegalIn) {
                            anySelected = false;
                            if (scryfallCards[0].legalities[format] == 'legal') {
                                legalInAtLeastOne = true;
                                break;
                            }
                        }
                    }

                    if (anySelected || legalInAtLeastOne) {
                        collectionPromise.then(collection => {
                            checkOwnership(collection, cardname, mkmId, scryfallCards, formats, ofXDecksPromise)
                                .then(elements => {
                                    cardNameElement.append(document.createElement("br"));
                                    cardNameElement.append(elements);
                                });
                        })
                    } else {
                        articleRow.style = "display: none";
                    }
                });
            })
            .catch(error => {
                cardNameElement.append(document.createElement("br"));
                const errorElement = document.createElement("div")
                errorElement.style = "display: inline-block";
                cardNameElement.append(errorElement);
                if (error.status == 404) {
                    errorElement.innerText = `'${cardname}' not found on scryfall`;
                } else {
                    errorElement.innerText = error.details;
                }
                console.error(cardname, error);
            });
    });
}



function updateMagicContent(pricePromise, collectionPromise, formatsPromise) {
    const table = document.getElementById("UserOffersTable"); // div
    const articleRows = table.getElementsByClassName("article-row");

    ofXDecksPromise = formatsPromise.then(async formats => {
        ofXDecks = {}
        for (const format in formats) {
            formatKey = formatsMapping[format].mtgtop8key;
            deckCount = await getOfXDecks(formatKey);
            ofXDecks[formatKey] = deckCount;
        }
        return ofXDecks;
    });


    for (const articleRow of articleRows) {
        try {
            updateContentOfMagicCard(articleRow, pricePromise, collectionPromise, formatsPromise, ofXDecksPromise);
        } catch (error) {
            console.error(error, articleRow);
        }
    }
}

async function getOfXDecks(formatKey) {
    const url = `https://mtgtop8.com/search?format=${formatKey}&compet_check[P]=1&compet_check[M]=1&compet_check[C]=1&date_start=${getDateSixMonthsAgo()}`;
    let decks_matching;
    if (url in mtgtop8_cache) {
        decks_matching = mtgtop8_cache[url];
    } else {
        const response = await fetch(url);
        const html = await response.text();
        if (html.includes('No match for ')) {
            throw 'No match for ' + cardname;
        }
        if (html.includes('Too many cards for ')) {
            throw 'Too many cards for ' + cardname;
        }
        decks_matching = parseDecksMatching(html);
        mtgtop8_cache[url] = decks_matching;
    }
    return decks_matching;
}

async function checkOwnership(collection, cardname, mkmId, scryfallCards, formats, ofXDecksPromise) {
    const element = document.createElement('div')
    element.style = "display: inline-block";
    element.style.fontSize = "12px";

    const singleCard = scryfallCards[0];

    const commander = document.createElement('div');
    commander.innerText = `EDHREC Rank: `;
    element.appendChild(commander);
    if (singleCard.legalities.commander == 'legal') {
        commander.innerText += ' ' + singleCard.edhrec_rank;
    } else {
        commander.innerText += singleCard.legalities.commander;
    }

    for (var format in formats) {
        const mtgtop8 = formats[format].mtgtop8;
        if (mtgtop8) {
            element.appendChild(formatStaple(singleCard, format, ofXDecksPromise));
        }
    }

    var str = '';
    if (collection) {
        const collectionCards = scryfallCards
            .map(scryfallCard => {
                const collectionCard = collection[scryfallCard.id];
                if (collectionCard) {
                    collectionCard.cardmarket_id = scryfallCard.cardmarket_id;
                }
                return collectionCard;
            })
            .filter(item => item)
            .flat()
            .filter(card => card['Binder Type'] != 'list');
        if (collectionCards.length == 0) {
            str += 'unowned';
        } else {
            let sum = {
                'de': 0,
                'en': 0
            }

            let sumPrinting = {
                'de': 0,
                'en': 0
            }

            for (let collCard of collectionCards) {
                sum[collCard.Language] += parseInt(collCard.Quantity);
                if (collCard.cardmarket_id == mkmId) {
                    sumPrinting[collCard.Language] += parseInt(collCard.Quantity);
                }
            }
            str += `${sum.en + sum.de} (en: ${sum.en}, de: ${sum.de})`
                + ` // printing: ${sumPrinting.en + sumPrinting.de} (en: ${sumPrinting.en}, de: ${sumPrinting.de})`;
        }
    } else {
        str += '<collection not loaded>';
    }
    // return str;
    txt = document.createElement('div');
    txt.innerText = str;
    element.appendChild(document.createElement('br'));
    element.appendChild(txt);
    return element;
}

// Function to parse HTML and extract data
function parseDecksMatching(html) {
    // Use DOMParser to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const wTitle = doc.querySelector('div.w_title');
    if (wTitle) {
        const titleText = wTitle.textContent.trim();

        // Use regular expression to extract the number from the text
        const matches = titleText.match(/\d+/);
        if (matches) {
            const numberOfDecks = parseInt(matches[0]);
            return numberOfDecks;
        }
    }
    return null;
}

mtgtop8_cache = {};

async function mtgtop8(cardObject, formatKey, mainboard, sideboard) {
    var cardname;
    cardname = cardObject.name;
    if (cardObject.card_faces && cardObject.layout != 'split') {
        cardname = cardObject.card_faces[0].name;
    }
    const url = `https://mtgtop8.com/search?cards=${cardname}&format=${formatKey}&compet_check[P]=1&compet_check[M]=1&compet_check[C]=1&MD_check=${mainboard}&SB_check=${sideboard}&date_start=${getDateSixMonthsAgo()}`;
    if (url in mtgtop8_cache) {
        var decks_matching = mtgtop8_cache[url];
    } else {
        const response = await fetch(url);
        const html = await response.text();
        if (html.includes('No match for ')) {
            return 'No match for ' + cardname;
        }
        if (html.includes('Too many cards for ')) {
            return 'Too many cards for ' + cardname;
        }
        var decks_matching = parseDecksMatching(html);
        mtgtop8_cache[url] = decks_matching;
    }
    return decks_matching;
}

function getDateSixMonthsAgo() {
    const today = new Date();
    // Set the date to 6 months in the past
    today.setMonth(today.getMonth() - 6);

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = today.getFullYear();

    return `${day}/${month}/${year}`;
}

function formatStaple(cardObject, format, ofXDecksPromise) {
    const formatName = formatsMapping[format].display
    const formatKey = formatsMapping[format].mtgtop8key

    const formatElement = document.createElement('div');
    formatElement.style = "display: flex";
    formatElement.innerText = `${formatName}:`;
    formatElement.innerHTML += '&nbsp;';

    const legality = cardObject.legalities[formatName.toLowerCase()];
    if (legality == 'legal') {
        const formatDecksCountElement = document.createElement('div');
        const main = document.createElement('div');
        const divider = document.createElement('div');
        divider.innerHTML = "&nbsp;/&nbsp;";
        const side = document.createElement('div');
        
        formatElement.appendChild(main);
        formatElement.appendChild(divider);
        formatElement.appendChild(side);
        formatElement.appendChild(formatDecksCountElement);


        ofXDecksPromise.then(ofXDecks => {
            formatDecksCountElement.innerHTML = `&nbsp;- ${ofXDecks[formatKey]}`;
        });

        mtgtop8(cardObject, formatKey, 1, 0).then(decks_matching => {
            main.innerText = decks_matching;
        });
        mtgtop8(cardObject, formatKey, 0, 1).then(decks_matching => {
            side.innerText = decks_matching;
        });
    } else {
        switch (legality) {
            case 'not_legal':
                formatElement.innerText += '🛑 not legal';
                break;
            case 'banned':
                formatElement.innerText += '🚫 banned';
                break;
            case 'legal':
                formatElement.innerText += '✅ legal';
                break;
            default:
                formatElement.innerText += legality;
        }
    }
    return formatElement;
}

const formatsMapping = {
    'standard': {
        'display': 'Standard',
        'mtgtop8key': 'ST'
    },
    'alchemy': {
        'display': 'Alchemy',
        'mtgtop8key': 'ALCH'
    },
    'explorer': {
        'display': 'Explorer',
        'mtgtop8key': 'EXP'
    },
    'historic': {
        'display': 'Historic',
        'mtgtop8key': 'HI'
    },
    'pioneer': {
        'display': 'Pioneer',
        'mtgtop8key': 'PI'
    },
    'modern': {
        'display': 'Modern',
        'mtgtop8key': 'MO'
    },
    'premodern': {
        'display': 'Premodern',
        'mtgtop8key': 'PREM'
    },
    'legacy': {
        'display': 'Legacy',
        'mtgtop8key': 'LE'
    },
    'vintage': {
        'display': 'Vintage',
        'mtgtop8key': 'VI'
    },
    'cEDH': {
        'display': 'cEDH',
        'mtgtop8key': 'cEDH'
    },
    'duel': {
        'display': 'Duel Commander',
        'mtgtop8key': 'EDH'
    },
    'Block': {
        'display': 'Block',
        'mtgtop8key': 'BL'
    },
    'Extended': {
        'display': 'Extended',
        'mtgtop8key': 'EX'
    },
    'pauper': {
        'display': 'Pauper',
        'mtgtop8key': 'PAU'
    },
    'Peasant': {
        'display': 'Peasant',
        'mtgtop8key': 'PEA'
    },
    'Highlander': {
        'display': 'Highlander',
        'mtgtop8key': 'HIGH'
    },
    'Canadian Highlander': {
        'display': 'Canadian Highlander',
        'mtgtop8key': 'CHL'
    }
};

async function getCollection() {
    const localCache = await browser.storage.local.get(['collection']);
    return localCache.collection; // This directly returns the collection
}
async function getFormats() {
    const syncCache = await browser.storage.sync.get(['formats']);
    let formats;
    if (syncCache.formats) {
        formats = syncCache.formats;
    } else {
        formats = formatsDefault;
    }
    return formats;
}

(async function main() {
    console.log("offers-singles-magic.js");
    // const [pricedata, productdata] = await getCardmarketData();
    const pricePromise = getCardmarketData();
    const collectionPromise = getCollection();
    const formatsPromise = getFormats();

    updateMagicContent(pricePromise, collectionPromise, formatsPromise);
})();