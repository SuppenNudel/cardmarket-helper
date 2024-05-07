function getWantsListTitle() {
    const container = document.querySelector("div.page-title-container h1");
    return container.textContent;
}

function readTableContent() {
    // Initialize a variable to store the CSV content
    let csvContent = "Quantity,Name,Set,Language,Condition,Foil\n";

    const rows = document.querySelectorAll('table.data-table tbody tr');
    rows.forEach(row => {
        const quantity = row.querySelector('.amount').textContent.trim();
        
        const name = row.querySelector('.name a').textContent.trim();
        const formattedName = name.includes(',') ? `"${name}"` : name;

        const sets = row.querySelectorAll('.expansion .visually-hidden');
        let set = "";
        if(sets) {
            const textContents = Array.from(sets).map(element => element.textContent.trim());
            const joinedText = textContents.join(',');
            set = joinedText.includes(',') ? `"${joinedText}"` : joinedText;
        }

        const languages = row.querySelectorAll('.languages .visually-hidden');
        let language = "";
        if(languages) {
            const textContents = Array.from(languages).map(element => element.textContent.trim());
            const joinedText = textContents.join(',');
            language = joinedText.includes(',') ? `"${joinedText}"` : joinedText;
        }

        const condition = row.querySelector('.condition .visually-hidden').textContent.trim();

        const foilText = row.querySelector('.ternary-header span.visually-hidden').textContent.trim();
        let foil;
        if(foilText === "Y") {
            foil = true;
        } else if (foilText === "N") {
            foil = false;
        } else {
            foil = "";
        }
        
        console.log(`Quantity: ${quantity}, Name: ${name}`);
        csvContent += `${quantity},${formattedName},${set},${language},${condition},${foil}\n`;
    });

    return csvContent;
}

function createDownloadButton(wantsListTitle, csvText) {
    const exportButton = document.createElement("a");
    exportButton.classList.add("btn", "btn-outline-primary");
    exportButton.textContent = "Export as .csv";
    exportButton.style = "margin-right: 1rem !important;";
    exportButton.role = "button";

    const blob = new Blob([csvText], { type: 'text/csv' });
    exportButton.href = URL.createObjectURL(blob);
    exportButton.download = `${wantsListTitle}.csv`;

    return exportButton;
}

(async function main() {
    console.log("wantslist_export.js");
    const csvText = readTableContent();
    const wantsListTitle = getWantsListTitle();
    const exportButton = createDownloadButton(wantsListTitle, csvText);
    
    const sellersWithMost = document.querySelector("a.sellersWithMost-linkBtn");
    if(sellersWithMost) {
        const parent = sellersWithMost.parentNode;
        parent.insertBefore(exportButton, sellersWithMost);
    }
})();