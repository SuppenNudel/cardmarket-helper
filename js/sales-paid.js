// Must match PACKED_KEY_PREFIX in background.js.
const PACKED_KEY_PREFIX = 'packed_';

function packedLoaded(packedOrderIds) {
    const rows = document.querySelectorAll("#StatusTable .table-body > .row");
    for(const row of rows) {
        const colId = row.querySelectorAll(":scope > div")[1];
        const orderId = colId.textContent.trim();
        if(packedOrderIds.has(orderId)) {
            const sellerNameElement = row.querySelector("span.seller-name > span:nth-of-type(2) > span");
            sellerNameElement.textContent += " - Packed";
        } else {

        }
    }
}

(async function main() {
    console.log("sales-paid.js");
    browser.storage.local.get(null).then(result => {
        const packedOrderIds = new Set(
            Object.keys(result)
                .filter(key => key.startsWith(PACKED_KEY_PREFIX) && result[key])
                .map(key => key.slice(PACKED_KEY_PREFIX.length))
        );
        packedLoaded(packedOrderIds);
    }).catch(error => {
        console.error('Error updating object:', error);
    });
})();