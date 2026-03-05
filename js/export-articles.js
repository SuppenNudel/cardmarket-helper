function modifyCsvData(csvContent) {
    const totalElement = document.querySelector("#collapsibleBuyerShipmentSummary div.summary")
        || document.querySelector("#collapsibleSellerShipmentSummary div.summary")
        || document.querySelector("#collapsibleShipmentSummary div.summary")
        || document.querySelector("div.summary[data-total-price]")
        || document.querySelector("[data-total-price]");

    const totalRaw = totalElement ? totalElement.getAttribute("data-total-price") : "";
    const total = Number.parseFloat(String(totalRaw || "").replace(",", "."));

    // Parse CSV content into objects using PapaParse
    const parsedData = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        delimiter: ";",
    });
    const articles = parsedData.data;

    // Calculate the current total article cost (sum of all groupCount * price)
    let articleTotalCost = 0;
    articles.forEach(article => {
        const groupCount = Number.parseFloat(String(article.groupCount || "0").replace(",", "."));
        const price = Number.parseFloat(String(article.price || "0").replace(",", "."));
        if (!Number.isNaN(groupCount) && !Number.isNaN(price)) {
            articleTotalCost += groupCount * price;
        }
    });

    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(articleTotalCost) || articleTotalCost <= 0) {
        return csvContent;
    }

    // Calculate the multiplier based on the ratio of total to the article cost
    const costMultiplier = total / articleTotalCost;

    // Adjust each article's price based on the cost multiplier
    articles.forEach(article => {
        const price = Number.parseFloat(String(article.price || "0").replace(",", "."));
        article.price = Number.isNaN(price) ? article.price : (price * costMultiplier).toFixed(2);
    });

    // Convert modified data back to CSV format
    const adjustedCsv = Papa.unparse(articles, { delimiter: ";" });
    return adjustedCsv;
}

const MANABOX_VIEWER_TARGETS = {
    local: {
        url: "http://localhost:8000/index.html",
        origin: "http://localhost:8000"
    },
    hosted: {
        url: "https://htmlpreview.github.io/?https://github.com/SuppenNudel/manabox-viewer/blob/main/index.html",
        origin: "https://htmlpreview.github.io"
    }
};

const DEFAULT_MANABOX_VIEWER_MODE = "hosted";

const ORDER_LANGUAGE_LABEL_TO_CODE = {
    "english": "en",
    "french": "fr",
    "german": "de",
    "spanish": "es",
    "italian": "it",
    "chinese (simplified)": "zh_cn",
    "japanese": "ja",
    "portuguese": "pt",
    "russian": "ru",
    "korean": "ko",
    "chinese (traditional)": "zh_tw"
};

const ORDER_CONDITION_BY_ID = {
    "1": "Mint",
    "2": "Near Mint",
    "3": "Excellent",
    "4": "Good",
    "5": "Light Played",
    "6": "Played",
    "7": "Poor"
};

const ORDER_CONDITION_SHORT_TO_LABEL = {
    "MT": "Mint",
    "NM": "Near Mint",
    "EX": "Excellent",
    "GD": "Good",
    "LP": "Light Played",
    "PL": "Played",
    "PO": "Poor"
};

async function resolveManaBoxViewerTarget() {
    try {
        const storageData = await browser.storage.sync.get("config");
        const config = storageData && storageData.config ? storageData.config : {};
        const mode = config.manaboxViewerMode;

        if (mode && MANABOX_VIEWER_TARGETS[mode]) {
            return MANABOX_VIEWER_TARGETS[mode];
        }
    } catch (error) {
        console.error("Error reading ManaBox viewer mode from config:", error);
    }

    return MANABOX_VIEWER_TARGETS[DEFAULT_MANABOX_VIEWER_MODE];
}

