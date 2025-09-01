function updateButton(orderId, timestamp) {
    const button = document.getElementById("packedButton");
    if (timestamp) {
        button.textContent = "Unpack";
        button.onclick = function () {
            updateStorage(orderId, null);
        }
    } else {
        button.textContent = "Mark as Packed";
        button.onclick = function () {
            updateStorage(orderId, Date.now());
        }
    }
}

function updateTimeline(timestamp, index) {
    const textDiv = document.getElementById("timelinePackedText");
    const packedElement = document.getElementById("timelinePackedElement");
    if (timestamp) {
        textDiv.textContent = 'Packed: ' + formatTimestamp(timestamp);

        packedElement.classList.remove("notYetStatus");
        packedElement.classList.add("bg-primary", "text-inverted");
        textDiv.classList.remove("text-muted");
        const currentStatusElement = document.getElementById("Timeline").querySelector(".currentStatus");
        const index = Array.from(currentStatusElement.parentNode.children).indexOf(currentStatusElement);
        if (index < 2) {
            currentStatusElement.classList.remove("currentStatus");

            packedElement.classList.add("currentStatus");
        }
    } else {
        textDiv.textContent = 'Not yet packed';
        textDiv.classList.add("text-muted");
        packedElement.classList.add("notYetStatus");
        packedElement.classList.remove("bg-primary", "text-inverted", "currentStatus");
        const elements = document.querySelectorAll("#Timeline > div > .timeline-box.text-inverted");
        const lastElement = elements[elements.length - 1];
        lastElement.classList.add("currentStatus");
    }
}

function updateStorage(orderId, timestamp) {
    // Retrieve the current object from storage
    browser.storage.sync.get('orders').then(result => {
        let orders = result.orders || {}; // Get the current object or use an empty object if not found

        // Modify the object
        orders[orderId] = {
            timestamp: timestamp,
            orderId: orderId
        }; // Add or update a property
        // delete myObject.oldProperty; // Optionally, remove a property

        // Save the updated object back to storage
        return browser.storage.sync.set({ orders: orders });
    }).then(() => {
        updateTimeline(timestamp);
        updateButton(orderId, timestamp);
    }).catch(error => {
        console.error('Error updating object:', error);
    });
}

function addPackedButton(orderId, timestamp) {
    const shippingAddress = document.getElementById('collapsibleShippingAddress');
    if (!shippingAddress) {
        return;
    }
    shippingAddress.querySelector(".shipping-address").style.float = 'left';
    const buttonContainer = document.createElement("div");
    buttonContainer.style.float = 'right';
    shippingAddress.appendChild(buttonContainer);
    const button = document.createElement("button");
    button.className = "btn btn-primary my-2 btn-sm";
    button.id = "packedButton";
    buttonContainer.appendChild(button);
    updateButton(orderId, timestamp);
}
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Use 24-hour format
    };

    return new Intl.DateTimeFormat('de-DE', options).format(date).replace(',', '');
}

