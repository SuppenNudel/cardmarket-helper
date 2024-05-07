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
            const collectionCards = collection[scryfallCard.id];
            const collectionInfo = document.createElement("td"); // to append to
            collectionInfo.style = "width: 250px; text-align: left;";
            product.insertBefore(collectionInfo, product.querySelector("td.price"));
            
            if(!collectionCards) {
                const collectionDiv = document.createElement("div");
                collectionDiv.textContent = " unowned";
                collectionInfo.appendChild(collectionDiv)
                return;
            }
            const info = product.querySelector("td.info");

            const langIcon = info.querySelector("div.col-icon span span.icon");
            const backgroundPosition = langIcon.style.backgroundPosition;
            var lang;
            for(const posLang in LANG_POS_MAP) {
                const pos = LANG_POS_MAP[posLang];
                if(pos == backgroundPosition) {
                    lang = posLang;
                    break;
                }
            }

            const foil = info.querySelector("div.col-extras span.icon span.icon") ? "foil" : "normal";

            const filteredCards = collectionCards.filter(card => card["Binder Type"] != "list").filter(card => card['Language'] == lang).filter(card => card['Foil'] == foil);

            for(const collectionCard of filteredCards) {
                const collectionDiv = document.createElement("div");
                collectionInfo.appendChild(collectionDiv)
                collectionDiv.textContent = `${collectionCard["Quantity"]}x ${collectionCard["Binder Type"] == "deck" ? "Deck - " : ""}${collectionCard["Binder Name"]}`;
            }
        });
    }
}

(async function main() {
    console.log("orders.js");

    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            console.log('Retrieved collection data');
            if(collection) {
                collectionLoaded(collection);
            }
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });
})();