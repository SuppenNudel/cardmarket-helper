function getWantsListTitle() {
    const container = document.querySelector("div.page-title-container h1");
    return container.textContent;
}

function readTableContent() {
    // Initialize a variable to store the CSV content
    let csvContent = "Quantity,Name,Set,Language,Condition,Foil\n";
    let txtContent = "";

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
            if(textContents.length == 1) {
                language = textContents[0];
            }
            // const joinedText = textContents.join(',');
            // language = joinedText.includes(',') ? `"${joinedText}"` : joinedText;
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
        txtContent += `${quantity} ${name}\n`;
    });

    return [csvContent, txtContent];
}

function createDownloadButton(wantsListTitle, csvText) {
    const exportButton = document.createElement("a");
    exportButton.classList = "btn btn-outline-primary me-3";

    fonticonClipboard = document.createElement("span");
    fonticonClipboard.classList = "fonticon-download me-2";
    textSpan = document.createElement("span");
    textSpan.textContent = "Download as .csv";

    exportButton.append(fonticonClipboard, textSpan);

    const blob = new Blob([csvText], { type: 'text/csv' });
    exportButton.href = URL.createObjectURL(blob);
    exportButton.download = `${wantsListTitle}.csv`;

    return exportButton;
}


function createDownloadAsListButton(wantsListTitle, content) {
    const exportButton = document.createElement("a");
    exportButton.classList = "btn btn-outline-primary me-3";

    fonticonClipboard = document.createElement("span");
    fonticonClipboard.classList = "fonticon-download me-2";
    textSpan = document.createElement("span");
    textSpan.textContent = "Download as .txt";

    exportButton.append(fonticonClipboard, textSpan);

    const blob = new Blob([content], { type: 'text/txt' });
    exportButton.href = URL.createObjectURL(blob);
    exportButton.download = `${wantsListTitle}.txt`;

    return exportButton;
}

function createCopyToClipboardButton(content) {
    const exportButton = document.createElement("a");
    exportButton.classList = "btn btn-outline-primary me-3";

    fonticonClipboard = document.createElement("span");
    fonticonClipboard.classList = "fonticon-clipboard me-2";
    textSpan = document.createElement("span");
    textSpan.textContent = "Copy to Clipboard";

    exportButton.append(fonticonClipboard, textSpan);

    exportButton.addEventListener('click', function(event) {
        event.preventDefault();  // Prevents navigation
        copyToClipboard(content);
      });

    return exportButton;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
      alert('Wantslist copied to clipboard');
    }).catch(function(err) {
      console.error('Could not copy text: ', err);
    });
  }

(async function main() {
    console.log("wantslist_export.js");
    const [csvText, txtContent] = readTableContent();
    const wantsListTitle = getWantsListTitle();
    const exportButton = createDownloadButton(wantsListTitle, csvText);
    const exportAsListButton = createDownloadAsListButton(wantsListTitle, txtContent);
    const copyToClipboardButton = createCopyToClipboardButton(txtContent);

    const myButtonRow = document.createElement("div");
    myButtonRow.classList = "d-none d-lg-flex flex-column flex-lg-row justify-content-between align-items-center mb-4";
    const bulkMod = document.querySelector("#BulkModification");
    bulkMod.parentNode.insertBefore(myButtonRow, bulkMod);

    const exportButtons = document.createElement("div");
    exportButtons.classList = "d-flex align-items-center";
    myButtonRow.append(exportButtons);

    exportButtons.append(exportButton, exportAsListButton, copyToClipboardButton);
})();