async function fetchAdjustedCsvContent(collapsibleExportElement) {
    const exportForm = (collapsibleExportElement && collapsibleExportElement.querySelector('form[action*="Shipment_ExportArticles"]'))
        || document.querySelector('form[action*="Shipment_ExportArticles"]')
        || (collapsibleExportElement && collapsibleExportElement.querySelector("form"));

    if (!exportForm) {
        throw new Error("Shipment export form not found on page.");
    }

    const idShipmentInput = exportForm.querySelector('input[name="idShipment"]') || document.querySelector('input[name="idShipment"]');
    const idShipment = idShipmentInput ? idShipmentInput.value : "";

    const formData = new URLSearchParams();
    const formFields = exportForm.querySelectorAll("input[name], select[name], textarea[name]");
    formFields.forEach(field => {
        const key = field.getAttribute("name");
        if (!key || field.disabled) return;

        if (field.tagName === "INPUT") {
            const type = String(field.type || "").toLowerCase();
            if ((type === "checkbox" || type === "radio") && !field.checked) {
                return;
            }
            formData.append(key, String(field.value || ""));
            return;
        }

        formData.append(key, String(field.value || ""));
    });

    if (idShipment && !formData.has("idShipment")) {
        formData.append("idShipment", idShipment);
    }

    const actionUrl = exportForm.action || `${window.location.origin}/en/Magic/PostGetAction/Shipment_ExportArticles`;
    const method = String(exportForm.method || "POST").toUpperCase();

    const response = await fetch(actionUrl, {
        method,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/csv,text/plain,*/*"
        },
        body: formData.toString(),
        credentials: "include"
    });

    const csvContent = await response.text();
    let resolvedCsvContent = csvContent;

    if (!isShipmentExportCsv(resolvedCsvContent)) {
        const directCsvContent = await fetchShipmentExportCsvDirect(idShipment);
        if (isShipmentExportCsv(directCsvContent)) {
            resolvedCsvContent = directCsvContent;
        }
    }

    if (!isShipmentExportCsv(resolvedCsvContent)) {
        const fallbackCsvContent = buildShipmentCsvFromPageScrape();
        if (isShipmentExportCsv(fallbackCsvContent)) {
            resolvedCsvContent = fallbackCsvContent;
        }
    }

    if (!isShipmentExportCsv(resolvedCsvContent)) {
        throw new Error("Shipment export did not return CSV (received HTML or unexpected response).");
    }

    const adjustedCsvContent = modifyCsvData(resolvedCsvContent);
    return { adjustedCsvContent, idShipment };
}

function isShipmentExportCsv(content) {
    const text = String(content || "");
    if (!text) return false;
    const headerMatch = /^\s*\uFEFF?"?idProduct"?;"?groupCount"?;"?price"?;"?idLanguage"?;"?condition"?;"?isFoil"?/im;
    return headerMatch.test(text);
}

async function fetchShipmentExportCsvDirect(idShipment) {
    const cmtknInput = document.querySelector('input[name="__cmtkn"]');
    if (!cmtknInput || !idShipment) {
        return "";
    }

    const formData = new URLSearchParams({
        __cmtkn: cmtknInput.value,
        idShipment: idShipment
    }).toString();

    try {
        const response = await fetch("https://www.cardmarket.com/en/Magic/PostGetAction/Shipment_ExportArticles", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "text/csv,text/plain,*/*"
            },
            body: formData,
            credentials: "include"
        });
        return await response.text();
    } catch (error) {
        return "";
    }
}

function normalizeConditionToId(conditionText) {
    const normalized = String(conditionText || "").trim().toLowerCase().replace(/\s+/g, "_");
    return CONDITION_MAP_ID[normalized] || "";
}

function buildShipmentCsvFromPageScrape() {
    const articles = scrapeOrderArticlesFromPage();
    if (!articles || articles.length === 0) {
        return "";
    }

    const headers = [
        "idProduct",
        "groupCount",
        "price",
        "idLanguage",
        "condition",
        "isFoil",
        "isSigned",
        "isAltered",
        "isPlayset",
        "isReverseHolo",
        "isFirstEd",
        "isFullArt",
        "isUberRare",
        "isWithDie"
    ];

    const rows = articles.map(article => {
        const languageId = getLanguageIdFromCode(article.language) || "";
        const conditionId = normalizeConditionToId(article.condition);
        return [
            article.idProduct || "",
            article.groupCount || "",
            article.price || "",
            languageId,
            conditionId,
            article.isFoil ? 1 : "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        ];
    });

    return [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
}

function parseShipmentCsvRows(csvContent) {
    const parsedData = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: false,
        delimiter: ";",
        skipEmptyLines: true,
    });
    return Array.isArray(parsedData.data) ? parsedData.data : [];
}

