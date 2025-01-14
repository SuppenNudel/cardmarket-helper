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

function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function updateContentOfMagicCard(articleRow, pricePromise, collectionPromise) {
    return new Promise((resolve, reject) => {  // Return a Promise
        mkmIdPromise = waitFor(articleRow, "div.col-thumbnail img", "mkmId")
            .then(image => Number(image.getAttribute("mkmId")));

        Promise.all([mkmIdPromise, pricePromise]).then(([mkmId, prices]) => {
            const [pricedata, productdata] = prices;

            const mkmProduct = productdata.products[mkmId];
            const cardname = mkmProduct.name;
            const cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
            cardNameElement.style.display = "-webkit-box"; // enables line break

            scryfallSearch(cardname).then(result => result.data)
                .then(scryfallCards => {
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
                            checkOwnership(collection, cardname, mkmId, scryfallCards, formats)
                                .then(elements => {
                                    cardNameElement.append(document.createElement("br"));
                                    cardNameElement.append(elements);
                                    const createdElement = elements; // Store created element
                                    resolve({ card: scryfallCards[0], createdElement }); // Resolve with both values
                                });
                        });
                    } else {
                        articleRow.style = "display: none";
                        resolve({ card: scryfallCards[0], createdElement: null }); // Return null for createdElement when row is hidden
                    }
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
                    // console.error(cardname, error);
                    reject(error); // Reject the promise if there's an error
                });
        });
    });
}

async function getOfXDecks(format) {
    description = await fetchDatabaseDescription(format.formatPageId);
    deckCount = parseDecksCount(description);
    return deckCount;
}

async function updateMagicContent(pricePromise, collectionPromise) {
    const table = document.getElementById("UserOffersTable"); // div
    const articleRows = table.getElementsByClassName("article-row");

    ofXDecks = {}
    for (const format in formats) {
        deckCount = await getOfXDecks(formats[format]);
        ofXDecks[format] = deckCount;
    }

    const cardMap = new Map();  // Map to store card and createdElement mapped to each articleRow
    const cardNamesSet = new Set();  // Set to store unique cardnames

    const articleRowsArray = Array.from(articleRows);

    const promises = articleRowsArray.map(articleRow => {
        return updateContentOfMagicCard(articleRow, pricePromise, collectionPromise, ofXDecks)
            .then(({ card, createdElement }) => {
                if (card && card.name) {
                    cardNamesSet.add(card.name);  // Add the card name to the Set
                }
                cardMap.set(articleRow, { card, createdElement });  // Map articleRow to both card and createdElement
            })
            .catch(error => {
                console.error("Error:", error);
            });
    });

    Promise.all(promises)  // Wait for all promises to resolve
        .then(async () => {
            for (var format in formats) {
                const formatObject = formats[format];
                notionData = await fetchFilteredNotionData(formatObject.formatPageId, Array.from(cardNamesSet));
                articleRowsArray.forEach(row => {
                    const { card: scryfallCard, createdElement } = cardMap.get(row) || {};
                    // const stapleDiv = createdElement.querySelector(".staple-info");
                    // createdElement.appendChild(document.createElement("br"));

                    if (scryfallCard) {
                        cardData = notionData[scryfallCard.name];
                        createdElement.appendChild(formatStaple(scryfallCard, cardData, format, ofXDecks[format]));
                    } else {
                        div = document.createElement("div");
                        div.textContent = "scryfall card couldn't be mapped";
                        if (createdElement) {
                            createdElement.appendChild(div);
                        } else {
                            console.error("Created Element should not be undefined")
                        }
                    }
                    // console.log("Card:", card);
                    // console.log("Created Element:", createdElement);
                });
            }
        })
        .catch(error => {
            console.error("Error in processing article rows:", error);
        });
}

function sumUp(collectionCardList) {
    let sum = {}

    for (let collCard of collectionCardList) {
        if (!(collCard.Language in sum)) {
            sum[collCard.Language] = 0;
        }
        sum[collCard.Language] += parseInt(collCard.Quantity);
    }
    // Initialize a sum variable
    let total = 0;

    // Format as a string and sum the values simultaneously
    const result = Object.entries(sum)
        .map(([key, value]) => {
            total += value; // Sum the values
            return `${key}: ${value}`; // Format each entry
        })
        .join(', '); // Join them with commas
    return `${result} => ${total}`;
}