function addToTimeline(timestamp) {
    const timelineParent = document.getElementById("Timeline")
    const timelineBoxes = timelineParent.getElementsByClassName("timeline-box");
    const secondChild = timelineBoxes[1];
    const packedElement = document.createElement("div");
    packedElement.className = "timeline-box px-1 py-2 small text-nowrap position-relative fw-bold col-6 col-md";
    packedElement.id = "timelinePackedElement";
    const textDiv = document.createElement("div");
    textDiv.id = "timelinePackedText";
    packedElement.append(textDiv);
    secondChild.parentElement.insertBefore(packedElement, secondChild.nextSibling);
    updateTimeline(timestamp);
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

function collectionLoaded(collection) {
    const products = document.querySelectorAll("table.product-table tbody tr");
    const locationHeader = document.createElement("th");
    locationHeader.textContent = "Collection Location";
    const headerRow = document.querySelector("table.product-table thead tr");
    headerRow.insertBefore(locationHeader, headerRow.querySelector("th.price"));
    for (const product of products) {
        showThumbnail(product.querySelector("span.thumbnail-icon")).then(image => {
            if (collection) {
                return getScryfallCardFromImage(image);
            } else {
                return Promise.reject(new Error("Collection not loaded"));
            }
        }).then(scryfallCard => {
            const collectionInfo = document.createElement("td"); // to append to
            collectionInfo.style = "width: 250px; text-align: left;";
            product.insertBefore(collectionInfo, product.querySelector("td.price"));

            if (!scryfallCard) {
                const collectionDiv = document.createElement("div");
                collectionDiv.textContent = "couldn't associate cardmarket card with scryfall card";
                collectionInfo.appendChild(collectionDiv)
                return;
            }
            const collectionCards = collection[scryfallCard.id];
            if (!collectionCards) {
                const collectionDiv = document.createElement("div");
                collectionDiv.textContent = "unowned";
                collectionInfo.appendChild(collectionDiv);
                return;
            }
            const info = product.querySelector("td.info");
            const langIcon = info.querySelector("div.col-icon span span.icon");
            const backgroundPosition = langIcon.style.backgroundPosition;

            var lang;
            for (const posLang in LANG_POS_MAP) {
                const pos = LANG_POS_MAP[posLang];
                if (pos == backgroundPosition) {
                    lang = posLang;
                    break;
                }
            }

            const foil = info.querySelector("div.col-extras span.icon span.icon") ? "foil" : "normal";

            const filteredCards = collectionCards.filter(card => card["Binder Type"] != "list").filter(card => card['Language'] == lang).filter(card => card['Foil'] == foil);

            for (const collectionCard of filteredCards) {
                const collectionDiv = document.createElement("div");
                collectionInfo.appendChild(collectionDiv)
                collectionDiv.textContent = `${collectionCard["Quantity"]}x ${collectionCard["Binder Type"] == "deck" ? "Deck - " : ""}${collectionCard["Binder Name"]}`;
            }
        });
    }
}

function scrapeArticles() {
    const articleTable = document.querySelector('table[id^="ArticleTable"]');
    if (!articleTable) {
        console.error("Article table not found");
        return;
    }

    const rows = articleTable.querySelectorAll("tr");
    const articles = [];

    rows.forEach(row => {
        const previewCell = row.querySelector("td.preview");
        if (previewCell) {
            const img = previewCell.querySelector("img");
            const amountCell = row.querySelector("td.amount");
            const infoTd = row.querySelector("td.info");
            const conditionCell = infoTd.querySelector("a.article-condition");
            const condition = conditionCell ? conditionCell.textContent.trim() : null;
            const conditionId = CONDITION_SHORT_MAP_ID[condition]

            const langSpan = infoTd.querySelector("span.is-24x24 > span.icon");
            const backgroundPosition = langSpan ? langSpan.style.backgroundPosition : null;

            let lang = null;
            if (backgroundPosition) {
                for (const [key, value] of Object.entries(LANG_POS_MAP)) {
                    if (value === backgroundPosition) {
                        lang = key;
                        break;
                    }
                }
            }
            const langId = LANG_MAP[lang];

            const extrasSpan = row.querySelector("span.extras");
            const foilElement = extrasSpan.querySelector("span.icon[aria-label='Foil']")
            let isFoil = null
            if(foilElement) {
                isFoil = foilElement.getAttribute("data-bs-html") === "true";
            }

            const priceElement = row.querySelector("td.price");
            const priceStr = priceElement ? priceElement.textContent.trim() : null;
            const price = parseCurrencyStringToDouble(priceStr)

            const dataAmount = amountCell ? amountCell.getAttribute("data-amount") : null;
            const mkmid = img.getAttribute("mkmid");
            articles.push({
                mkmid: mkmid,
                amount: dataAmount,
                conditionId: conditionId,
                langId: langId,
                isFoil: isFoil,
                price: price
            });
        }
    });

    return articles;
}

function putArticlesInCsv(articles) {
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

    const rows = articles.map(article => [
        article.mkmid || "",
        article.amount || "",
        article.price || "", // price placeholder
        article.langId || "",
        article.conditionId || "",
        article.isFoil ? 1 : "",
        "", // isSigned placeholder
        "", // isAltered placeholder
        "", // isPlayset placeholder
        "", // isReverseHolo placeholder
        "", // isFirstEd placeholder
        "", // isFullArt placeholder
        "", // isUberRare placeholder
        ""  // isWithDie placeholder
    ]);

    const csvContent = [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    return csvContent;
}

function addExportButton() {
    // Create a new button for custom download
    const collapsibleExportElement = document.getElementById("collapsibleExport");
    const printShipmentPageElement = document.getElementById("collapsiblePrintShipment");
    if(!printShipmentPageElement) {
        return;
    }
    const formElement = printShipmentPageElement.querySelector("form");
    const actionBarElement = printShipmentPageElement.closest(".action-bar");

    // button optic
    const exportButton = document.createElement("input");
    exportButton.type = "submit";
    const title = "Export Articles"
    exportButton.title = title;
    exportButton.value = title;
    exportButton.classList = "btn my-2 btn-sm btn-outline-primary";
    const containerDiv = document.createElement("div");
    containerDiv.classList = "d-grid";
    containerDiv.appendChild(exportButton);
    const divider = document.createElement("hr");
    divider.className = "my-3";
    actionBarElement.appendChild(divider);
    actionBarElement.appendChild(containerDiv);

    // Attach event listener to custom button
    exportButton.addEventListener("click", async () => {
        // TODO get articles from page
        const idShipment = formElement.querySelector('input[name="idShipment"]').value;
        try {
            const articles = scrapeArticles();
            let csvContent = putArticlesInCsv(articles)

            // Trigger download of the modified CSV file
            const blob = new Blob([csvContent], { type: "text/csv" });
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
            console.error("Error downloading CSV:", error);
        }
    });
}

(async function main() {
    console.log("orders.js");

    const isSales = document.querySelector('a[href$="Orders/Sales"]') !== null;
    if (isSales) {
        browser.storage.sync.get('orders').then(result => {
            let orders = result.orders || {}; // Get the current object or use an empty object if not found
            const orderId = document.querySelector("div.page-title-container h1").textContent.match(/#(\d+)/)[1];
            const order = orders[orderId];
            const timestamp = order ? order.timestamp : null;
            addPackedButton(orderId, timestamp);
            addToTimeline(timestamp);
            addExportButton()
        }).catch(error => {
            console.error('Error updating object:', error);
        });
    }

    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            if (collection) {
                collectionLoaded(collection);
            } else {
                showThumbnails();
            }
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });
})();