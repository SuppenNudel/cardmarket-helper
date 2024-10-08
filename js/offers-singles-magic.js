
function updateContentOfMagicCard(articleRow, collection) {
    const image = articleRow.querySelector("div.col-thumbnail img");
    const mkmId = image.getAttribute("mkmId");

    const mkmProduct = productdata.products[mkmId];
    const cardname = mkmProduct.name;
    const cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
    cardNameElement.style.display = "-webkit-box"; // enables line break

    scryfallRequest(`https://api.scryfall.com/cards/named?exact=${mkmProduct.name}`).then(scryfallCard => {
        if (scryfallCard == undefined) {
            cardNameElement.append(document.createElement("br"));
            const errorElement = document.createElement("div")
            errorElement.style = "display: inline-block";
            cardNameElement.append(errorElement);
            errorElement.innerText = `Card with name ${cardname} not found`;
        } else {
            var legalInAtLeastOne = false;
            var anySelected = true;
            for (var format in formats) {
                if (formats[format].hideIfNotLegalIn) {
                    anySelected = false;
                    if (scryfallCard.legalities[format] == 'legal') {
                        legalInAtLeastOne = true;
                        break;
                    }
                }
            }
            if (anySelected || legalInAtLeastOne) {
                checkOwnership(collection, scryfallCard)
                    .then(elements => {
                        cardNameElement.append(document.createElement("br"));
                        cardNameElement.append(elements);
                    });
            } else {
                articleRow.style = "display: none";
            }
        }
    });

}

function updateMagicContent(collection) {
    const table = document.getElementById("UserOffersTable"); // div
    const articleRows = table.getElementsByClassName("article-row");
    for (const articleRow of articleRows) {
        updateContentOfMagicCard(articleRow, collection);
    }
}

async function checkOwnership(collection, scryfallCard) {
    const element = document.createElement('div')
    element.style = "display: inline-block";
    element.style.fontSize = "12px";

    const commander = document.createElement('div');
    commander.innerText = `EDHREC Rank: `;
    element.appendChild(commander);
    if (scryfallCard.legalities.commander == 'legal') {
        commander.innerText += ' ' + scryfallCard.edhrec_rank;
    } else {
        commander.innerText += scryfallCard.legalities.commander;
    }

    for (var format in formats) {
        const url = `https://mtgtop8.com/search?format=${formatsMapping[format].mtgtop8key}&compet_check[P]=1&compet_check[M]=1&compet_check[C]=1&date_start=${getDateSixMonthsAgo()}`;
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
        const mtgtop8 = formats[format].mtgtop8;
        if (mtgtop8) {
            element.appendChild(formatStaple(scryfallCard, formatsMapping[format].display, formatsMapping[format].mtgtop8key, decks_matching));
        }
    }

    var str = '';
    if (collection) {
        const collectionCards = await scryfallRequest(scryfallCard.prints_search_uri).then(result => result.data).then(scryfallCards =>
            scryfallCards.map(scryfallCard => collection[scryfallCard.id])
        ).then(cards => cards.filter(item => item !== undefined).flat().filter(card => card['Binder Type'] != 'list'));
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
                if (collCard["Scryfall ID"] == scryfallCard.id) {
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

function getDateSixMonthsAgo() {
    const today = new Date();
    // Set the date to 6 months in the past
    today.setMonth(today.getMonth() - 6);

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = today.getFullYear();

    return `${day}/${month}/${year}`;
}

async function mtgtop8(cardObject, format, mainboard, sideboard) {
    var cardname;
    cardname = cardObject.name;
    if (cardObject.card_faces && cardObject.layout != 'split') {
        cardname = cardObject.card_faces[0].name;
    }

    const url = `https://mtgtop8.com/search?format=${format}&compet_check[P]=1&compet_check[M]=1&compet_check[C]=1&MD_check=${mainboard}&SB_check=${sideboard}&date_start=${getDateSixMonthsAgo()}&cards=${cardname}`;
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

function formatStaple(cardObject, formatName, mtgtop8Format, ofXDecks) {
    const formatElement = document.createElement('div');
    formatElement.style = "display: flex";
    formatElement.innerText = `${formatName}:`;
    formatElement.innerHTML += '&nbsp;';

    const legality = cardObject.legalities[formatName.toLowerCase()];
    if (legality == 'legal') {
        const main = document.createElement('div');
        formatElement.appendChild(main);
        const divider = document.createElement('div');
        formatElement.appendChild(divider);
        divider.innerHTML = "&nbsp;/&nbsp;";
        const side = document.createElement('div');
        formatElement.appendChild(side);
        
        const end = document.createElement('div');
        end.innerHTML = `&nbsp;(${ofXDecks})`;
        formatElement.appendChild(end);

        mtgtop8(cardObject, mtgtop8Format, 1, 0).then(decks_matching => {
            main.innerText = decks_matching;
        });
        mtgtop8(cardObject, mtgtop8Format, 0, 1).then(decks_matching => {
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

var formats = formatsDefault;


(async function main() {
    console.log("offers-singles-magic.js");
    const [pricedata, productdata] = await getCardmarketData();

    const localCache = await browser.storage.local.get(['collection']);
    // gets which formats should be analysed and shown
    const syncCache = await browser.storage.sync.get(['formats']);
    
    const collection = localCache.collection;
    if (syncCache.formats) {
        formats = syncCache.formats;
    }
    updateMagicContent(collection);
})();