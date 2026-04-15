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
    var lowerBound = referencePrice * 0.90;
    var upperBound = referencePrice * 1.10;

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

function getColorForLowPrice(lowPrice, offerPrice) {
    // Low price is the cheapest available, so offer can't be cheaper
    //green: offer equals or is at low price
    // orange: offer is within 10% above low
    // red: offer exceeds 10% above low
    var threshold = lowPrice * 1.10;
    
    if (offerPrice <= lowPrice) {
        return 'green';
    } else if (offerPrice <= threshold) {
        return 'orange';
    } else {
        return 'red';
    }
}

function normalizePriceGuides(priceGuides) {
    if (!priceGuides) {
        return {};
    }

    if (Array.isArray(priceGuides)) {
        // Legacy cache format can be an array; normalize to an idProduct keyed dictionary.
        return priceGuides.reduce((acc, entry) => {
            if (entry && entry.idProduct != null) {
                acc[String(entry.idProduct)] = entry;
            }
            return acc;
        }, {});
    }

    return priceGuides;
}

async function getAllPriceData() {
    // Fetch both the game price guide (singles + non-singles) and accessories price guide.
    // Since we can't determine from the URL whether we're looking at accessories or not,
    // we merge both data sources into one id-based map.
    const [gameData, accessoriesData] = await Promise.all([
        getCachedCardmarketData(KEY_PRICEDATA),
        getCachedCardmarketData(KEY_PRICEDATA_ACCESSORIES)
    ]);

    const gamePriceGuides = normalizePriceGuides(gameData && gameData.priceGuides);
    const accessoriesPriceGuides = normalizePriceGuides(accessoriesData && accessoriesData.priceGuides);

    return {
        priceGuides: {
            ...gamePriceGuides,
            ...accessoriesPriceGuides
        }
    };
}

function getPricesByMkmId(priceGuides, mkmId) {
    if (!priceGuides || !mkmId) {
        return null;
    }

    const id = String(mkmId);
    return priceGuides[id] || null;
}

function extractArticleId(articleRowId) {
    if (typeof articleRowId !== 'string') {
        return null;
    }

    const match = articleRowId.match(/^articleRow(\d+)$/);
    return match ? match[1] : null;
}

