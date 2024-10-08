const LANG_POS_MAP = {
    "en": "-16px 0px",
    "fr": "-48px 0px",
    "de": "-80px 0px",
    "sp": "-112px 0px",
    "it": "-144px 0px",
    "zh_CN": "-176px 0px",
    "ja": "-208px 0px",
    "pt": "-240px 0px",
    "ru": "-272px 0px",
    "ko": "-304px 0px",
    "zh_TW": "-336px 0px"
}

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
        console.log('Object updated successfully');
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

(async function main() {
    console.log("orders.js");

    const isSales = document.querySelector('a[href$="Orders/Sales"]') !== null;
    if (isSales) {
        browser.storage.sync.get('orders').then(result => {
            let orders = result.orders || {}; // Get the current object or use an empty object if not found
            const orderId = document.querySelector("div.page-title-container h1").textContent.match(/#(\d+)/)[1];
            const order = orders[orderId];
            console.log("order", order);
            const timestamp = order ? order.timestamp : null;
            addPackedButton(orderId, timestamp);
            addToTimeline(timestamp);
        }).then(() => {
            console.log('Object updated successfully');
        }).catch(error => {
            console.error('Error updating object:', error);
        });
    }

    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            console.log('Retrieved collection data');
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