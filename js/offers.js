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

    const match = articleRowId.match(/^(?:articleRow|stockRow)(\d+)$/);
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

function appendArticleTimestamps(articleRow, listedAt, lastModifiedAt, modificationComment) {
    if (!listedAt && !lastModifiedAt) {
        return;
    }

    const actionsContainer = articleRow.querySelector('.actions-container');
    if (!actionsContainer) {
        return;
    }

    // Remove old timestamp elements so re-enrichment updates them cleanly
    articleRow.querySelectorAll('.cm-helper-listed-at, .cm-helper-modified-at, .cm-helper-modification-comment')
        .forEach((element) => element.remove());

    // Wrap actions-container in a flex-column div so timestamps appear below the buttons
    let wrapper = actionsContainer.closest('.cm-helper-actions-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'cm-helper-actions-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'flex-end';
        actionsContainer.parentNode.insertBefore(wrapper, actionsContainer);
        wrapper.appendChild(actionsContainer);
    }

    const container = wrapper;

    if (listedAt) {
        const formattedTimestamp = formatArticleSaleTimestamp(listedAt);
        const relativeTimestamp = formatRelativeArticleSaleTime(listedAt);
        if (relativeTimestamp) {
            const listedAtElement = document.createElement('div');
            listedAtElement.className = 'cm-helper-listed-at';
            listedAtElement.innerText = 'Listed: ' + relativeTimestamp;
            listedAtElement.title = formattedTimestamp || '';
            listedAtElement.style.color = 'gray';
            listedAtElement.style.fontSize = '0.8em';
            listedAtElement.style.marginTop = '0.25rem';
            listedAtElement.style.cursor = 'default';
            container.appendChild(listedAtElement);
        }
    }

    if (lastModifiedAt) {
        const formattedModified = formatArticleSaleTimestamp(lastModifiedAt);
        const relativeModified = formatRelativeArticleSaleTime(lastModifiedAt);
        if (relativeModified) {
            const modifiedAtElement = document.createElement('div');
            modifiedAtElement.className = 'cm-helper-modified-at';
            modifiedAtElement.innerText = 'Modified: ' + relativeModified;
            modifiedAtElement.title = formattedModified || '';
            modifiedAtElement.style.color = 'gray';
            modifiedAtElement.style.fontSize = '0.8em';
            modifiedAtElement.style.cursor = 'default';
            container.appendChild(modifiedAtElement);

            if (modificationComment) {
                const commentElement = document.createElement('div');
                commentElement.className = 'cm-helper-modification-comment';
                commentElement.innerText = modificationComment;
                commentElement.style.color = 'gray';
                commentElement.style.fontSize = '0.8em';
                commentElement.style.cursor = 'default';
                container.appendChild(commentElement);
            }
        }
    }
}

function extractArticleRowData(articleRow) {
    if (!articleRow) return null;
    
    const quantityEl = articleRow.querySelector('.item-count');
    const quantity = quantityEl ? quantityEl.textContent.trim() : null;
    
    const priceEl = articleRow.querySelector('.price-container .align-items-center span[class*="text-end"]');
    const price = priceEl ? priceEl.textContent.trim() : null;
    
    return { quantity, price };
}

function detectRowChanges(oldData, newData) {
    if (!oldData || !newData) return null;
    
    const changes = [];
    
    if (oldData.quantity !== newData.quantity) {
        changes.push(`qty ${oldData.quantity}→${newData.quantity}`);
    }
    if (oldData.price !== newData.price) {
        changes.push(`price ${oldData.price}→${newData.price}`);
    }
    
    return changes.length > 0 ? changes.join(', ') : null;
}

function checkPriceWithCardmarket(articleRow, mkmid, pricePromise) {
    var priceContainer = articleRow.querySelector(".price-container .flex-column");
    if (!priceContainer) {
        return;
    }
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
    if (element) {
        showThumbnail(element)
            .then(image => {
                if (!image) {
                    return;
                }

                const mkmId = image.getAttribute("mkmId");
                checkPriceWithCardmarket(articleRow, mkmId, pricePromise);
            })
            .catch((error) => {
                console.error('Error showing thumbnail:', error);
            });
    }

    const articleId = extractArticleId(articleRow.id);
    if (articleId) {
        Promise.all([
            getArticleSaleTimestamp(articleId),
            getArticleLastModified(articleId),
            getArticleModificationComment(articleId)
        ]).then(([listedAt, lastModifiedAt, comment]) => {
            appendArticleTimestamps(articleRow, listedAt, lastModifiedAt, comment);
        }).catch((error) => {
            console.error('Error loading article timestamps:', error);
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

function observeArticleRowModifications(table) {
    const knownArticleIds = new Set(
        Array.from(table.getElementsByClassName('article-row'))
            .map(row => extractArticleId(row.id))
            .filter(Boolean)
    );

    // Store old row data during removal so we can compare on addition
    const removedRowData = new Map();

    // Ignore mutations caused by our own initial DOM enrichment
    let initializing = true;
    setTimeout(() => { initializing = false; }, 2000);

    const observer = new MutationObserver((mutations) => {
        if (initializing) {
            return;
        }

        for (const mutation of mutations) {
            // First pass: capture old row data during removal
            for (const node of mutation.removedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                const id = extractArticleId(node.id);
                if (id && knownArticleIds.has(id)) {
                    const oldData = extractArticleRowData(node);
                    removedRowData.set(id, oldData);
                }
            }

            // Second pass: detect new rows and compare with removed data
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                const id = extractArticleId(node.id);
                if (id && removedRowData.has(id)) {
                    const oldData = removedRowData.get(id);
                    const newData = extractArticleRowData(node);
                    const changeComment = detectRowChanges(oldData, newData);
                    
                    const now = new Date().toISOString();
                    Promise.all([
                        saveArticleLastModified(id, now),
                        changeComment ? saveArticleModificationComment(id, changeComment) : Promise.resolve()
                    ])
                        .then(() => {
                            updateContentOfCard(node, pricePromise);
                        })
                        .catch(err => console.error('Error handling row modification:', err));
                    
                    removedRowData.delete(id);
                }
            }
        }
    });

    observer.observe(table, { childList: true, subtree: true });
}

function updateContent() {
    const table = document.getElementById("UserOffersTable"); // div
    if (!table) {
        return;
    }

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

    observeArticleRowModifications(table);
}

(async function main() {
    console.log("offers.js");
    updateContent();
})();