function formatArticleSaleTimestamp(timestamp) {
    if (!timestamp) {
        return null;
    }

    const listedAt = new Date(timestamp);
    if (Number.isNaN(listedAt.getTime())) {
        return null;
    }

    const locale = (document.documentElement.lang || navigator.language || 'en').replace('_', '-');
    return listedAt.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeArticleSaleTime(timestamp) {
    if (!timestamp) {
        return null;
    }

    const listedAt = new Date(timestamp);
    if (Number.isNaN(listedAt.getTime())) {
        return null;
    }

    const locale = (document.documentElement.lang || navigator.language || 'en').replace('_', '-');
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const elapsedSeconds = Math.round((listedAt.getTime() - Date.now()) / 1000);
    const absoluteElapsedSeconds = Math.abs(elapsedSeconds);

    if (absoluteElapsedSeconds < 60) {
        return formatter.format(elapsedSeconds, 'second');
    }

    const elapsedMinutes = Math.round(elapsedSeconds / 60);
    if (Math.abs(elapsedMinutes) < 60) {
        return formatter.format(elapsedMinutes, 'minute');
    }

    const elapsedHours = Math.round(elapsedMinutes / 60);
    if (Math.abs(elapsedHours) < 24) {
        return formatter.format(elapsedHours, 'hour');
    }

    const elapsedDays = Math.round(elapsedHours / 24);
    if (Math.abs(elapsedDays) < 30) {
        return formatter.format(elapsedDays, 'day');
    }

    const elapsedMonths = Math.round(elapsedDays / 30);
    if (Math.abs(elapsedMonths) < 12) {
        return formatter.format(elapsedMonths, 'month');
    }

    const elapsedYears = Math.round(elapsedDays / 365);
    return formatter.format(elapsedYears, 'year');
}

function appendArticleSaleTimestamp(articleRow, articleSaleTimestamp) {
    if (!articleSaleTimestamp || articleRow.querySelector('.cm-helper-listed-at')) {
        return;
    }

    const priceContainer = articleRow.querySelector('.price-container .flex-column');
    if (!priceContainer) {
        return;
    }

    const formattedTimestamp = formatArticleSaleTimestamp(articleSaleTimestamp);
    if (!formattedTimestamp) {
        return;
    }

    const relativeTimestamp = formatRelativeArticleSaleTime(articleSaleTimestamp);

    const listedAtElement = document.createElement('div');
    listedAtElement.className = 'cm-helper-listed-at';
    listedAtElement.innerText = 'Listed: ' + formattedTimestamp + (relativeTimestamp ? ' (' + relativeTimestamp + ')' : '');
    listedAtElement.style.color = 'gray';
    listedAtElement.style.fontSize = '0.8em';
    listedAtElement.style.marginTop = '0.25rem';
    priceContainer.appendChild(listedAtElement);
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
        const pricedata = result;
        const prices = getPricesByMkmId(pricedata.priceGuides, mkmid);

        if (!prices) {
            const noPriceDiv = document.createElement("div");
            priceContainer.appendChild(document.createElement("br"));
            priceContainer.appendChild(noPriceDiv);
            noPriceDiv.innerText = "No price data available";
            noPriceDiv.style.color = "gray";
            noPriceDiv.style.fontSize = "0.9em";
            return;
        }

        var productAttributesElement = articleRow.querySelector('.product-attributes');
        var foilElement = productAttributesElement.querySelector('[aria-label="Foil"]');
        var holoElement = productAttributesElement.querySelector('[aria-label="Reverse Holo"]');
    
        const low = prices[`low${foilElement ? '-foil' : holoElement ? '-holo' : ''}`];
        const avg = prices[`avg${foilElement ? '-foil' : holoElement ? '-holo' : ''}`];
        const trend = prices[`trend${foilElement ? '-foil' : holoElement ? '-holo' : ''}`];
        
        priceContainer.querySelector(".align-items-center").classList.remove("d-flex");
        // Select the offer price span specifically from the .align-items-center div, not the shipping cost span
        offerElement = priceContainer.querySelector('.align-items-center span[class*="text-end"]');
        currStr = offerElement.innerText;
        offer = parseCurrencyStringToDouble(currStr);
    
        priceContainer.appendChild(document.createElement("br"));
        var div = document.createElement("div");
        priceContainer.appendChild(div);
    
        if (low) {
            const lowDiv = document.createElement("div");
            priceContainer.appendChild(lowDiv);
            lowDiv.innerText = "⬇️ " + low.toFixed(2);
            const lowColor = getColorForLowPrice(low, offer);
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

    const articleId = extractArticleId(articleRow.id);
    if (articleId) {
        getArticleSaleTimestamp(articleId).then((articleSaleTimestamp) => {
            appendArticleSaleTimestamp(articleRow, articleSaleTimestamp);
        });
    }

    forceOfferCommentIcon(articleRow);
}

function forceOfferCommentIcon(articleRow) {
    const productComments = articleRow.querySelector('.product-comments');
    if (!productComments) {
        return;
    }

    const mobileIcon = productComments.querySelector('.fonticon-comments');
    if (!mobileIcon) {
        return;
    }

    // Keep text available for bootstrap tooltips, but never rendered inline.
    const desktopTextWrapper = productComments.querySelector('.d-none.d-lg-block');
    if (desktopTextWrapper) {
        desktopTextWrapper.classList.add('d-none');
        desktopTextWrapper.classList.remove('d-lg-block');
    }

    mobileIcon.classList.remove('d-lg-none');
}

function updateContent() {
    const table = document.getElementById("UserOffersTable"); // div
    const thumbnailHeader = table.querySelector("div.table-header div.col-thumbnail");
    if (thumbnailHeader) {
        thumbnailHeader.style.width = '10rem';
    }

    // Fetch price data (same price guide covers singles, non-singles, and accessories)
    pricePromise = getAllPriceData();

    const articleRows = table.getElementsByClassName("article-row");
    for (const articleRow of articleRows) {
        updateContentOfCard(articleRow, pricePromise);
    }
}

(async function main() {
    console.log("offers.js");
    updateContent();
})();
