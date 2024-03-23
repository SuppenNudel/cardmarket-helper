function parseCurrencyStringToDouble(currencyString) {
    // Remove non-numeric characters and the euro symbol
    var cleanedString = currencyString.replace(/[^\d,]/g, '');

    // Replace comma with a dot to make it a valid JavaScript number
    var numberString = cleanedString.replace(',', '.');

    // Parse the string to a floating-point number
    var result = parseFloat(numberString);

    return isNaN(result) ? null : result;
}

function getColorBasedOnPercentageRange(referencePrice, priceToCompare) {
    // Calculate the upper and lower bounds
    var upperBound = referencePrice * (1 + 10 / 100);
    var lowerBound = referencePrice * (1 - 10 / 100);

    // Check if priceToCompare is within the range
    if (priceToCompare < lowerBound) {
        return 'green'; // Price is lower
    } else if (priceToCompare <= upperBound) {
        return 'orange'; // Price is within bounds
    } else if (priceToCompare > upperBound) {
        return 'red'; // Price is higher
    } else {
        return 'blue';
    }
}

// Function to parse HTML and extract data
function parseHTML(html) {
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

async function mtgtop8(cardObject, format, mainboard, sideboard) {
    var cardname;
    cardname = cardObject.name;
    if(cardObject.card_faces && cardObject.layout != 'split') {
        cardname = cardObject.card_faces[0].name;
    }

    const url = `https://mtgtop8.com/search?format=${format}&compet_check[P]=1&compet_check[M]=1&compet_check[C]=1&MD_check=${mainboard}&SB_check=${sideboard}&date_start=18/09/2023&cards=${cardname}`;
    if(url in mtgtop8_cache) {
        var decks_matching = mtgtop8_cache[url];
    } else {
        const response = await fetch(url);
        const html = await response.text();
        if(html.includes('No match for ')) {
            return 'No match for '+cardname;
        }
        if(html.includes('Too many cards for ')) {
            return 'Too many cards for '+cardname;
        }
        var decks_matching = parseHTML(html);
        mtgtop8_cache[url] = decks_matching;
    }
    return decks_matching;
}

function formatStaple(cardObject, formatName, mtgtop8Format) {
    const formatElement = document.createElement('div');
    formatElement.style = "display: flex";
    formatElement.innerText = `${formatName}:`;
    formatElement.innerHTML += '&nbsp;';
    
    const legality = cardObject.legalities[formatName.toLowerCase()];
    if(legality == 'legal') {
        const main = document.createElement('div');
        formatElement.appendChild(main);
        const divider = document.createElement('div');
        formatElement.appendChild(divider);
        divider.innerHTML = "&nbsp;/&nbsp;";
        const side = document.createElement('div');
        formatElement.appendChild(side);

        mtgtop8(cardObject, mtgtop8Format, 1, 0).then(decks_matching => {
            main.innerText = decks_matching;
        });
        mtgtop8(cardObject, mtgtop8Format, 0, 1).then(decks_matching => {
            side.innerText = decks_matching;
        });
    } else {
        formatElement.innerText += legality;
    }
    return formatElement;
}

async function checkOwnership(collection, cardObject) {
    const element = document.createElement('div')
    element.style = "display: inline-block";

    const commander = document.createElement('div');
    commander.innerText = `EDHREC Rank: `;
    element.appendChild(commander);
    if(cardObject.legalities.commander == 'legal') {
        commander.innerText += ' ' + cardObject.edhrec_rank;
    } else {
        commander.innerText += cardObject.legalities.commander;
    }

    if(formats.standard.mtgtop8) {
        element.appendChild(formatStaple(cardObject, 'Standard', 'ST'));
    }
    if(formats.pioneer.mtgtop8) {
        element.appendChild(formatStaple(cardObject, 'Pioneer', 'PI'));
    }
    if(formats.modern.mtgtop8) {
        element.appendChild(formatStaple(cardObject, 'Modern', 'MO'));
    }
    if(formats.legacy.mtgtop8) {
        element.appendChild(formatStaple(cardObject, 'Legacy', 'LE'));
    }

    var str = '';
    if (collection) {
        let collCards = collection[cardObject.name];
        if (collCards) {
            let sum = {
                'de': 0,
                'en': 0
            }

            let sumPrinting = {
                'de': 0,
                'en': 0
            }

            for (let collCard of collCards) {
                sum[collCard.Language] += parseInt(collCard.Quantity);
                if (collCard["Scryfall ID"] == cardObject.id) {
                    sumPrinting[collCard.Language] += parseInt(collCard.Quantity);
                }
            }
            str += `${sum.en + sum.de} (en: ${sum.en}, de: ${sum.de})`
                + ` // printing: ${sumPrinting.en + sumPrinting.de} (en: ${sumPrinting.en}, de: ${sumPrinting.de})`;
        } else {
            str += 'unowned';
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

async function checkPrice(articleRow, cardObject) {
    const prices = cardObject.prices;

    var productAttributesElement = articleRow.querySelector('.product-attributes');
    var foilElement = productAttributesElement.querySelector('[aria-label="Foil"]');
    var isFoil = false;
    if (foilElement) {
        isFoil = true;
    }
    const price = parseFloat(prices[isFoil ? "eur_foil" : "eur"]);

    const oracleId = cardObject.oracle_id;
    const cheapestUrl = `https://api.scryfall.com/cards/search?dir=asc&order=eur${isFoil ? "_foil" : ""}&q=oracleid:${oracleId} has:${isFoil ? "foil" : "non-foil"}&unique=prints`;
    var response = await fetch(cheapestUrl);

    const printingsJson = await response.json();
    const printings = printingsJson.data;
    if (!printings) {
        throw new Error(`Failed to jsonize response for ${cardObject.name}.`);
    }
    var cheapest;
    for (const card of printings) {
        const cur = parseFloat(card.prices[isFoil ? "eur_foil" : "eur"]);
        if (cheapest) {
            if (!cur) {
                continue;
            }
            if (cur < cheapest) {
                cheapest = cur;
            }
        } else {
            cheapest = cur;
        }
    }

    var priceContainer = articleRow.getElementsByClassName("price-container")[0].getElementsByClassName("flex-column")[0];
    priceContainer.getElementsByClassName("align-items-center")[0].classList.remove("d-flex");
    offerElement = priceContainer.getElementsByTagName("span")[0];
    currStr = offerElement.innerText;
    offer = parseCurrencyStringToDouble(currStr);

    priceContainer.appendChild(document.createElement("br"));
    var div = document.createElement("div");
    priceContainer.appendChild(div);

    if (price) {
        div.innerText = "↔️ " + price.toFixed(2) + " ⬇️ " + cheapest.toFixed(2);
        offerElement.classList.remove("color-primary");
        
        if(priceContainer.getElementsByClassName('extra-small').length > 0) {
            offer = offer / 4;
        }
        color = getColorBasedOnPercentageRange(price, offer);
        offerElement.style.color = color;
    } else {
        div.innerText = "n/a";
    }
}

async function updateContentOfCard(articleRow, collection) {
    let cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
    cardNameElement.style.display = "-webkit-box"; // enables line break
    
    const element = articleRow.querySelector("span.thumbnail-icon");
    const image = showThumbnail(element);
    const cardObject = await getScryfallCardFromImage(image);
    const mkmId = parseInt(image.getAttribute("mkmId"));

    if (cardObject == undefined) {
        cardNameElement.append(document.createElement("br"));
        const errorElement = document.createElement("div")
        errorElement.style = "display: inline-block";
        cardNameElement.append(errorElement);
        errorElement.innerText = `cardmarket id ${mkmId} is not known on Scryfall`;
    } else {
        var legalInAtLeastOne = false;
        var anySelected = true;
        for(var format in formats) {
            if(formats[format].hideIfNotLegalIn) {
                anySelected = false;
                if(cardObject.legalities[format] == 'legal') {
                    legalInAtLeastOne = true;
                    break;
                }
            }
        }
        if(anySelected || legalInAtLeastOne) {
            checkOwnership(collection, cardObject)
            .then(elements => {
                cardNameElement.append(document.createElement("br"));
                cardNameElement.append(elements);
            });
            
            checkPrice(articleRow, cardObject);
        } else {
            articleRow.style = "display: none";
        }
    }
}

function updateContent(collection) {
    let table = document.getElementById("UserOffersTable"); // div
    let articleRows = table.getElementsByClassName("article-row");
    for (let articleRow of articleRows) {
        updateContentOfCard(articleRow, collection);
    }
}

var formats = formatsDefault;

console.log("offer-singles.js");
(async function main() {
    console.log("offer-singles.js");
    // Retrieve data from local storage
    browser.storage.local.get(['collection', 'formats'])
    .then((result) => {
        const collection = result.collection;
        console.log('Collection Data retreived');
        if(result.formats) {
            formats = result.formats;
        }
        console.log("formats", formats);
        updateContent(collection);
    })
    .catch((error) => {
        console.error('Error retrieving data:', error);
    });
})();