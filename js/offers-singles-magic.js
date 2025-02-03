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

async function initFields(productDataPromise) {
    const table = document.getElementById("UserOffersTable");
    const articleRows = table.getElementsByClassName("article-row");
    const articles = {};

    // Create an array to hold all asynchronous tasks
    const tasks = Array.from(articleRows).map(async (articleRow) => {
        const articleId = articleRow.id;

        // Start the async task but don't wait immediately
        const image = await waitFor(articleRow, "div.col-thumbnail img", "mkmId");
        const mkmId = Number(image.getAttribute("mkmId"));

        const productData = await productDataPromise;
        const mkmProduct = productData.products[mkmId];
        const cardname = mkmProduct.name;

        const cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
        cardNameElement.style.display = "-webkit-box"; // enables line break

        cardNameElement.append(document.createElement("br"));
        cardNameElement.append(document.createElement("br"));
        const formatInfoDiv = document.createElement("div");
        formatInfoDiv.style = "display: inline-block";
        formatInfoDiv.style.fontSize = "12px";
        cardNameElement.append(formatInfoDiv);

        cardNameElement.append(document.createElement("br"));
        cardNameElement.append(document.createElement("br"));
        const collectionDiv = document.createElement("div");
        collectionDiv.style = "display: inline-block";
        collectionDiv.style.fontSize = "12px";
        cardNameElement.append(collectionDiv);

        // Store the result in the articles object
        articles[articleId] = {
            row: articleRow,
            mkmId: mkmId,
            formatInfoDiv: formatInfoDiv,
            collectionDiv: collectionDiv,
            cardname: cardname
        };
    });

    // Wait for all tasks to complete
    await Promise.all(tasks);

    return articles;
}


