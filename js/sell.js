let myPrice = null;

function getHighlightColor() {
    const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    return isDarkMode ? 'darkgreen' : 'lightgreen';
}

function waitForAttribute(element, attributeName) {
    return new Promise((resolve) => {
        // Check if the attribute is already present
        if (element.hasAttribute(attributeName)) {
            resolve(element);
            return;
        }

        // Set up the MutationObserver to watch for attribute changes
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === "attributes" && mutation.attributeName === attributeName) {
                    observer.disconnect(); // Stop observing
                    resolve(element); // Resolve the promise
                    return;
                }
            }
        });

        // Start observing the target element for attribute changes
        observer.observe(element, { attributes: true });
    });
}

function calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b); // Don't mutate original
    const length = sorted.length;
    const middle = Math.floor(length / 2);
    return sorted[middle];
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

function parseNumberFromText(value) {
    if (value === null || value === undefined) {
        return Number.NaN;
    }

    const normalized = String(value)
        .trim()
        .replace(/\s/g, "")
        .replace(/€/g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.-]/g, "");

    return Number.parseFloat(normalized);
}

function formatCurrencyValue(amount, currencyCode) {
    const locale = (document.documentElement.lang || navigator.language || "en").replace("_", "-");
    const normalizedCurrency = /^[A-Za-z]{3}$/.test(String(currencyCode || ""))
        ? String(currencyCode).toUpperCase()
        : "EUR";

    try {
        return amount.toLocaleString(locale, {
            style: "currency",
            currency: normalizedCurrency
        });
    } catch (error) {
        return amount.toLocaleString("en", {
            style: "currency",
            currency: "EUR"
        });
    }
}

function createPriceDictionary() {
    // Language-independent extraction: anchor to the "Reprints/Versions" row and
    // parse the following rows by stable position in Cardmarket's info list.
    const infoList = document.querySelector(".info-list-container dl.labeled");
    if (!infoList) {
        return {};
    }

    const dtNodes = Array.from(infoList.querySelectorAll(":scope > dt"));
    const ddNodes = Array.from(infoList.querySelectorAll(":scope > dd"));
    const pairCount = Math.min(dtNodes.length, ddNodes.length);
    if (pairCount === 0) {
        return {};
    }

    const pairs = [];
    for (let i = 0; i < pairCount; i++) {
        pairs.push({ dd: ddNodes[i], value: ddNodes[i].textContent.trim() });
    }

    const reprintsIndex = pairs.findIndex(pair => pair.dd.querySelector('a[href*="/Versions"], a[href*="isFoil="]'));
    if (reprintsIndex < 0 || reprintsIndex + 1 >= pairs.length) {
        return {};
    }

    const nextRows = pairs.slice(reprintsIndex + 1, reprintsIndex + 7).map(pair => pair.value);
    if (nextRows.length === 0) {
        return {};
    }

    const result = {};
    const [availableItems, fromValue, ...remainingPriceRows] = nextRows;

    if (availableItems !== undefined) {
        result.items = Number.parseInt(availableItems.replace(/[^0-9]/g, ""), 10);
    }

    if (fromValue !== undefined) {
        result.from = fromValue === "N/A" ? null : parseCurrencyStringToDouble(fromValue);
    }

    const priceRows = remainingPriceRows
        .map(value => (value === "N/A" ? null : parseCurrencyStringToDouble(value)))
        .filter(value => value !== null && !Number.isNaN(value));

    if (priceRows.length === 4) {
        result.trend = priceRows[0];
        result.avg30 = priceRows[1];
        result.avg7 = priceRows[2];
        result.avg1 = priceRows[3];
    } else if (priceRows.length === 3) {
        result.avg30 = priceRows[0];
        result.avg7 = priceRows[1];
        result.avg1 = priceRows[2];
    } else if (priceRows.length > 0) {
        [result.avg30, result.avg7, result.avg1] = priceRows;
    }

    return result;
}