function parseCurrencyStringToDouble(currencyString) {
    return parseCardmarketCurrency(currencyString);
}

function parseOrderArticleLanguage(infoTd) {
    if (!infoTd) return "";

    const icon = infoTd.querySelector("span.is-24x24 > span.icon")
        || infoTd.querySelector("div.col-icon span span.icon")
        || infoTd.querySelector("span.icon");

    if (!icon) return "";

    const backgroundPosition = String(icon.style.backgroundPosition || "").trim();
    if (backgroundPosition) {
        const languageCode = getLanguageCodeFromBackgroundPosition(backgroundPosition);
        if (languageCode) {
            return String(languageCode).toLowerCase().replace("-", "_");
        }
    }

    const languageHint = icon.getAttribute("aria-label")
        || icon.getAttribute("title")
        || icon.getAttribute("data-bs-title")
        || icon.getAttribute("data-bs-original-title")
        || "";

    const normalizedHint = String(languageHint || "").trim().toLowerCase();
    if (!normalizedHint) return "";

    return ORDER_LANGUAGE_LABEL_TO_CODE[normalizedHint] || "";
}

function scrapeOrderArticlesFromPage() {
    const articleTable = document.querySelector('table[id^="ArticleTable"]');
    if (!articleTable) {
        return [];
    }

    const rows = articleTable.querySelectorAll("tr");
    const articles = [];

    rows.forEach(row => {
        const previewCell = row.querySelector("td.preview");
        if (!previewCell) return;

        const img = previewCell.querySelector("img[mkmid]");
        if (!img) return;

        const amountCell = row.querySelector("td.amount");
        const infoTd = row.querySelector("td.info");
        const priceElement = row.querySelector("td.price");
        const conditionCell = infoTd ? infoTd.querySelector("a.article-condition") : null;
        const extrasSpan = row.querySelector("span.extras");
        const foilElement = extrasSpan ? extrasSpan.querySelector("span.icon[aria-label='Foil']") : null;

        const conditionShort = conditionCell ? conditionCell.textContent.trim().toUpperCase() : "";
        const conditionLabel = ORDER_CONDITION_SHORT_TO_LABEL[conditionShort] || conditionShort;

        const quantityRaw = amountCell ? (amountCell.getAttribute("data-amount") || amountCell.textContent) : "";
        const quantity = Number.parseInt(String(quantityRaw || "").trim(), 10);
        const price = parseCurrencyStringToDouble(priceElement ? priceElement.textContent : "");
        const idProduct = String(img.getAttribute("mkmid") || "").trim();

        const nameElement = (infoTd && infoTd.querySelector("a[href*='/Products/'], a[href*='/Singles/']"))
            || (infoTd && infoTd.querySelector("strong"));
        const name = nameElement ? nameElement.textContent.trim() : "";

        const language = parseOrderArticleLanguage(infoTd);

        articles.push({
            idProduct,
            groupCount: Number.isNaN(quantity) ? 1 : quantity,
            price: price === null ? "" : price.toFixed(2),
            condition: conditionLabel,
            language,
            isFoil: Boolean(foilElement),
            name
        });
    });

    return articles;
}

async function fetchScryfallCardByCardmarketId(cardmarketId) {
    return new Promise(resolve => {
        browser.runtime.sendMessage(
            {
                action: "fetch",
                url: `https://api.scryfall.com/cards/cardmarket/${cardmarketId}`,
                options: {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "NudelForceFirefoxCardmarket/1.1.5",
                        "Accept": "*/*"
                    }
                }
            },
            response => {
                if (!response) {
                    resolve(null);
                    return;
                }

                if (response.success) {
                    resolve(response.data && response.data.id ? response.data : null);
                    return;
                }

                const errorText = String(response.error || "");
                if (errorText.startsWith("HTTP 404")) {
                    resolve(null);
                    return;
                }

                console.warn("Scryfall lookup failed for cardmarket id", cardmarketId, errorText);
                resolve(null);
            }
        );
    });
}