function updateContentOfMagicCard(articleRow, collectionPromise) {
    return new Promise((resolve, reject) => {  // Return a Promise
        mkmIdPromise = waitFor(articleRow, "div.col-thumbnail img", "mkmId")
            .then(image => Number(image.getAttribute("mkmId")));

        Promise.all([mkmIdPromise]).then(([mkmId, prices]) => {
            const [pricedata, productdata] = prices;

            const mkmProduct = productdata.products[mkmId];
            const cardname = mkmProduct.name;
            const cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
            cardNameElement.style.display = "-webkit-box"; // enables line break

            scryfallSearch(cardname).then(result => result.data)
                .then(scryfallCards => {
                    var legalInAtLeastOne = false;
                    var anySelected = true;
                    for (const format of formats) {
                        if (formats.hideIfNotLegalIn) {
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

async function updateMagicContent(collectionPromise) {
    const table = document.getElementById("UserOffersTable"); // div
    const articleRows = table.getElementsByClassName("article-row");

    const cardMap = new Map();  // Map to store card and createdElement mapped to each articleRow
    const cardNamesSet = new Set();  // Set to store unique cardnames

    const articleRowsArray = Array.from(articleRows);

    const promises = articleRowsArray.map(articleRow => {
        return updateContentOfMagicCard(articleRow, collectionPromise)
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
            for (const format of formats) {
                notionData = await fetchFilteredNotionData(format.formatPageId, Array.from(cardNamesSet));
                articleRowsArray.forEach(row => {
                    const { card: scryfallCard, createdElement } = cardMap.get(row) || {};
                    // const stapleDiv = createdElement.querySelector(".staple-info");
                    // createdElement.appendChild(document.createElement("br"));

                    if (scryfallCard) {
                        cardData = notionData[scryfallCard.name];
                        createdElement.appendChild(formatStaple(scryfallCard, cardData, format.name));
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

function initFormatInfoFields(fields, formats, config) {
    for (const field of Object.values(fields)) {
        for (const format of formats) {
            const formatElement = document.createElement('div');
            field.formatInfoDiv.append(formatElement);
            formatElement.style = "display: flex";
            formatElement.innerText = `${format.name}:`;
            formatElement.innerHTML += '&nbsp;';

            const classCardName = field.cardname.replaceAll(/ \/?\/ /g, "-").replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");
            // const classCardNameSpllit = field.cardname.split(" // ")[0].replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");

            const initFormatInfoFields = document.createElement('div');
            formatElement.appendChild(initFormatInfoFields);
            initFormatInfoFields.style = "display: flex";
            initFormatInfoFields.classList.add("format", format.name, classCardName); //, classCardNameSpllit);

            const main = document.createElement('div');
            initFormatInfoFields.appendChild(main);
            main.innerText = '...';
            main.classList.add(format.name, "main", "decks", classCardName); //, classCardNameSpllit);

            const divider2 = document.createElement('div');
            initFormatInfoFields.appendChild(divider2);
            divider2.innerHTML = "&nbsp;(";
            
            const mainAvg = document.createElement('div');
            initFormatInfoFields.appendChild(mainAvg);
            mainAvg.innerText = '...';
            mainAvg.classList.add(format.name, "main", "avg", classCardName); //, classCardNameSpllit);

            const divider = document.createElement('div');
            initFormatInfoFields.appendChild(divider);
            divider.innerHTML = ")&nbsp;/&nbsp;";

            const sideDecks = document.createElement('div');
            initFormatInfoFields.appendChild(sideDecks);
            sideDecks.innerText = '...';
            sideDecks.classList.add(format.name, "side", "decks", classCardName); //, classCardNameSpllit);

            const divider3 = document.createElement('div');
            initFormatInfoFields.appendChild(divider3);
            divider3.innerHTML = "&nbsp;(";
            
            const sideAvg = document.createElement('div');
            initFormatInfoFields.appendChild(sideAvg);
            sideAvg.innerText = '...';
            sideAvg.classList.add(format.name, "side", "avg", classCardName); //, classCardNameSpllit);

            const divider4 = document.createElement('div');
            initFormatInfoFields.appendChild(divider4);
            divider4.innerHTML = ")";
        }
    }
}

async function fillFormatInfoFields(fields, formats) {
    const cardNamesSet = new Set(
        Object.values(fields).flatMap(field => [field.cardname.replace("//", "/"), field.cardname.split(/ \/?\/ /)[0]])
    );

    // show card not legal in format as soon as possible
    var scryfallCards = await scryfallCardsCollection(cardNamesSet);
    for (var scryfallCard of scryfallCards) {
        for (const format of formats) {
            formatLegality(scryfallCard, format);
        }
    }

    for (const format of formats) {
        fetchFilteredNotionData(format.formatPageId, Array.from(cardNamesSet)).then(notionData => {
            for (const scryfallCard of scryfallCards) {
                mtgtop8Name = scryfallCardToMtgtop8Name(scryfallCard);
                cardData = notionData[mtgtop8Name];
                if (cardData) {
                    formatStaple(scryfallCard, notionData, format);
                } else {
                    // if cards in given format are not analysed, force show legality
                    formatLegality(scryfallCard, format, showLegality = true);
                }
            }
        });
    }
}

function formatLegality(scryfallCard, format, showLegality = false) {
    cardname = scryfallCard.name;
    const classCardName = cardname.replaceAll(/ \/?\/ /g, "-").replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");
    const legality = scryfallCard.legalities[format.scryfallkey];
    const allFormat = document.querySelectorAll(`.format.${format.name}.${classCardName}`);
    var legalInfo = null;
    switch (legality) {
        case 'not_legal':
            legalInfo = '🛑 not legal';
            break;
        case 'banned':
            legalInfo = '🚫 banned';
            break;
        case 'legal':
            if (showLegality) {
                legalInfo = '✅ legal';
            }
            break;
        default:
            if (showLegality) {
                legalInfo = legality;
            }
    }
    if (legalInfo) {
        for (formatField of allFormat) {
            formatField.innerHTML = legalInfo;
        }
    }
}

function scryfallCardToMtgtop8Name(scryfallCard) {
    const layout = scryfallCard.layout;
    // TODO add all cases to the list
    if (['adventure', 'transform'].includes(layout)) {
        return scryfallCard.card_faces[0].name;
    }
    return scryfallCard.name.replace("//", "/");
}

function formatStaple(scryfallCard, notionData, format) {
    cardname = scryfallCard.name;
    mtgtop8Name = scryfallCardToMtgtop8Name(scryfallCard);
    cardData = notionData[mtgtop8Name];

    const classCardName = cardname.replaceAll(" // ", "-").replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");

    const legality = scryfallCard.legalities[format.scryfallkey];
    if (legality == 'legal') {
        const allMain = document.querySelectorAll(`.main.decks.${format.name}.${classCardName}`);
        for (main of allMain) {
            main.innerText = cardData ? (cardData.decksMain*100).toFixed(1) +"%" : "?";
        }

        const allSide = document.querySelectorAll(`.side.decks.${format.name}.${classCardName}`);
        for (side of allSide) {
            side.innerText = cardData ? (cardData.decksSide*100).toFixed(1) +"%" : "?";
        }
        
        const allMainAvg = document.querySelectorAll(`.main.avg.${format.name}.${classCardName}`);
        for (main of allMainAvg) {
            main.innerText = cardData ? cardData.avgMain : "?";
        }

        const allSideAvg = document.querySelectorAll(`.side.avg.${format.name}.${classCardName}`);
        for (side of allSideAvg) {
            side.innerText = cardData ? cardData.avgSide : "?";
        }
    }
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

async function addFilters(formats) {
    const filterWrapper = document.querySelector("#FilterOffersFormWrapper");
    const div = document.createElement("div");

    const htmlContent = await getHtml("resources/table.html");

    // Create a container to hold the imported HTML
    div.innerHTML = htmlContent;

    filterWrapper.append(div);

    const filterTable = document.querySelector("#format-filter-table");

    const template = await getHtml("resources/table-filter-tr-template.html");
    for (const format of formats) {
        const replaced = template.replaceAll("{{format-name}}", format.name);
        const tr = document.createElement("tr");
        tr.innerHTML = replaced;
        filterTable.append(tr);
    }
}

(async function main() {
    console.log("offers-singles-magic.js");
    const formats = await fetchNotionDb(formatsDbId);
    const config = await browser.storage.sync.get(['config']).config;

    addFilters(formats);

    const productDataPromise = getCachedCardmarketData(KEY_PRODUCTDATA);
    const fieldsPromise = initFields(productDataPromise);
    const collectionPromise = getCollection();

    fieldsPromise.then(fields => {
        initFormatInfoFields(fields, formats, config);
        fillFormatInfoFields(fields, formats);
    });

    fieldsPromise.then(fields => {
        // initCollectionInfoFields();
        collectionPromise.then(collection => {
            // fillCollectionInfoFields(fields, collection);
        });
        for (const field of Object.values(fields)) {
            field.collectionDiv.textContent = "Collection Info hier";
        }
        // updateCollectionContent(collectionPromise);
    });
})();