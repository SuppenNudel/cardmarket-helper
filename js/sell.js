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
    // Remove non-numeric characters and the euro symbol
    var cleanedString = currencyString.replace(/[^\d,]/g, '');

    // Replace comma with a dot to make it a valid JavaScript number
    var numberString = cleanedString.replace(',', '.');

    // Parse the string to a floating-point number
    var result = parseFloat(numberString);

    return isNaN(result) ? null : result;
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

function calcMyPrice() {
    // meta values
    infoListContainer = document.getElementById("tabContent-info").getElementsByClassName("info-list-container")[0];
    tableKeys = infoListContainer.getElementsByTagName("dt");
    tableValues = infoListContainer.getElementsByTagName("dd");
    map = createPriceDictionary(tableKeys, tableValues);

    // offers
    articleRows = document.getElementById("table").getElementsByClassName("article-row");
    var pricesList = [];
    for (var i = 0; i < articleRows.length && pricesList.length < 10; i++) {
        row = articleRows[i];
        sellerName = row.getElementsByClassName("seller-name")[0].innerText;
        if (sellerName == "NudelForce") {
            continue;
        }
        price = parseCurrencyStringToDouble(row.getElementsByClassName("price-container")[0].innerText);
        quantity = row.getElementsByClassName("col-offer")[0].getElementsByClassName("item-count")[0].innerText;

        for (var j = 0; j < quantity; j++) {
            pricesList.push(price);
        }
    }

    median = calculateMedian(pricesList) - 0.01;
    console.log(`Median: ${median}`);

    max = Math.max(map[FROM[language]], map[PRICE_TREND[language]], map[AVG_30[language]], map[AVG_7[language]], median); //, map[AVG_1]
    console.log(`Calculated max: ${max}`);
    rounded = Math.ceil(max * 100) / 100;
    console.log(`Rounded: ${rounded}`);
    return rounded;
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

function searchCollectionForScryfallId(collection, targetScryfallId) {
    const resultObjects = [];
    for (const key in collection) {
        const array = collection[key];
        for (const obj of array) {
            if (obj["Scryfall ID"] === targetScryfallId) {
                resultObjects.push(obj);
            }
        }
    }
    return resultObjects.length > 0 ? resultObjects : null;
}

function searchCollectionForName(collection, cardName) {
    const resultObjects = [];
    for (const key in collection) {
        const array = collection[key];
        for (const obj of array) {
            if (obj["Name"] === cardName) {
                resultObjects.push(obj);
            }
        }
    }
    return resultObjects.length > 0 ? resultObjects : null;
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
console.log(language); // Output: de


async function generateTable(cards, scryfallId) { // id of same printing
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

        // if (card['Scryfall ID'] == scryfallId && isFoilParam == (card.Foil == "foil")) {
        //     row.style.backgroundColor = 'lightgreen';
        // }
        for (const key of HEADERS) {
            const td = document.createElement('td');
            row.appendChild(td);
            if (key == "Fill / Go to") {
                if (card['Scryfall ID'] == scryfallId) {
                    if(isFoilParam == (card.Foil == "foil")) {
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
                            button.addEventListener("click", function() {
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
                    if(newURL) {
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
                    if (calcMyPrice() > value) {
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
    console.log(`set value of ${elementName} through ${type}: ${value}`);
    input = document.querySelector(`input[name="${elementName}"]`);
    input[type] = value;
}

function fillMetrics(card) {
    var isFoil;
    if (card.Foil == "normal") { // foil
        isFoil = false;
    } else if (card.Foil == "foil") {
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
    var img = document.querySelector("#image img:not(.lazy)");
    var src = img.src;
    var mkmId = parseMkmIdFromImgSrc(src);

    var div = document.createElement("div");
    var mainContent = document.getElementById("mainContent");
    mainContent.parentElement.insertBefore(div, mainContent);

    if (!collection) {
        const span = document.createElement('span');
        span.innerText = "Collection not loaded.";
        div.appendChild(span);
        return;
    }
    cardByMkmId(mkmId).then(async cardObject => {
        if (cardObject.object == "error") {
            const errorSpan = document.createElement('errorSpan');
            errorSpan.innerText = `Error when requesting cardmarket id ${mkmId}: ` + cardObject.details;
            div.appendChild(errorSpan);
            throw new Error(`Error when requesting cardmarket id ${mkmId}: ` + cardObject.details);
        }
        var scryfallId = cardObject.id;
        // var samePrinting = searchCollectionForScryfallId(collection, scryfallId);
        cardName = cardObject.name;
        var cards = searchCollectionForName(collection, cardName);
        var toAppend;
        if (cards) {
            toAppend = await generateTable(cards, scryfallId);
        } else {
            toAppend = document.createElement('span');
            toAppend.innerText = "You don't own any printing of this card.";
        }
        div.appendChild(toAppend);
    });
}

(async function main() {
    // Retrieve data from local storage
    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            console.log('Retrieved collection data');
            collectionLoaded(collection);
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });

    let priceField = document.getElementById("price");
    if (priceField) {
        myPrice = calcMyPrice();
        priceField.value = myPrice;
    }
})();