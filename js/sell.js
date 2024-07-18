const FROM = {
    'en': "From",
    'de': 'ab'
}
const PRICE_TREND = {
    'en': "Price Trend",
    'de': "Preis-Trend"
}
const AVG_30 = {
    'en': "30-days average price",
    'de': "30-Tages-Durchschnitt"
}
const AVG_7 = {
    'en': "7-days average price",
    'de': "7-Tages-Durchschnitt"
}
const AVG_1 = {
    'en': "1-day average price",
    'de': "1-Tages-Durchschnitt"
}
const ITEMS = {
    'en': "Available items",
    'de': "Verfügbare Artikel"
}

const SELL_BUTTON_TEXT = {
    'en': "Put for sale",
    'de': "Zum Verkauf stellen"
}

const LANG_MAP = {
    "en": 1,
    "fr": 2,
    "de": 3,
    "sp": 4,
    "it": 5,
    "zh_CN": 6,
    "ja": 7,
    "pt": 8,
    "ru": 9,
    "ko": 10,
    "zh_TW": 11
}

const LANG_POS_MAP = {
    "en": "-16px -0px",
    "fr": "-48px -0px",
    "de": "-80px -0px",
    "sp": "-112px -0px",
    "it": "-144px -0px",
    "zh_CN": "-176px -0px",
    "ja": "-208px -0px",
    "pt": "-240px -0px",
    "ru": "-272px -0px",
    "ko": "-304px -0px",
    "zh_TW": "-336px -0px"
}

const CONDITION_MAP = {
    "mint": "MT",
    "near_mint": "NM",
    "excellent": "EX",
    "good": "GD",
    "light_played": "LP",
    "played": "PL",
    "poor": "PO"
}

function calculateMedian(numbers) {
    numbers.sort(function (a, b) {
        return a - b;
    });

    var length = numbers.length;
    var middle = Math.floor(length / 2);

    if (length % 2 === 0) {
        return numbers[middle];
        //return (numbers[middle - 1] + numbers[middle]) / 2;
    } else {
        return numbers[middle];
    }
}


function parseCurrencyStringToDouble(currencyString) {
    // Check if the value contains '\n(PPU: '
    if (currencyString.includes('\n(PPU: ')) {
        // Extract the PPU part
        const ppuPart = currencyString.split('\n(PPU: ')[1];
        // Remove the closing parenthesis and currency symbol, then convert to float
        return parseFloat(ppuPart.replace(' €)', '').replace(',', '.'));
    } else {
        // For the simpler format, remove the currency symbol and convert to float
        return parseFloat(currencyString.replace(' €', '').replace(',', '.'));
    }
}

function createPriceDictionary(keys, values) {
    var resultDictionary = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i].textContent.trim();
        var value = values[i].textContent.trim();
        if ([FROM[language], PRICE_TREND[language], AVG_1[language], AVG_7[language], AVG_30[language]].includes(key)) {
            value = parseCurrencyStringToDouble(value);
        }
        resultDictionary[key] = value;
    }
    return resultDictionary;
}

function calcMyPrice(mkmid) {
    let inclinePercentage = 0.15; // 15% relative incline threshold
    let maxQuantityThreshold = 10;  // Example threshold for high quantity

    // offers
    articleRows = document.getElementById("table").getElementsByClassName("article-row");
    var rivalSellers = [];
    for (var i = 0; i < articleRows.length && rivalSellers.length < 10; i++) {
        row = articleRows[i];
        sellerName = row.getElementsByClassName("seller-name")[0].innerText;
        if (sellerName == "NudelForce") {
            continue;
        }
        const priceContainer = row.getElementsByClassName("price-container")[0];
        const price = parseCurrencyStringToDouble(priceContainer.innerText);
        quantity = row.getElementsByClassName("col-offer")[0].getElementsByClassName("item-count")[0].innerText;

        rivalSellers.push({ quantity: quantity, price: price });
    }

    // Sort sellers by price in ascending order
    rivalSellers.sort((a, b) => a.price - b.price);

    let desiredPrice = rivalSellers[0].price - 0.01; // Start just below the lowest price

    for (let i = 0; i < rivalSellers.length - 1; i++) {
        let currentSeller = rivalSellers[i];
        let nextSeller = rivalSellers[i + 1];

        // Check for high quantity sellers and set price below theirs
        if (currentSeller.quantity > maxQuantityThreshold) {
            desiredPrice = currentSeller.price;
            break;
        }

        // Calculate relative incline
        let relativeIncline = (nextSeller.price - currentSeller.price) / currentSeller.price;
        if (relativeIncline >= inclinePercentage) {
            desiredPrice = nextSeller.price;
            break;
        }
    }
    const prices = pricedata.priceGuides[mkmid];
    var isFoil = url.searchParams.get('isFoil') == 'Y';
    const holoElement = false;
    const trend = prices[`trend${isFoil ? '-foil' : holoElement ? '-holo' : ''}`];

    desiredPrice = (desiredPrice - 0.01);
    if (desiredPrice < 0.05) {
        desiredPrice = 0.05;
    }
    if (trend > desiredPrice) {
        desiredPrice = trend;
    }
    return desiredPrice.toFixed(2);
}

