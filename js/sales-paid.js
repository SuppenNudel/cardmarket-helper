function packedLoaded(orders) {
    const rows = document.querySelectorAll("#StatusTable .table-body > .row");
    for(const row of rows) {
        const colId = row.querySelectorAll(":scope > div")[1];
        const orderId = colId.textContent;
        const order = orders[orderId];
        if(order) {
            const sellerNameElement = row.querySelector("span.seller-name > span:nth-of-type(2) > span");
            sellerNameElement.textContent += " - Packed";
        } else {

        }
    }
}

(async function main() {
    console.log("sales-paid.js");
    browser.storage.sync.get('orders').then(result => {
        let orders = result.orders || {}; // Get the current object or use an empty object if not found
        console.log('orders', orders);
        packedLoaded(orders);
    }).then(() => {
        console.log('Object updated successfully');
    }).catch(error => {
        console.error('Error updating object:', error);
    });
})();