function parseCurrencyStringToDouble(currencyString) {
    // Remove non-numeric characters and the euro symbol
    var cleanedString = currencyString.replace(/[^\d,]/g, '');

    // Replace comma with a dot to make it a valid JavaScript number
    var numberString = cleanedString.replace(',', '.');

    // Parse the string to a floating-point number
    var result = parseFloat(numberString);

    return isNaN(result) ? null : result;
}

function getColorBasedOnPercentageRange(referencePrice, priceToCompare) {
    // Calculate the upper and lower bounds
    var upperBound = referencePrice * (1 + 10 / 100);
    var lowerBound = referencePrice * (1 - 10 / 100);

    // Check if priceToCompare is within the range
    if (priceToCompare < lowerBound) {
        return 'green'; // Price is lower
    } else if (priceToCompare <= upperBound) {
        return 'orange'; // Price is within bounds
    } else if (priceToCompare > upperBound) {
        return 'red'; // Price is higher
    } else {
        return 'blue';
    }
}

function checkPriceWithCardmarket(articleRow, mkmid, pricePromise) {
    var priceContainer = articleRow.querySelector(".price-container .flex-column");
    if(!mkmid) {
        const noMkmIdDiv = document.createElement("div");
        priceContainer.appendChild(noMkmIdDiv);
        noMkmIdDiv.innerText = "no mkm id";
        return;
    }
    pricePromise.then(result => {
        [pricedata, productdata] = result;
        const prices = pricedata.priceGuides[mkmid];

        var productAttributesElement = articleRow.querySelector('.product-attributes');
        var foilElement = productAttributesElement.querySelector('[aria-label="Foil"]');
        var holoElement = productAttributesElement.querySelector('[aria-label="Reverse Holo"]');
    
        const low = prices[`low${foilElement ? '-foil' : holoElement ? '-holo' : ''}`];
        const avg = prices[`avg${foilElement ? '-foil' : holoElement ? '-holo' : ''}`];
        const trend = prices[`trend${foilElement ? '-foil' : holoElement ? '-holo' : ''}`];
        
        priceContainer.querySelector(".align-items-center").classList.remove("d-flex");
        offerElement = priceContainer.querySelector('span[class*="text-end"]');
        currStr = offerElement.innerText;
        offer = parseCurrencyStringToDouble(currStr);
    
        priceContainer.appendChild(document.createElement("br"));
        var div = document.createElement("div");
        priceContainer.appendChild(div);
    
        // if playset - should be discontinued
        if (priceContainer.getElementsByClassName('fst-italic text-muted').length > 0) {
            offer = offer / 4;
        }
    
        if (low) {
            const lowDiv = document.createElement("div");
            priceContainer.appendChild(lowDiv);
            lowDiv.innerText = "⬇️ " + low.toFixed(2);
            const lowColor = getColorBasedOnPercentageRange(low, offer);
            lowDiv.style.color = lowColor;
        }
        if (avg) {
            const avgDiv = document.createElement("div");
            priceContainer.appendChild(avgDiv);
            avgDiv.innerText = " ↔️ " + avg.toFixed(2);
            const avgColor = getColorBasedOnPercentageRange(avg, offer);
            avgDiv.style.color = avgColor;
        }
        if (trend) {
            const trendDiv = document.createElement("div");
            priceContainer.appendChild(trendDiv);
            trendDiv.innerText = " 📈 " + trend.toFixed(2);
            const trendColor = getColorBasedOnPercentageRange(trend, offer);
            trendDiv.style.color = trendColor;
        }
    });
    
}

function updateContentOfCard(articleRow, pricePromise) {
    const element = articleRow.querySelector("span.thumbnail-icon");
    showThumbnail(element).then(image => {
        const mkmId = image.getAttribute("mkmId");
        checkPriceWithCardmarket(articleRow, mkmId, pricePromise);
    });
}

function updateContent() {
    const table = document.getElementById("UserOffersTable"); // div
    const thumbnailHeader = table.querySelector("div.table-header div.col-thumbnail");
    thumbnailHeader.style.width = '10rem';

    pricePromise = getCardmarketData();

    const articleRows = table.getElementsByClassName("article-row");
    for (const articleRow of articleRows) {
        updateContentOfCard(articleRow, pricePromise);
    }
}

(async function main() {
    console.log("offers-singles.js");
    updateContent();
})();
