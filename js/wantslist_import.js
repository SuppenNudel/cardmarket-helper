function generateDropdownHTML(lists) {
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

// Function to add the dropdown menu to the DOM
function addDropdownToDOM(dropdown) {
    const label = document.createElement("label");
    label.setAttribute("for", "listDropdown");
    label.textContent = "Select a list: ";
    label.style = "margin-right: 10px";

    const form = document.getElementById("AddDecklistForm");
    form.parentElement.insertBefore(dropdown, form);
    form.parentElement.insertBefore(label, dropdown);
}

function collectionLoaded(collection) {
    const lists = gatherLists(collection);
    const dropdown = generateDropdownHTML(lists);
    addDropdownToDOM(dropdown);

    const textArea = document.getElementById("AddDecklist");

    dropdown.addEventListener("change", function() {
        const selectedList = this.value; // Get the selected list name
        // Do something with the selected list, for example:
        console.log("Selected list:", selectedList);
        textArea.textContent = "";
        if(selectedList) {
            const list = lists[selectedList];
            for(const card of list) {
                console.log(card);
                textArea.textContent += `${card.Quantity} ${card.Name}`; // (${card["Set name"]})\n`;
            }
        }
    });
}

function gatherLists(collection) {
    const lists = {};
    Object.values(collection).forEach(cards => {
        cards.forEach(card => {
            if (card["Binder Type"] === "list") {
                const binderName = card["Binder Name"];
                lists[binderName] = lists[binderName] || [];
                lists[binderName].push(card);
            }
        });
    });
    return lists;
}

(async function main() {
    console.log("wantslist_import.js");
    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            console.log('Retrieved collection data');
            collectionLoaded(collection);
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });
})();
