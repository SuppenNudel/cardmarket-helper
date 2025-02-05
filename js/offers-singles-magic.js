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
        formatInfoDiv.style.display = "inline-block";
        formatInfoDiv.style.verticalAlign = "top";
        formatInfoDiv.style.fontSize = "12px";
        cardNameElement.append(formatInfoDiv);

        const collectionDiv = document.createElement("div");
        // collectionDiv.style.display = "inline-block";
        collectionDiv.style.verticalAlign = "top";
        collectionDiv.style.paddingLeft = "20px";
        collectionDiv.style.fontSize = "12px";
        collectionDiv.classList.add("flex-grow-1");
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
            return `<li>${key}: ${value}</li>`; // Format each entry
        })
        .join('\n'); // Join them with commas
    return `${total}<ul>${result}</ul>`;
}

function checkOwnership(collection, scryfallCard, cardname=null) {
    var str = '';
    if (collection) {
        if (!cardname) {
            cardname = scryfallCard.name;
        }
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
            str = 'not owned';
        } else {
            const nameStr = sumUp(cardsWithThatNameOwned);

            let printingStr = '...'
            if (scryfallCard && scryfallCard.object == "card") {
                const collectionCards = collection[scryfallCard.id];
                if (collectionCards) {
                    printingStr = sumUp(collectionCards);
                } else {
                    printingStr = 'not owned'
                }
            } else {
                if(scryfallCard.code == "not_found") {
                    printingStr = "couldn't find scryfall card with cardmarket id";
                } else {
                    printingStr = scryfallCard.details;
                }
            }
            str = `all printings: ${nameStr}this printing: ${printingStr}`;
            // + ` // printing: ${sumPrinting.en + sumPrinting.de} (en: ${sumPrinting.en}, de: ${sumPrinting.de})`;
        }
    } else {
        str = '<collection not loaded>';
    }
    return str;
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

function initCollectionInfoFields(fields) {
    // for (const field of Object.values(fields)) {
    //     const collectionElement = document.createElement('div');
    //     const classCardName = field.cardname.replaceAll(/ \/?\/ /g, "-").replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");
        // collectionElement.classList.add('coll', classCardName);
        // field.collectionDiv.append(collectionElement);
    // }
}

async function fillFormatInfoFields(formats, cardNamesSet, scryfallCards) {
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

async function fillCollectionInfoFields(fields, collection) {
    for(const field of Object.values(fields)) {        
        const scryfallCard = await cardByMkmId(field.mkmId);
        if(scryfallCard.object == "card") {
            const result = checkOwnership(collection, scryfallCard);
            field.collectionDiv.innerHTML = result;
        } else {
            const result = checkOwnership(collection, scryfallCard, field.cardname);
            field.collectionDiv.innerHTML = result;
        }
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

    // addFilters(formats);

    const productDataPromise = getCachedCardmarketData(KEY_PRODUCTDATA);
    const fieldsPromise = initFields(productDataPromise);
    const collectionPromise = getCollection();

    fieldsPromise.then(fields => {
        const cardNamesSet = new Set(
            Object.values(fields).flatMap(field => [field.cardname.replace("//", "/"), field.cardname.split(/ \/?\/ /)[0]])
        );
        var scryfallCards = scryfallCardsCollection(cardNamesSet);
        
        scryfallCards.then(scryfallCards => {
            initFormatInfoFields(fields, formats, config);
            fillFormatInfoFields(formats, cardNamesSet, scryfallCards);
        });
        
        initCollectionInfoFields(fields);
        collectionPromise.then(collection => {
            fillCollectionInfoFields(fields, collection);
        });
    });

})();