async function buildScryfallLookupForRows(rows) {
    const uniqueIds = [...new Set(rows
        .map(row => String(row.idProduct || "").trim())
        .filter(Boolean))];

    const lookup = new Map();
    await Promise.all(uniqueIds.map(async cardmarketId => {
        const scryfallCard = await fetchScryfallCardByCardmarketId(cardmarketId);
        if (scryfallCard && scryfallCard.id) {
            lookup.set(cardmarketId, scryfallCard);
        }
    }));

    return lookup;
}

function mapOrderArticlesToViewerCards(articles, scryfallLookup) {
    return articles.map((article, index) => {
        const cardmarketId = String(article.idProduct || "").trim();
        const scryfallCard = scryfallLookup.get(cardmarketId);

        const quantity = parseInt(String(article.groupCount || ""), 10);
        const language = String(article.language || "").trim();
        const scryfallLanguage = scryfallCard && scryfallCard.lang
            ? String(scryfallCard.lang).toLowerCase().replace("-", "_")
            : "";
        const condition = String(article.condition || "").trim();

        return {
            "Name": article.name || (scryfallCard ? (scryfallCard.name || "") : (cardmarketId ? `Cardmarket #${cardmarketId}` : `Card ${index + 1}`)),
            "Set code": scryfallCard ? (String(scryfallCard.set || "").toUpperCase()) : "",
            "Set name": scryfallCard ? (scryfallCard.set_name || "") : "",
            "Collector number": scryfallCard ? (scryfallCard.collector_number || "") : "",
            "Foil": article.isFoil ? "Foil" : "Normal",
            "Rarity": scryfallCard ? (scryfallCard.rarity || "") : "",
            "Language": language || scryfallLanguage,
            "Condition": condition,
            "Quantity": Number.isNaN(quantity) ? "1" : String(quantity),
            "Scryfall ID": scryfallCard ? (scryfallCard.id || "") : "",
            "scryfallId": scryfallCard ? (scryfallCard.id || "") : "",
            "Purchase price": String(article.price || "").trim(),
            "Purchase price currency": "EUR",
            "Misprint": "false",
            "Altered": "false",
            "Binder Name": "",
            "Binder Type": "",
            "idProduct": cardmarketId,
            "_scryfall": scryfallCard || null
        };
    });
}

function postCsvToManaBoxViewer(viewerWindow, payload, targetOrigin) {
    if (!viewerWindow || viewerWindow.closed) {
        return;
    }

    let attempts = 0;
    const maxAttempts = 30;
    const intervalMs = 500;
    let intervalId = null;

    const sendPayload = () => {
        if (!viewerWindow || viewerWindow.closed) {
            clearInterval(intervalId);
            return;
        }

        viewerWindow.postMessage(payload, targetOrigin);
        attempts += 1;
        if (attempts >= maxAttempts) {
            clearInterval(intervalId);
        }
    };

    sendPayload();
    intervalId = setInterval(sendPayload, intervalMs);
}

function openViewerWindowWithFallback(primaryTarget) {
    try {
        const viewerWindow = window.open(primaryTarget.url, "_blank");
        return { viewerWindow, target: primaryTarget };
    } catch (error) {
        console.warn("Primary viewer target failed to open:", error);
    }

    return { viewerWindow: null, target: primaryTarget };
}

function getSellerName() {
    const sellerElement = document.querySelector("#SellerBuyerInfo span.seller-name");
    return sellerElement ? sellerElement.textContent.trim() : "unknown_seller";
}