function parseMkmIdFromImgSrc(imgSrc) {
    var matches = imgSrc.match(/\/(\w+)\/(\d+)\//);
    if (matches && matches.length === 3) {
        var setCode = matches[1]; // "LCC"
        var mkmId = matches[2]; // "744721"
        return mkmId;
    } else {
        throw new Error("No match found. Error parsing setCode and mkmId from image url: " + imgSrc);
    }
}

const HEADERS = ["Fill / Go to", "Quantity", "Set code", "Collector number", "Foil", "Binder Name", "Purchase price", "Misprint", "Altered", "Condition", "Language"];

// Get the current URL
var currentURL = window.location.href;
// Create a URL object
var url = new URL(currentURL);
// Get pathname from URL
var pathname = url.pathname;
// Split the pathname by '/'
var parts = pathname.split("/");
// Extract language from parts
var language = parts[1]; // Assuming "de" is at index 1

async function generateTable(cards) { // id of same printing
    const table = document.createElement('table');

    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginBottom = '20px';
    table.style.border = '1px solid black';
    table.classList.add('collectionTable');

    // Create thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    for (const header of HEADERS) {
        const th = document.createElement('th');
        th.textContent = header == "Misprint" ? "Listed" : header;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // const sortedArray = cards.sort((cardA, cardB) => (cardB['Scryfall ID'] === scryfallId) - (cardA['Scryfall ID'] === scryfallId));

    // Get the value of the 'isFoil' parameter
    var isFoilParam = url.searchParams.get('isFoil') == 'Y';

    // Create tbody
    const tbody = document.createElement('tbody');
    for (const card of cards) {
        if (card["Binder Type"] == "list") {
            continue;
        }
        const row = document.createElement('tr');
        row.value = card;
        // if(card['Condition'] != 'mint') {
        row.addEventListener("click", function () {
            row.style.cursor = 'pointer';
            fillMetrics(card);
        });
        // }

        // if (card['Scryfall ID'] == scryfallId && isFoilParam == (card.Foil == "foil")) {
        //     row.style.backgroundColor = 'lightgreen';
        // }
        for (const key of HEADERS) {
            const td = document.createElement('td');
            row.appendChild(td);
            if (key == "Fill / Go to") {
                if (card['Scryfall ID'] == "NOT USING SCRYFALL ID") {
                    if (isFoilParam == (card.Foil == "foil")) {
                        // Create a new button element
                        var button = document.createElement("button");
                        // Set button attributes and content
                        button.style.width = "70px";
                        button.style.height = "25px";
                        button.style.setProperty('--bs-btn-padding-x', 'initial');
                        button.innerHTML = "Fill";
                        if (!document.querySelector(`[title="${SELL_BUTTON_TEXT[language]}"]`)) {
                            button.disabled = true;
                        } else {
                            button.addEventListener("click", function () {
                                fillMetrics(card);
                            });
                        }
                        button.setAttribute("id", "myButton");
                        button.setAttribute("class", "btn btn-outline-primary");
                        td.appendChild(button);
                    } else {
                        const currentURL = new URL(window.location.href);
                        currentURL.searchParams.set('isFoil', card.Foil == "foil" ? 'Y' : 'N');
                        const link = document.createElement("a");
                        link.innerText = "Go To";
                        link.setAttribute("href", currentURL);
                        td.appendChild(link);
                    }
                } else {
                    const newURL = await generateCardmarketUrl(card);
                    if (newURL) {
                        link = document.createElement("a");
                        link.innerText = "Go To";
                        // Get the current URL
                        // Create a URL object
                        link.setAttribute("href", newURL);
                    } else {
                        link = document.createElement("div");
                        link.innerText = "undefined";
                    }
                    td.appendChild(link);
                }
                continue;
            }

            const value = card[key];
            row.appendChild(td);
            var element = undefined;
            if (key == "Language") {
                element = document.createElement('span');
                element.style.display = "inline-block";
                element.style.width = "16px";
                element.style.height = "16px";
                element.style.backgroundImage = "url('//static.cardmarket.com/img/949ba8e63eca06832acdfff64020fea8/spriteSheets/ssMain2.png')";
                element.style.backgroundPosition = LANG_POS_MAP[value];
            } else if (key == "Condition") {
                if (value == "mint") {
                    td.textContent = "❓";
                } else {
                    element = document.createElement('span');
                    element.classList.add("article-condition");
                    element.classList.add(`condition-${CONDITION_MAP[value].toLowerCase()}`);
                    const childSpan = document.createElement('span');
                    childSpan.classList.add("badge");
                    childSpan.textContent = CONDITION_MAP[value];
                    element.appendChild(childSpan);
                }
            } else {
                // only text change
                td.textContent = value;
                if (key == "Foil") {
                    switch (value) {
                        case "foil":
                            td.textContent = "⭐";
                            break;
                        case "normal":
                            td.textContent = "❌";
                            break;
                        case "etched":
                            td.textContent = "🌟";
                            break;
                        default:
                            throw new Error("Foil value is not valid: " + value);
                    }
                }
                if (key == "Misprint") {
                    if (value == "true") {
                        td.textContent = "🗒️";
                    } else {
                        td.textContent = "❌";
                    }
                }
                if (key == "Binder Name") {
                    const binderType = card["Binder Type"];
                    if (binderType == "deck") {
                        td.textContent = "DECK - " + td.textContent;
                    }
                }
                if (key == "Purchase price") {
                    td.textContent = parseFloat(td.textContent).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
                    if (myPrice > value) {
                        td.textContent += " 📈";
                    } else {
                        td.textContent += " 📉";
                    }
                }
            }
            if (element) {
                td.appendChild(element);
            }
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    return table;
}

function setValue(elementName, type, value) {
    input = document.querySelector(`input[name="${elementName}"]`);
    input[type] = value;
}

function fillMetrics(card) {
    var isFoil;
    if (card.Foil == "normal") { // foil
        isFoil = false;
    } else if (card.Foil == "foil" || card.Foil == "etched") {
        isFoil = true;
    } else {
        throw new Error("Foil value is not valid: " + card.Foil);
    }
    setValue("isFoil", "checked", isFoil);
    setValue("amount", "value", card.Quantity);

    document.getElementById("language").value = LANG_MAP[card.Language];
    document.getElementById("condition").value = CONDITION_MAP[card.Condition];

    var isAltered;
    if (card.Altered == "false") { // altered
        isAltered = false;
    } else if (card.Altered == "true") {
        isAltered = true;
    } else {
        throw new Error("Altered value is not valid: " + card.Altered);
    }
    setValue("isAltered", "checked", isAltered);
}

function collectionLoaded(collection) {
    var mkmId = document.querySelector('#FilterForm > input[name="idProduct"]').value; // parseMkmIdFromImgSrc(src);

    var div = document.createElement("div");
    var mainContent = document.getElementById("mainContent");
    mainContent.parentElement.insertBefore(div, mainContent);

    if (!collection) {
        const span = document.createElement('span');
        span.innerText = "Collection not loaded.";
        div.appendChild(span);
        return;
    }
    const mkmProduct = productdata.products[mkmId];
    const collectionCards = [];
    for (const sameIdCards of Object.values(collection)) {
        for (const collectionCard of sameIdCards) {
            if (mkmProduct.name == collectionCard.Name) {
                collectionCards.push(collectionCard);
            }
        }
    }
    if (collectionCards.length == 0) {
        span = document.createElement('span');
        span.innerText = "You don't own any printing of this card.";
        div.appendChild(span);
    } else {
        generateTable(collectionCards).then(table => {
            div.appendChild(table);
        });
    }
}

(async function main() {
    console.log("sell.js");
    [pricedata, productdata] = await getCardmarketData();

    const priceField = document.getElementById("price");
    if (priceField) {
        var mkmId = document.querySelector('#FilterForm > input[name="idProduct"]').value; // parseMkmIdFromImgSrc(src);
        myPrice = calcMyPrice(mkmId);
        priceField.value = myPrice;
    }

    // Retrieve data from local storage
    browser.storage.local.get(['collection'])
        .then((result) => {
            const collection = result.collection;
            collectionLoaded(collection);
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });
})();