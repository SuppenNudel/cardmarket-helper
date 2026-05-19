const FORMATS = [
    { name: "Standard", scryfallkey: "standard" },
    { name: "Pioneer", scryfallkey: "pioneer" },
    { name: "Modern", scryfallkey: "modern" },
    { name: "Legacy", scryfallkey: "legacy" },
    { name: "Pauper", scryfallkey: "pauper" }
];

const MAX_WANTSLIST_ENTRIES = 150;

function createLabel(forId, text) {
    const label = document.createElement("label");
    label.setAttribute("for", forId);
    label.textContent = text;
    label.style = "margin-right: 10px";
    return label;
}

function generateListDropdown(lists) {
    const dropdown = document.createElement("select");
    dropdown.id = "listDropdown";
    dropdown.className = "mb-3";

    const emptyOption = document.createElement("option");
    emptyOption.text = "";
    dropdown.add(emptyOption);

    for (const listName in lists) {
        const option = document.createElement("option");
        option.text = listName;
        dropdown.add(option);
    }

    return dropdown;
}

function generateFormatDropdown() {
    const dropdown = document.createElement("select");
    dropdown.id = "formatDropdown";
    dropdown.className = "mb-3";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.text = "";
    dropdown.add(emptyOption);

    FORMATS.forEach((format) => {
        const option = document.createElement("option");
        option.value = format.name;
        option.text = format.name;
        dropdown.add(option);
    });

    return dropdown;
}

function addControlsToDOM(listDropdown, formatDropdown, fillButton, statusText, mainboardCheckbox, sideboardCheckbox) {
    const form = document.getElementById("AddDecklistForm");
    const parent = form.parentElement;

    const listLabel = createLabel("listDropdown", "Select a list:");    
    parent.insertBefore(listLabel, form);
    parent.insertBefore(listDropdown, form);

    parent.insertBefore(document.createElement("br"), form);

    const formatLabel = createLabel("formatDropdown", "Fill missing from format:");
    parent.insertBefore(formatLabel, form);
    parent.insertBefore(formatDropdown, form);

    // Mainboard checkbox
    const mainboardLabel = document.createElement("label");
    mainboardLabel.style.marginLeft = "15px";
    mainboardLabel.style.marginRight = "10px";
    mainboardCheckbox.type = "checkbox";
    mainboardCheckbox.id = "mainboardCheckbox";
    mainboardCheckbox.checked = true;
    mainboardLabel.appendChild(mainboardCheckbox);
    mainboardLabel.appendChild(document.createTextNode("Mainboard"));
    parent.insertBefore(mainboardLabel, form);

    // Sideboard checkbox
    const sideboardLabel = document.createElement("label");
    sideboardLabel.style.marginRight = "10px";
    sideboardCheckbox.type = "checkbox";
    sideboardCheckbox.id = "sideboardCheckbox";
    sideboardCheckbox.checked = true;
    sideboardLabel.appendChild(sideboardCheckbox);
    sideboardLabel.appendChild(document.createTextNode("Sideboard"));
    parent.insertBefore(sideboardLabel, form);

    fillButton.type = "button";
    fillButton.id = "fillMissingFromFormat";
    fillButton.textContent = "Fill Missing Cards";
    fillButton.style.marginLeft = "10px";
    parent.insertBefore(fillButton, form);

    statusText.id = "formatFillStatus";
    statusText.style.marginLeft = "10px";
    parent.insertBefore(statusText, form);
}

function gatherLists(collection) {
    const lists = {};
    Object.values(collection || {}).forEach((cards) => {
        cards.forEach((card) => {
            if (card["Binder Type"] === "list") {
                const binderName = card["Binder Name"];
                lists[binderName] = lists[binderName] || [];
                lists[binderName].push(card);
            }
        });
    });
    return lists;
}

function normalizeCardName(cardName) {
    return String(cardName || "")
        .toLowerCase()
        .trim()
        .split(/\s*\/+\s*/) // Split on any slash (/ or //) and take the front face
        [0]
        .replace(/\s+/g, " ");
}

function buildOwnedCountMap(collection) {
    const ownedCount = new Map();

    Object.values(collection || {}).forEach((cards) => {
        cards.forEach((card) => {
            if (card["Binder Type"] === "list") {
                return;
            }
            const normalizedName = normalizeCardName(card.Name);
            if (!normalizedName) {
                return;
            }

            const quantity = Number.parseInt(String(card.Quantity || "1"), 10);
            const safeQuantity = Number.isNaN(quantity) ? 1 : quantity;
            const current = ownedCount.get(normalizedName) || 0;
            ownedCount.set(normalizedName, current + safeQuantity);
        });
    });

    return ownedCount;
}

