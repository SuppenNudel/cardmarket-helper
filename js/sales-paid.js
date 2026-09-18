function updatePackedRow(row, isPacked) {
    const sellerNameElement = row.querySelector("span.seller-name > span:nth-of-type(2) > span");
    if (!sellerNameElement) {
        return;
    }

    let packedLabel = sellerNameElement.querySelector('[data-cardmarket-helper-packed]');
    if (isPacked && !packedLabel) {
        packedLabel = document.createElement('span');
        packedLabel.dataset.cardmarketHelperPacked = '';
        packedLabel.textContent = ' - Packed';
        sellerNameElement.appendChild(packedLabel);
    } else if (!isPacked && packedLabel) {
        packedLabel.remove();
    }
}

function findPackedOrderRow(orderId) {
    const rows = document.querySelectorAll("#StatusTable .table-body > .row");
    return Array.from(rows).find(row => {
        const columns = row.querySelectorAll(":scope > div");
        return columns[1] && columns[1].textContent.trim() === orderId;
    });
}

function packedLoaded(packedOrderIds) {
    const rows = document.querySelectorAll("#StatusTable .table-body > .row");
    for(const row of rows) {
        const columns = row.querySelectorAll(":scope > div");
        const orderId = columns[1] ? columns[1].textContent.trim() : '';
        updatePackedRow(row, packedOrderIds.has(orderId));
    }
}

(async function main() {
    const packedKeyPrefix = 'packed_';
    console.log("sales-paid.js");

    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') {
            return;
        }
        for (const [key, change] of Object.entries(changes)) {
            if (!key.startsWith(packedKeyPrefix)) {
                continue;
            }
            const row = findPackedOrderRow(key.slice(packedKeyPrefix.length));
            if (row) {
                updatePackedRow(row, Boolean(change.newValue));
            }
        }
    });

    browser.storage.local.get(null).then(result => {
        const packedOrderIds = new Set(
            Object.keys(result)
                .filter(key => key.startsWith(packedKeyPrefix) && result[key])
                .map(key => key.slice(packedKeyPrefix.length))
        );
        packedLoaded(packedOrderIds);
    }).catch(error => {
        console.error('Error updating object:', error);
    });
})();