function calcMyPrice(mkmid, userName) {
    const inclinePercentage = 0.15; // 15% relative incline threshold
    const maxQuantityThreshold = 10;  // Threshold for how high of a quantity of a rival seller you don't want to compete with
    const rivalsToLookAt = 10;
    const minRivalSales = 300;
    const minRivalAvailableItems = 250;

    // offers
    articleRows = document.getElementById("table").getElementsByClassName("article-row");
    var rivalSellers = [];
    for (var i = 0; i < articleRows.length && rivalSellers.length < rivalsToLookAt; i++) {
        row = articleRows[i];
        const sellerNameElement = row.querySelector(".seller-name a");
        var sellerName = sellerNameElement.textContent.trim();
        if (sellerName == userName) {
            continue;
        }

        // Cache class names or use more specific queries:
        const priceContainer = row.querySelector(".price-container");
        const price = parseCurrencyStringToDouble(priceContainer.textContent.trim());
        const quantity = row.querySelector(".col-offer .item-count").textContent.trim();
        const sellCountElement = row.querySelector(".col-sellerProductInfo .seller-extended .sell-count");
        let sellCountText = sellCountElement.getAttribute("data-bs-original-title");
        if (!sellCountText) {
            sellCountText = sellCountElement.getAttribute("title");
        }
        if (sellCountText) {
            const numbers = sellCountText.match(/\d+/g);
            const [sales, availableItems] = numbers.map(Number);

            if (sales >= minRivalSales && availableItems >= minRivalAvailableItems) {
                rivalSellers.push({ quantity: quantity, price: price, sales: sales, availableItems: availableItems });
                sellerNameElement.textContent = "🤺 " + sellerNameElement.textContent;
            }
        } else {
            console.log("couln't find sellCountData for ", sellerNameElement.textContent);
        }
    }

    // Sort sellers by price in ascending order
    rivalSellers.sort((a, b) => a.price - b.price);

    let desiredPrice = 0;
    if (rivalSellers.length > 0) {
        desiredPrice = rivalSellers[0].price - 0.01; // Start just below the lowest price

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
    if (!imgSrc || typeof imgSrc !== 'string') {
        throw new Error("Invalid imgSrc: expected a non-empty string, got " + typeof imgSrc);
    }
    
    var matches = imgSrc.match(/\/(\w+)\/(\d+)\//);
    if (matches && matches.length === 3) {
        var setCode = matches[1]; // "LCC"
        var mkmId = matches[2]; // "744721"
        return mkmId;
    } else {
        throw new Error("No match found. Error parsing setCode and mkmId from image url: " + imgSrc);
    }
}

const HEADERS = ["Go to / Fill", "Quantity", "Set code", "Collector number", "Foil", "Condition", "Language", "Misprint", "Altered", "Binder Name", "Purchase price"];

// Get the current URL
var currentURL = window.location.href;
// Create a URL object
var url = new URL(currentURL);
function getListProductForm() {
    return document.getElementById("ListProductForm")
        || document.querySelector('form[action*="/PostGetAction/Article_ListProduct"]');
}

function hasListProductSubmitButton() {
    const listProductForm = getListProductForm();
    if (!listProductForm) {
        return false;
    }

    return Boolean(listProductForm.querySelector('input[type="submit"], button[type="submit"]'));
}

function getCurrentSellContext() {
    const productIdElement = document.querySelector('#FilterForm > input[name="idProduct"]');

    return {
        productId: productIdElement ? String(productIdElement.value) : null,
        isFoil: url.searchParams.get('isFoil') || 'N',
        path: window.location.pathname
    };
}

function extractArticleId(articleRowId) {
    if (typeof articleRowId !== 'string') {
        return null;
    }

    const match = articleRowId.match(/^articleRow(\d+)$/);
    return match ? match[1] : null;
}

function isCurrentUsersArticleRow(articleRow, userName) {
    if (!articleRow || !userName) {
        return false;
    }

    const sellerNameElement = articleRow.querySelector('.seller-name a');
    return Boolean(sellerNameElement) && sellerNameElement.textContent.trim() === userName;
}

function isPendingSaleForCurrentProduct(pendingArticleSale) {
    if (!pendingArticleSale) {
        return false;
    }

    const currentContext = getCurrentSellContext();
    return Boolean(currentContext.productId)
        && pendingArticleSale.productId === currentContext.productId
        && String(pendingArticleSale.isFoil || 'N') === String(currentContext.isFoil || 'N');
}

function getVisibleArticleIds() {
    const table = document.getElementById('table');
    if (!table) {
        return [];
    }

    return Array.from(table.getElementsByClassName('article-row'))
        .map((articleRow) => extractArticleId(articleRow.id))
        .filter(Boolean);
}

function getPendingSaleCandidateRows(articleRows, userName, articleSaleTimestamps, pendingArticleSale) {
    const unsavedRows = Array.from(articleRows).filter((articleRow) => {
        const articleId = extractArticleId(articleRow.id);
        return Boolean(articleId)
            && isCurrentUsersArticleRow(articleRow, userName)
            && !articleSaleTimestamps[articleId];
    });

    const knownArticleIds = new Set(
        Array.isArray(pendingArticleSale && pendingArticleSale.knownArticleIds)
            ? pendingArticleSale.knownArticleIds.map((articleId) => String(articleId))
            : []
    );

    const newRows = unsavedRows.filter((articleRow) => {
        const articleId = extractArticleId(articleRow.id);
        return articleId && !knownArticleIds.has(String(articleId));
    });

    if (newRows.length > 0) {
        return newRows;
    }

    return unsavedRows;
}

async function savePendingSaleForCurrentProduct() {
    const currentContext = getCurrentSellContext();
    if (!currentContext.productId) {
        return;
    }

    await savePendingArticleSale({
        createdAt: new Date().toISOString(),
        productId: currentContext.productId,
        isFoil: currentContext.isFoil,
        path: currentContext.path,
        knownArticleIds: getVisibleArticleIds()
    });
}

function registerPendingSaleTracking() {
    const listProductForm = getListProductForm();
    if (!listProductForm) {
        return;
    }

    let isResubmitting = false;
    let pendingSubmitter = null;

    const submitButtons = listProductForm.querySelectorAll('input[type="submit"], button[type="submit"]');
    for (const submitButton of submitButtons) {
        submitButton.addEventListener('click', () => {
            pendingSubmitter = submitButton;
        }, true);
    }

    listProductForm.addEventListener('submit', (event) => {
        if (isResubmitting) {
            return;
        }

        event.preventDefault();

        const submitter = event.submitter || pendingSubmitter;
        savePendingSaleForCurrentProduct()
            .catch((error) => {
                console.error('Error storing pending article sale:', error);
            })
            .finally(() => {
                isResubmitting = true;

                try {
                    if (typeof listProductForm.requestSubmit === 'function') {
                        if (submitter instanceof HTMLButtonElement
                            || (submitter instanceof HTMLInputElement && submitter.type === 'submit')) {
                            listProductForm.requestSubmit(submitter);
                        } else {
                            listProductForm.requestSubmit();
                        }
                        return;
                    }
                } catch (error) {
                    console.error('Error resubmitting form with requestSubmit:', error);
                }

                listProductForm.submit();
            });
    }, true);
}

async function tryResolvePendingSaleFromRows(articleRows, userName) {
    const pendingArticleSale = await getPendingArticleSale();
    if (!isPendingSaleForCurrentProduct(pendingArticleSale)) {
        return false;
    }

    const articleSaleTimestamps = await getArticleSaleTimestamps();
    const candidateRows = getPendingSaleCandidateRows(
        articleRows,
        userName,
        articleSaleTimestamps,
        pendingArticleSale
    );

    if (candidateRows.length !== 1) {
        return false;
    }

    const articleId = extractArticleId(candidateRows[0].id);
    await saveArticleSaleTimestamp(articleId, pendingArticleSale.createdAt);
    await clearPendingArticleSale();
    return true;
}

async function observeArticleRowsForPendingSale(userName) {
    const table = document.getElementById('table');
    if (!table) {
        return;
    }

    await tryResolvePendingSaleFromRows(table.getElementsByClassName('article-row'), userName);

    const observer = new MutationObserver((mutations) => {
        const resolvePendingSale = async () => {
            const pendingArticleSale = await getPendingArticleSale();
            if (!isPendingSaleForCurrentProduct(pendingArticleSale)) {
                return;
            }

            const articleSaleTimestamps = await getArticleSaleTimestamps();
            for (const mutation of mutations) {
                for (const addedNode of mutation.addedNodes) {
                    if (!(addedNode instanceof HTMLElement)) {
                        continue;
                    }

                    const candidateRows = [];
                    if (addedNode.classList.contains('article-row')) {
                        candidateRows.push(addedNode);
                    }

                    candidateRows.push(...addedNode.querySelectorAll('.article-row'));

                    for (const articleRow of candidateRows) {
                        const articleId = extractArticleId(articleRow.id);
                        if (!articleId || articleSaleTimestamps[articleId]) {
                            continue;
                        }

                        if (Array.isArray(pendingArticleSale.knownArticleIds)
                            && pendingArticleSale.knownArticleIds.includes(String(articleId))) {
                            continue;
                        }

                        if (!isCurrentUsersArticleRow(articleRow, userName)) {
                            continue;
                        }

                        await saveArticleSaleTimestamp(articleId, pendingArticleSale.createdAt);
                        await clearPendingArticleSale();
                        return;
                    }
                }
            }

            await tryResolvePendingSaleFromRows(table.getElementsByClassName('article-row'), userName);
        };

        resolvePendingSale().catch((error) => {
            console.error('Error resolving pending article sale:', error);
        });
    });

    observer.observe(table, { childList: true, subtree: true });
}

function checkForRedirect(newURL) {
    let currentIsFoil = url.searchParams.get('isFoil');
    if(currentIsFoil == null) {
        currentIsFoil = 'N';
    }
    const newIsFoil = new URL(newURL).searchParams.get('isFoil');
    if (currentIsFoil != newIsFoil) {
        return true;
    }
    return false;
}

async function generateTable(mkmId, cards) { // id of same printing
    const scryfallCard = await cardByMkmId(mkmId);
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
        if (header === "Collector number") {
            th.textContent = "CN";
        } else if (header === "Quantity") {
            th.textContent = "Qty";
        } else {
            th.textContent = header;
        }
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Get the value of the 'isFoil' parameter
    var isFoilParam = url.searchParams.get('isFoil') == 'Y';

    // Create tbody
    const tbody = document.createElement('tbody');
    const fragment = document.createDocumentFragment();
    for (const card of cards) {
        if (card["Binder Type"] == "list") {
            continue;
        }
        const row = document.createElement('tr');

        var canFill = false;
        
        if (card['Scryfall ID'] == scryfallCard.id) {
            row.style.backgroundColor = getHighlightColor();
            row.classList.add('highlight-row');
            if(isFoilParam == (card.Foil != "normal")) {
                canFill = true;
            }
        }
        for (const key of HEADERS) {
            const td = document.createElement('td');
            row.appendChild(td);
            if (key == "Go to / Fill") {
                const newURL = await generateCardmarketUrl(card);
                if (newURL) {
                    // compare new url to currentUrl
                    const needRedirect = checkForRedirect(newURL);
                    
                    // Always show Go To link
                    link = document.createElement("a");
                    link.textContent = "Go To";
                    link.setAttribute("href", newURL);
                    td.appendChild(link);
                    
                    // Additionally show Fill button if canFill is true
                    if (!needRedirect && canFill) {
                        const spacer = document.createElement("span");
                        spacer.textContent = " | ";
                        td.appendChild(spacer);
                        
                        var button = document.createElement("button");
                        button.style.width = "70px";
                        button.style.height = "25px";
                        button.style.setProperty('--bs-btn-padding-x', 'initial');
                        button.innerHTML = "Fill";
                        if (!hasListProductSubmitButton()) {
                            button.disabled = true;
                        } else {
                            button.addEventListener("click", function () {
                                fillMetrics(card);
                            });
                        }
                        button.setAttribute("id", "myButton");
                        button.setAttribute("class", "btn btn-outline-primary");
                        td.appendChild(button);
                    }
                } else {
                    link = document.createElement("div");
                    link.textContent = "undefined";
                    td.appendChild(link);
                }
                // }
                continue;
            }

            const value = card[key];
            row.appendChild(td);
            var element = undefined;
            if (key == "Language") {
                element = createLanguageIcon(value);
            } else if (key == "Condition") {
                element = createConditionIcon(CONDITION_MAP_ID[value]);
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
                        td.textContent = "❔";
                    } else {
                        td.textContent = "❌";
                    }
                }
                if (key == "Altered") {
                    if (value == "true") {
                        td.textContent = "🖌️";
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
                    const purchasePrice = parseNumberFromText(td.textContent);
                    const purchaseCurrency = String(card["Purchase price currency"] || "EUR").trim();
                    if (!Number.isNaN(purchasePrice)) {
                        td.textContent = formatCurrencyValue(purchasePrice, purchaseCurrency);
                    }
                    if (typeof myPrice === 'number' && !Number.isNaN(myPrice) && !Number.isNaN(purchasePrice)) {
                        if (myPrice > purchasePrice) {
                            td.textContent = "📈 " + td.textContent;
                        } else {
                            td.textContent = "📉 " + td.textContent;
                        }
                    }
                }
                if (key == "Set code") {
                    td.textContent = " " + value;
                    let setSymbol = document.createElement("i");
                    const setCode = card['Set code'];
                    let ssCode;
                    if (setCode == 'PLST') {
                        ssCode = card['Collector number'].split('-')[0].toLowerCase();
                    } else if (['PPP1', 'PSS2', 'J14', 'PF19'].includes(setCode)) {
                        ssCode = 'sld';
                    } else if (setCode == '4BB') {
                        ssCode = '4ed';
                    } else if (setCode == 'PALP') {
                        ssCode = 'papac';
                    } else {
                        ssCode = value.toLowerCase();
                    }
                    setSymbol.classList = `ss ss-${ssCode} ss-${card['Rarity']}`;
                    td.prepend(setSymbol);
                }
            }
            if (element) {
                td.appendChild(element);
            }
        }
        fragment.appendChild(row);
    }
    tbody.appendChild(fragment);
    table.appendChild(tbody);

    // Observe theme changes and update row colors
    const observer = new MutationObserver(() => {
        const highlightRows = table.querySelectorAll('.highlight-row');
        highlightRows.forEach(row => {
            row.style.backgroundColor = getHighlightColor();
        });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

    return table;
}

function setValue(elementName, type, value) {
    input = document.querySelector(`input[name="${elementName}"]`);
    input[type] = value;
}

function getSingleQueryParam(paramName) {
    const value = url.searchParams.get(paramName);
    if (!value || value.includes(',')) {
        return null;
    }
    return value;
}

function applyUrlFiltersToForm() {
    const languageParam = getSingleQueryParam('language');
    if (languageParam) {
        const languageSelect = document.getElementById("idLanguage");
        if (languageSelect) {
            languageSelect.value = languageParam;
            languageSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    const conditionParam = getSingleQueryParam('minCondition') || getSingleQueryParam('condition');
    if (conditionParam) {
        const conditionSelect = document.getElementById("idCondition");
        if (conditionSelect) {
            conditionSelect.value = conditionParam;
            conditionSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    const isFoilParam = getSingleQueryParam('isFoil');
    if (isFoilParam) {
        const isFoil = isFoilParam === 'Y' || isFoilParam === '1' || isFoilParam === 'true';
        setValue("isFoil", "checked", isFoil);
    }

    const quantityParam = getSingleQueryParam('quantity');
    if (quantityParam) {
        setValue("amount", "value", quantityParam);
    }
}

function fillMetrics(card) {
    if (!card) {
        console.warn("fillMetrics: card object is undefined or null");
        return;
    }

    var isFoil;
    if (card.Foil == "normal") { // foil
        isFoil = false;
    } else if (card.Foil == "foil" || card.Foil == "etched") {
        isFoil = true;
    } else if (card.Foil === undefined) {
        console.warn("fillMetrics: Foil property is missing from card object");
        return;
    } else {
        throw new Error("Foil value is not valid: " + card.Foil);
    }
    setValue("isFoil", "checked", isFoil);
    setValue("amount", "value", card.Quantity);

    const languageSelect = document.getElementById("idLanguage");
    if (card.Language && LANG_MAP[card.Language]) {
        languageSelect.value = LANG_MAP[card.Language];
    } else {
        console.warn("fillMetrics: Invalid language:", card.Language);
    }
    languageSelect.dispatchEvent(new Event("change", { bubbles: true }));

    const conditionSelect = document.getElementById("idCondition");
    if (card.Condition && CONDITION_MAP_ID[card.Condition]) {
        conditionSelect.value = CONDITION_MAP_ID[card.Condition];
    } else {
        console.warn("fillMetrics: Invalid condition:", card.Condition);
    }
    conditionSelect.dispatchEvent(new Event("change", { bubbles: true }));

    var isAltered;
    if (card.Altered == "false") { // altered
        isAltered = false;
    } else if (card.Altered == "true") {
        isAltered = true;
    } else if (card.Altered === undefined) {
        console.warn("fillMetrics: Altered property is missing from card object");
        return;
    } else {
        throw new Error("Altered value is not valid: " + card.Altered);
    }
    setValue("isAltered", "checked", isAltered);
}

function collectionLoaded(collection, tableContainer, loadingDiv) {
    // info if collection not loaded
    if (!collection) {
        const span = document.createElement('span');
        span.textContent = "Collection not loaded.";
        tableContainer.appendChild(span);
        if (loadingDiv) {
            loadingDiv.remove();
        }
        return;
    }
    var mkmId = document.querySelector('#FilterForm > input[name="idProduct"]').value;
    const mkmProduct = productdata.products[mkmId];
    const productName = mkmProduct.name.replaceAll("\"\"", "\"").replace(/ \/ /g, " // ");
    const collectionCards = [];
    for (const sameIdCards of Object.values(collection)) {
        for (const collectionCard of sameIdCards) {
            if (productName === collectionCard.Name) {
                collectionCards.push(collectionCard);
            }
        }
    }
    tableContainer.innerHTML = ""; // Clear previous content
    if (collectionCards.length == 0) {
        const span = document.createElement('span');
        span.textContent = "You don't own any printing of this card.";
        tableContainer.appendChild(span);
    } else {
        generateTable(mkmId, collectionCards).then(table => {
            tableContainer.appendChild(table);
        });
    }

    loadingDiv.remove();
}

function getUserName() {
    return document.querySelector('#account-dropdown > div.line-height115 > span').textContent.trim();
}

(async function main() {
    console.log("sell.js");

    registerPendingSaleTracking();

    // --- Add toggle and table container before loading starts ---
    var mainContent = document.getElementById("mainContent");

    // Create a wrapper div for toggle and table
    var wrapperDiv = document.createElement("div");
    wrapperDiv.id = "collection-table-wrapper";
    mainContent.parentElement.insertBefore(wrapperDiv, mainContent);

    // Create toggle label structure
    var toggleDiv = document.createElement('div');
    toggleDiv.style.marginBottom = '10px';
    toggleDiv.style.display = 'flex';
    toggleDiv.style.gap = '12px';

    var toggleLabel = document.createElement('label');
    toggleLabel.className = "switch-button";
    toggleLabel.style.cursor = "pointer";

    // Checkbox input
    var toggleInput = document.createElement('input');
    toggleInput.type = "checkbox";
    toggleInput.name = "collectionTableToggle";

    // Switch span
    var switchSpan = document.createElement('span');
    switchSpan.className = "switch";

    // Values span (optional, for Yes/No)
    var valuesSpan = document.createElement('span');
    valuesSpan.className = "values";
    valuesSpan.innerHTML = `<span class="yes">Show</span><span class="no">Hide</span>`;

    // Label span
    var labelSpan = document.createElement('span');
    labelSpan.className = "label";
    labelSpan.textContent = "Collection Table";

    // Assemble toggle
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(switchSpan);
    toggleLabel.appendChild(valuesSpan);
    toggleLabel.appendChild(labelSpan);
    toggleDiv.appendChild(toggleLabel);

    var priceToggleLabel = document.createElement('label');
    priceToggleLabel.className = "switch-button";
    priceToggleLabel.style.cursor = "pointer";

    var priceToggleInput = document.createElement('input');
    priceToggleInput.type = "checkbox";
    priceToggleInput.name = "priceAutofillToggle";

    var priceSwitchSpan = document.createElement('span');
    priceSwitchSpan.className = "switch";

    var priceValuesSpan = document.createElement('span');
    priceValuesSpan.className = "values";
    priceValuesSpan.innerHTML = `<span class="yes">On</span><span class="no">Off</span>`;

    var priceLabelSpan = document.createElement('span');
    priceLabelSpan.className = "label";
    priceLabelSpan.textContent = "Price Autofill";

    priceToggleLabel.appendChild(priceToggleInput);
    priceToggleLabel.appendChild(priceSwitchSpan);
    priceToggleLabel.appendChild(priceValuesSpan);
    priceToggleLabel.appendChild(priceLabelSpan);
    toggleDiv.appendChild(priceToggleLabel);

    wrapperDiv.appendChild(toggleDiv);

    // Create table container
    var tableContainer = document.createElement("div");
    tableContainer.id = "collection-table-container";
    wrapperDiv.appendChild(tableContainer);

    // Load toggle state from storage
    let tableVisible = true;
    let priceAutofillEnabled = true;
    try {
        const result = await browser.storage.local.get(['collectionTableVisible', 'priceAutofillEnabled']);
        if (typeof result.collectionTableVisible === 'boolean') {
            tableVisible = result.collectionTableVisible;
        }
        if (typeof result.priceAutofillEnabled === 'boolean') {
            priceAutofillEnabled = result.priceAutofillEnabled;
        }
    } catch (e) {
        console.error('Error loading toggle state:', e);
    }
    toggleInput.checked = tableVisible;
    tableContainer.style.display = tableVisible ? '' : 'none';
    priceToggleInput.checked = priceAutofillEnabled;

    // Toggle logic
    toggleInput.onchange = function () {
        const visible = toggleInput.checked;
        tableContainer.style.display = visible ? '' : 'none';
        browser.storage.local.set({ collectionTableVisible: visible });
    };

    priceToggleInput.onchange = function () {
        const enabled = priceToggleInput.checked;
        browser.storage.local.set({ priceAutofillEnabled: enabled });
    };

    applyUrlFiltersToForm();

    const userName = getUserName();
    observeArticleRowsForPendingSale(userName).catch((error) => {
        console.error('Error observing article rows:', error);
    });

    [pricedata, productdata] = await getCardmarketData();

    const priceField = document.getElementById("price");
    if (priceField && priceToggleInput.checked) {
        var mkmId = document.querySelector('#FilterForm > input[name="idProduct"]').value;
        const computedPrice = parseFloat(calcMyPrice(mkmId, userName));
        myPrice = computedPrice;
        priceField.value = computedPrice.toFixed(2);
    }
    // Add loading indicator
    var loadingDiv = document.createElement("div");
    loadingDiv.textContent = "loading collection...";
    loadingDiv.id = 'loading';
    wrapperDiv.appendChild(loadingDiv);

    // Retrieve data from local storage
    browser.storage.local.get(['collection'])
        .then((result) => {
            const collection = result.collection;

            collectionLoaded(collection, tableContainer, loadingDiv);
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });
})();