async function checkOwnership(collection, cardname, mkmId, scryfallCards) {
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

    var str = '';
    if (collection) {
        const cardsWithThatNameOwned = []
        let count = 0;
        for (const collectionCardList of Object.values(collection)) {
            for (const card of collectionCardList) {
                const { Name, Quantity, "Binder Type": binderType } = card; // Destructuring for easier access

                if (Name === cardname && binderType !== "list") {
                    cardsWithThatNameOwned.push(card);
                    count += Number(Quantity); // Using Number for better readability
                }
            }
        }

        if (cardsWithThatNameOwned.length == 0) {
            str = 'unowned';
        } else {
            const nameStr = sumUp(cardsWithThatNameOwned);

            let printingStr = '...'
            const scryfallCard = await cardByMkmId(mkmId);
            if (scryfallCard && scryfallCard.object == "card") {
                const collectionCards = collection[scryfallCard.id];
                if (collectionCards) {
                    printingStr = sumUp(collectionCards);
                } else {
                    printingStr = 'unowned'
                }
            } else {
                printingStr = scryfallCard.details;
            }
            str = `all printings: ${nameStr}\nthis printing: ${printingStr}`;
            // + ` // printing: ${sumPrinting.en + sumPrinting.de} (en: ${sumPrinting.en}, de: ${sumPrinting.de})`;
        }
    } else {
        str = '<collection not loaded>';
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

function getDateSixMonthsAgo() {
    const today = new Date();
    // Set the date to 6 months in the past
    today.setMonth(today.getMonth() - 6);

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = today.getFullYear();

    return `${day}/${month}/${year}`;
}

function formatStaple(scryfallCard, cardData, format, ofXDecks) {
    const formatElement = document.createElement('div');
    formatElement.style = "display: flex";
    formatElement.innerText = `${format}:`;
    formatElement.innerHTML += '&nbsp;';

    const legality = scryfallCard.legalities[format.toLowerCase()];
    if (legality == 'legal') {
        const main = document.createElement('div');
        formatElement.appendChild(main);
        
        if (ofXDecks) {
            const divider = document.createElement('div');
            divider.innerHTML = "&nbsp;/&nbsp;";
            formatElement.appendChild(divider);
            const side = document.createElement('div');
            formatElement.appendChild(side);
            const divider2 = document.createElement('div');
            formatElement.appendChild(divider2);
            divider2.innerHTML = "&nbsp;-&nbsp;";
            const formatDecksCountElement = document.createElement('div');
            formatElement.appendChild(formatDecksCountElement);
    
    
            formatDecksCountElement.innerText = ofXDecks;
            main.innerText = cardData ? cardData.occ_main : 0;
            side.innerText = cardData ? cardData.occ_side : 0;
        } else {
            main.innerText = "?";
        }
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

async function getCollection() {
    const localCache = await browser.storage.local.get(['collection']);
    return localCache.collection; // This directly returns the collection
}

async function getHtml(path) {
    try {
        const htmlFilePath = browser.runtime.getURL(path);
        // Fetch the HTML content
        const response = await fetch(htmlFilePath);
        if (!response.ok) {
            throw new Error(`Failed to load HTML file: ${response.statusText}`);
        }
        const htmlContent = await response.text();

        return htmlContent;
    } catch (error) {
        console.error("Error loading HTML content:", error);
    }
}

async function addFilters() {
    const filterWrapper = document.querySelector("#FilterOffersFormWrapper");
    const div = document.createElement("div");

    const htmlContent = await getHtml("resources/table.html");

    // Create a container to hold the imported HTML
    div.innerHTML = htmlContent;

    filterWrapper.append(div);

    const filterTable = document.querySelector("#format-filter-table");

    const template = await getHtml("resources/table-filter-tr-template.html");
    for ([formatName, format] of Object.entries(formats)) {
        const replaced = template.replaceAll("{{format-name}}", formatName);
        const tr = document.createElement("tr");
        tr.innerHTML = replaced;
        filterTable.append(tr);
    }
}

var formats;
var config;

(async function main() {
    console.log("offers-singles-magic.js");
    formats = await fetchNotionDb(formatsDbId);
    config = await browser.storage.sync.get(['config']).config;

    addFilters();

    // const [pricedata, productdata] = await getCardmarketData();
    const pricePromise = getCardmarketData();
    const collectionPromise = getCollection();

    updateMagicContent(pricePromise, collectionPromise);
})();