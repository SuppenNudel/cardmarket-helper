function modifyCsvData(csvContent) {
    const element = document.querySelector("#collapsibleBuyerShipmentSummary div.summary");
    const total = element.getAttribute("data-total-price");

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
        articleTotalCost += article.groupCount * article.price;
    });

    // Calculate the multiplier based on the ratio of total to the article cost
    const costMultiplier = total / articleTotalCost;

    // Adjust each article's price based on the cost multiplier
    articles.forEach(article => {
        article.price = (article.price * costMultiplier).toFixed(2);
    });

    // Convert modified data back to CSV format
    const adjustedCsv = Papa.unparse(articles, { delimiter: ";" });
    return adjustedCsv;
}

function getSellerName() {
    return document.querySelector("#SellerBuyerInfo span.seller-name").textContent;
}

function addExportButton() {
    // Create a new button for custom download
    const collapsibleExportElement = document.getElementById("collapsibleExport");
    if(!collapsibleExportElement) {
        return;
    }
    const exportButton = document.createElement("input");
    exportButton.type = "submit";
    const title = "Export Adjusted"
    exportButton.title = title;
    exportButton.value = title;
    exportButton.classList = "btn my-2 btn-sm btn-outline-primary";
    const containerDiv = document.createElement("div");
    containerDiv.classList = "d-grid";
    containerDiv.appendChild(exportButton);
    collapsibleExportElement.appendChild(containerDiv);

    // Attach event listener to custom button
    exportButton.addEventListener("click", async () => {

        const cmtkn = collapsibleExportElement.querySelector('input[name="__cmtkn"]').value;
        const idShipment = collapsibleExportElement.querySelector('input[name="idShipment"]').value;

        const formData = new URLSearchParams({
            __cmtkn: cmtkn,
            idShipment: idShipment
        }).toString();
        try {
            // Fetch the original CSV content
            const response = await fetch("https://www.cardmarket.com/en/Magic/PostGetAction/Shipment_ExportArticles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",  // Adjust headers as needed
                },
                body: formData,
            });
            let csvContent = await response.text();

            // Process and modify the CSV data as needed
            const adjustedCsvContent = modifyCsvData(csvContent);

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
}

(async function main() {
    console.log("export-articles.js");
    console.log(getSellerName());

    addExportButton();
})();