function addExportButton() {
    // Create a new button for custom download
    const collapsibleExportElement = document.getElementById("collapsibleExport") || document.getElementById("collapsiblePrintShipment");
    if(!collapsibleExportElement) {
        return;
    }

    if (document.getElementById("cmh-open-manabox-viewer-btn")) {
        return;
    }

    const exportButton = document.createElement("input");
    exportButton.type = "button";
    const title = "Export Adjusted"
    exportButton.title = title;
    exportButton.value = title;
    exportButton.classList = "btn my-2 btn-sm btn-outline-primary";
    const containerDiv = document.createElement("div");
    containerDiv.classList = "d-grid";
    containerDiv.appendChild(exportButton);

    const openInViewerButton = document.createElement("input");
    openInViewerButton.type = "button";
    openInViewerButton.id = "cmh-open-manabox-viewer-btn";
    const viewerTitle = "Open in ManaBox Viewer";
    openInViewerButton.title = viewerTitle;
    openInViewerButton.value = viewerTitle;
    openInViewerButton.classList = "btn mt-2 btn-sm btn-outline-primary";
    containerDiv.appendChild(openInViewerButton);

    collapsibleExportElement.appendChild(containerDiv);

    // Attach event listener to custom button
    exportButton.addEventListener("click", async () => {
        try {
            const { adjustedCsvContent, idShipment } = await fetchAdjustedCsvContent(collapsibleExportElement);

            // Trigger download of the modified CSV file
            const blob = new Blob([adjustedCsvContent], { type: "text/csv" });
            const downloadUrl = URL.createObjectURL(blob);

            // Create an invisible link, set the href to the blob, and trigger download
            const link = document.createElement("a");
            link.href = downloadUrl;
            const sellerName = getSellerName();
            link.download = `ArticlesFromShipment${idShipment}_from_${sellerName}.csv`;
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Error downloading or modifying CSV:", error);
        }
    });

    openInViewerButton.addEventListener("click", async () => {
        const resolvedTarget = await resolveManaBoxViewerTarget();
        const { viewerWindow, target } = openViewerWindowWithFallback(resolvedTarget);
        if (!viewerWindow) {
            console.error("Could not open ManaBox Viewer window (popup blocked).");
            return;
        }

        try {
            const idShipmentInput = (collapsibleExportElement && collapsibleExportElement.querySelector('input[name="idShipment"]')) || document.querySelector('input[name="idShipment"]');
            const idShipment = idShipmentInput ? idShipmentInput.value : "";

            let sourceRows = scrapeOrderArticlesFromPage();
            let adjustedCsvContent = "";

            if (sourceRows.length === 0) {
                const exportPayload = await fetchAdjustedCsvContent(collapsibleExportElement);
                adjustedCsvContent = exportPayload.adjustedCsvContent;
                sourceRows = parseShipmentCsvRows(adjustedCsvContent).map(row => ({
                    idProduct: String(row.idProduct || "").trim(),
                    groupCount: row.groupCount,
                    price: row.price,
                    condition: ORDER_CONDITION_BY_ID[String(row.condition || "").trim()] || "",
                    language: (() => {
                        const languageCode = getLanguageCodeFromId(row.idLanguage);
                        return languageCode ? String(languageCode).toLowerCase().replace("-", "_") : "";
                    })(),
                    isFoil: ["1", "y", "true", "yes"].includes(String(row.isFoil || "").trim().toLowerCase()),
                    name: ""
                }));
            }

            const scryfallLookup = await buildScryfallLookupForRows(sourceRows);
            const viewerCards = mapOrderArticlesToViewerCards(sourceRows, scryfallLookup);
            const scryfallIds = viewerCards
                .map(card => card["Scryfall ID"] || card.scryfallId || "")
                .filter(Boolean);
            const payload = {
                type: "cardmarket-helper:preload-csv",
                source: "cardmarket-helper",
                format: "cardmarket-shipment-export",
                shipmentId: idShipment,
                sellerName: getSellerName(),
                csvContent: adjustedCsvContent,
                cards: viewerCards,
                scryfallIds: scryfallIds
            };

            postCsvToManaBoxViewer(viewerWindow, payload, target.origin);
        } catch (error) {
            console.error("Error opening ManaBox Viewer with shipment data:", error);
        }
    });
}

(async function main() {
    console.log("export-articles.js");
    console.log("seller:", getSellerName());

    addExportButton();
})();