async function fetchFormatCardData(formatName) {
    const response = await browser.runtime.sendMessage({
        action: "getMtgtop8Data",
        formatName: formatName
    });

    if (!response || !response.success || !response.data) {
        throw new Error(response && response.error ? response.error : "Failed to fetch format data");
    }

    return response.data;
}

function collectMissingCards(formatData, ownedCount, includeMainboard = true, includeSideboard = true) {
    const missingCards = [];

    Object.entries(formatData || {}).forEach(([cardName, usage]) => {   
        const mainAvg = (includeMainboard && usage && usage.mainboard ? usage.mainboard.avg : 0) || 0;
        const sideAvg = (includeSideboard && usage && usage.sideboard ? usage.sideboard.avg : 0) || 0;
        const required = Math.ceil(mainAvg + sideAvg);

        if (required <= 0) {
            return;
        }

        const decksMain = Number(usage && usage.mainboard ? usage.mainboard.decks : 0) || 0;
        const decksSide = Number(usage && usage.sideboard ? usage.sideboard.decks : 0) || 0;
        const playrate = (includeMainboard ? decksMain : 0) + (includeSideboard ? decksSide : 0);

        const owned = ownedCount.get(normalizeCardName(cardName)) || 0;
        const missing = required - owned;

        if (missing > 0) {
            missingCards.push({
                name: cardName,
                quantity: missing,
                playrate: playrate,
                avgCopies: mainAvg + sideAvg
            });
        }
    });

    missingCards.sort((a, b) => b.playrate - a.playrate || b.avgCopies - a.avgCopies || a.name.localeCompare(b.name));
    return missingCards;
}

function collectionLoaded(collection) {
    const lists = gatherLists(collection);
    const listDropdown = generateListDropdown(lists);
    const formatDropdown = generateFormatDropdown();
    const fillButton = document.createElement("button");
    const statusText = document.createElement("small");
    const mainboardCheckbox = document.createElement("input");
    const sideboardCheckbox = document.createElement("input");

    addControlsToDOM(listDropdown, formatDropdown, fillButton, statusText, mainboardCheckbox, sideboardCheckbox);

    const textArea = document.getElementById("AddDecklist");
    const ownedCount = buildOwnedCountMap(collection);

    listDropdown.addEventListener("change", function () {
        const selectedList = this.value;
        textArea.value = "";
        statusText.textContent = "";

        if (selectedList) {
            const list = lists[selectedList];
            const lines = list.map((card) => `${card.Quantity} ${card.Name}`);
            textArea.value = lines.join("\n");
        }
    });

    fillButton.addEventListener("click", async function () {
        const formatName = formatDropdown.value;
        statusText.textContent = "";

        if (!formatName) {
            statusText.textContent = "Select a format first.";
            return;
        }

        if (!mainboardCheckbox.checked && !sideboardCheckbox.checked) {
            statusText.textContent = "Select at least one deck type (Mainboard or Sideboard).";
            return;
        }

        fillButton.disabled = true;
        statusText.textContent = "Loading format data...";

        try {
            const formatData = await fetchFormatCardData(formatName);   
            const missingCards = collectMissingCards(
                formatData, 
                ownedCount, 
                mainboardCheckbox.checked, 
                sideboardCheckbox.checked
            ).slice(0, MAX_WANTSLIST_ENTRIES);

            const lines = missingCards.map((card) => `${card.quantity} ${card.name}`);
            textArea.value = lines.join("\n");

            const minPlayrate = missingCards.length > 0 ? missingCards[missingCards.length - 1].playrate : 0;
            statusText.textContent = `Added ${missingCards.length} missing cards for ${formatName} (min playrate: ${minPlayrate}).`;
        } catch (error) {
            console.error(`Failed to fill missing cards for ${formatName}:`, error);
            statusText.textContent = `Failed to load ${formatName} data.`;
        } finally {
            fillButton.disabled = false;
        }
    });
}

(async function main() {
    console.log("wantslist_import.js");
    browser.storage.local.get("collection")
        .then((result) => {
            const collection = result.collection || {};
            console.log("Retrieved collection data");
            collectionLoaded(collection);
        })
        .catch((error) => {
            console.error("Error retrieving data:", error);
        });
})();
