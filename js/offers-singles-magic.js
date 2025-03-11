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
        .map(([lang, value]) => {
            total += value; // Sum the values
            const icon = createLanguageIcon(lang);
            return `<li>${value}x ${icon.outerHTML}</li>`; // Format each entry
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

function initFormatInfoFields(fields, formats) {
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
    for (const field of Object.values(fields)) {
        const collectionElement = document.createElement('div');
        const classCardName = field.cardname.replaceAll(/ \/?\/ /g, "-").replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");
        collectionElement.classList.add('coll', classCardName);
        field.collectionDiv.append(collectionElement);
    }
}

async function fillFormatInfoFields(fields, formats, cardNamesSet, scryfallCards) {
    for (var scryfallCard of scryfallCards) {
        for(const field in fields) {
            const cardname = fields[field].cardname;
            if (cardname == scryfallCard.name) {
                fields[field]['legalities'] = scryfallCard['legalities'];
            }
            for (const format of formats) {
                formatLegality(scryfallCard, format);
            }
        }
    }

    const promises = [];
    for (const format of formats) {
        const promise = fetchFilteredNotionData(format, Array.from(cardNamesSet)).then(notionData => {
            for (const scryfallCard of scryfallCards) {
                mtgtop8Name = scryfallCardToMtgtop8Name(scryfallCard);
                cardData = notionData[mtgtop8Name];

                for(const field in fields) {
                    const cardname = fields[field].cardname;
                    if (cardname == scryfallCard.name) {
                        if(!fields[field]['playrate']) {
                            fields[field]['playrate'] = {}
                        }
                        fields[field]['playrate'][format.name] = cardData;
                    }
                }
                
                if (cardData) {
                    formatStaple(scryfallCard, cardData, format);
                } else {
                    // if cards in given format are not analysed, force show legality
                    formatLegality(scryfallCard, format, showLegality = true);
                }
            }
        });
        promises.push(promise);
    }
    // Wait for all fetchFilteredNotionData calls to complete
    Promise.all(promises).then(() => {
        updateHideOrShow(fields, formats);
    });
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

function formatStaple(scryfallCard, cardData, format) {
    const cardname = scryfallCard.name;
    // const mtgtop8Name = scryfallCardToMtgtop8Name(scryfallCard);
    // const cardData = notionData[mtgtop8Name];

    const classCardName = cardname.replaceAll(" // ", "-").replaceAll(" ", "-").replaceAll(",", "").replaceAll("'", "");

    const legality = scryfallCard.legalities[format.scryfallkey];
    if (legality == 'legal') {
        mainData = cardData[true];
        const allMain = document.querySelectorAll(`.main.decks.${format.name}.${classCardName}`);
        for (main of allMain) {
            main.innerText = mainData ? (mainData.decks*100).toFixed(1) +"%" : "-";
        }

        const allMainAvg = document.querySelectorAll(`.main.avg.${format.name}.${classCardName}`);
        for (main of allMainAvg) {
            main.innerText = mainData ? mainData.avg : "-";
        }

        sideData = cardData[false];
        const allSide = document.querySelectorAll(`.side.decks.${format.name}.${classCardName}`);
        for (side of allSide) {
            side.innerText = sideData ? (sideData.decks*100).toFixed(1) +"%" : "-";
        }

        const allSideAvg = document.querySelectorAll(`.side.avg.${format.name}.${classCardName}`);
        for (side of allSideAvg) {
            side.innerText = sideData ? sideData.avg : "-";
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

function toggleFormatFilter(toggleButton, what, elementToToggle) {
    hidden = elementToToggle.style.display === 'none';
    toggleButton.querySelector(".chevron").classList.toggle('fonticon-chevron-up');
    toggleButton.querySelector(".chevron").classList.toggle('fonticon-chevron-down');
    toggleButton.querySelector("span").innerText = (hidden ? "Hide" : "Show") + " " + what;
    if (hidden) {
        elementToToggle.style.display = 'block';
    } else {
        elementToToggle.style.display = 'none';
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
        setupHideToggle(format.name);
        setupUsageThreshold(format.name);
    }

    const toggleButton = document.getElementById("format-filter-table-toggle");
    toggleButton.onclick = function() {
        toggleFormatFilter(toggleButton, "Format Filter", document.getElementById("format-filter-table"));
    }
}

async function initFormatConfig(formatName) {
    if (config.formats == undefined) {
        config['formats'] = {};
    }
    if(config.formats[formatName] == undefined) {
        config.formats[formatName] = {};
    }
    return config.formats[formatName];
}

function setupHideToggle(formatName) {
    initFormatConfig(formatName).then(formatConfig => {
        document.getElementById('hide-'+formatName).checked = formatConfig.showOnlyLegalIn;
    });
    document.getElementById('hide-'+formatName).addEventListener("change", async (event) => {
        const formatConfig = await initFormatConfig(formatName);
        const value = event.target.checked;
        formatConfig.showOnlyLegalIn = value;
    });
}

function setupUsageThreshold(formatName) {
    initFormatConfig(formatName).then(formatConfig => {
        document.getElementById('mtgtop8-'+formatName).value = formatConfig.usageThreshold;
    });
    document.getElementById('mtgtop8-'+formatName).addEventListener("change", async (event) => {
        const formatConfig = await initFormatConfig(formatName);
        let value = event.target.value;
        if (value) {
            value = Number(value)
        } else {
            value = null;
        }
        formatConfig.usageThreshold = value;
    });
}

function createDeepProxy(obj, onChange) {
    return new Proxy(obj, {
        get(target, key) {
            const value = target[key];

            // If the value is an object, wrap it in another proxy
            if (typeof value === "object" && value !== null) {
                return createDeepProxy(value, onChange);
            }

            return value;
        },
        set(target, key, value) {
            // If assigning an object, wrap it in a new proxy
            if (typeof value === "object" && value !== null) {
                value = createDeepProxy(value, onChange);
            }

            target[key] = value;
            onChange(target, key, value);
            return true;
        }
    });
}

const hitsCol = document.querySelector(".total-count").closest("div");
let colClass = [...hitsCol.classList].find(cls => cls.startsWith('col-')); // Find the class that starts with 'col-'
if (colClass) {
    hitsCol.classList.replace(colClass, 'col-1'); // Replace it with 'col-1'
}

let clonedElement = hitsCol.cloneNode(false); // Clone the element (true means deep clone, including child nodes)
hitsCol.parentNode.insertBefore(clonedElement, hitsCol.nextSibling);
clonedElement.innerHTML = "<span>Hiding </span><span id='hidden-articles'>X</span><span> of </span><span id='total-articles'>Y</span><span> articles</span>";
let clonedClass = [...clonedElement.classList].find(cls => cls.startsWith('col-')); // Find the class that starts with 'col-'
if (clonedClass) {
    clonedElement.classList.replace(clonedClass, 'col-2'); // Replace it with 'col-1'
}

function updateHideOrShow(fields, formats) {
    let selectedFormats = new Set();
    let playrateThresholds = {};

    // Iterate through formats and populate selectedFormats and playrateThresholds
    for (const format of formats) {
        if (config.formats[format.name].showOnlyLegalIn) {
            selectedFormats.add(format.scryfallkey);
        }
        // Convert the usage threshold to a percentage by dividing by 100
        let usageThreshold = config.formats[format.name].usageThreshold;
        if (usageThreshold) {
            usageThreshold = usageThreshold / 100;
        }
        playrateThresholds[format.name] = usageThreshold;
    }

    const playrateThresholdInUse = Object.values(playrateThresholds).some(value => value);
    for (const fieldKey in fields) {
        const field = fields[fieldKey];
        let isAbovePlayRate = !playrateThresholdInUse || false;

        // Check the playrate for each format
        for (const format of formats) {
            const threshold = playrateThresholds[format.name];
            if(!threshold) {
                continue;
            }
            let mainPlayrate = 0;
            let sidePlayrate = 0;
            if (field.playrate[format.name]) {
                if (field.playrate[format.name][true]) {
                    mainPlayrate = field.playrate[format.name][true].decks;
                }
                if (field.playrate[format.name][false]) {
                    sidePlayrate = field.playrate[format.name][false].decks;
                }  
            }

            // Check if the playrate is above the threshold
            if (mainPlayrate >= threshold ||sidePlayrate >= threshold) {
                isAbovePlayRate = true;
                break; // No need to check further formats once a condition is met
            }
        }

        // If the playrate is below the threshold, hide the card
        if (!isAbovePlayRate) {
            field.row.style.display = "none";
        } else {
            // If playrate is above the threshold, check legality
            if (selectedFormats.size === 0) {
                // No filters active, show all cards
                field.row.style.display = "flex";
            } else {
                const legalities = field.legalities;
                let isLegal = true;
                if(legalities) {
                    // Show card if it is legal in any selected format and meets playrate criteria
                    isLegal = [...selectedFormats].some(format => legalities[format] === "legal");
                }
                field.row.style.display = isLegal ? "flex" : "none";
            }
        }
    }

    // Count the number of hidden cards
    let hiddenCount = Object.values(fields).filter(field => field.row.style.display === "none").length;
    document.getElementById("hidden-articles").innerText = hiddenCount;
    document.getElementById("total-articles").innerText = Object.keys(fields).length;
}


let config;

(async function main() {
    console.log("offers-singles-magic.js");
    const formats = await fetchNotionDb(formatsDbId);
    const configData = await initConfig();

    addFilters(formats);
    
    const productDataPromise = getCachedCardmarketData(KEY_PRODUCTDATA);
    const fieldsPromise = initFields(productDataPromise);
    const collectionPromise = getCollection();
    
    config = createDeepProxy(configData, async () => {
        await saveConfig(config);
        fieldsPromise.then(fields => {
            updateHideOrShow(fields, formats);
        })
    });

    fieldsPromise.then(fields => {
        const cardNamesSet = new Set(
            Object.values(fields).flatMap(field => [field.cardname.replace("//", "/"), field.cardname.split(/ \/?\/ /)[0]])
        );
        var scryfallCards = scryfallCardsCollection(cardNamesSet);
        
        scryfallCards.then(scryfallCards => {
            initFormatInfoFields(fields, formats);
            fillFormatInfoFields(fields, formats, cardNamesSet, scryfallCards);
        });
        
        initCollectionInfoFields(fields);
        collectionPromise.then(collection => {
            fillCollectionInfoFields(fields, collection);
        });
    });

})();