function extractArticleId(articleRowId) {
    if (typeof articleRowId !== 'string') {
        return null;
    }

    const match = articleRowId.match(/^(?:articleRow|stockRow)(\d+)$/);
    return match ? match[1] : null;
}

function isOwnStockOffersPage() {
    const pathname = window.location.pathname || '';
    return /\/Magic\/Stock\/Offers\//.test(pathname);
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

function appendArticleTimestamps(articleRow, listedAt, lastModifiedAt, modificationData) {
    if (!listedAt && !lastModifiedAt) {
        return;
    }

    const actionsContainer = articleRow.querySelector('.actions-container');
    if (!actionsContainer) {
        return;
    }

    // Remove old metadata elements so re-enrichment updates them cleanly
    articleRow.querySelectorAll('.cm-helper-listed-at, .cm-helper-modified-at, .cm-helper-modification-comment, .cm-helper-article-meta')
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

    const relativeLines = [];
    const titleParts = [];

    if (listedAt) {
        const formattedTimestamp = formatArticleSaleTimestamp(listedAt);
        const relativeTimestamp = formatRelativeArticleSaleTime(listedAt);
        if (relativeTimestamp) {
            relativeLines.push('Listed: ' + relativeTimestamp);
        }
        if (formattedTimestamp) {
            titleParts.push('Listed: ' + formattedTimestamp);
        }
    }

    if (lastModifiedAt) {
        const formattedModified = formatArticleSaleTimestamp(lastModifiedAt);
        const relativeModified = formatRelativeArticleSaleTime(lastModifiedAt);
        if (relativeModified) {
            relativeLines.push('Modified: ' + relativeModified);
        }
        if (formattedModified) {
            titleParts.push('Modified: ' + formattedModified);
        }
    }

    if (modificationData) {
        const summaryLines = Array.isArray(modificationData.summaryLines)
            ? modificationData.summaryLines.map((line) => String(line).trim()).filter(Boolean)
            : [];
        const detailLines = Array.isArray(modificationData.detailLines)
            ? modificationData.detailLines.map((line) => String(line).trim()).filter(Boolean)
            : [];

        if (summaryLines.length > 0) {
            relativeLines.push(...summaryLines);
        }
        if (detailLines.length > 0) {
            titleParts.push(...detailLines);
        }
    }

    if (relativeLines.length === 0) {
        return;
    }

    const metaElement = document.createElement('div');
    metaElement.className = 'cm-helper-article-meta';
    metaElement.innerText = relativeLines.join('\n');
    if (titleParts.length > 0) {
        metaElement.title = titleParts.join('\n');
    }
    metaElement.style.color = 'gray';
    metaElement.style.fontSize = '0.8em';
    metaElement.style.marginTop = '0.25rem';
    metaElement.style.cursor = 'default';
    metaElement.style.textAlign = 'right';
    const actionsWidth = actionsContainer.getBoundingClientRect().width;
    if (actionsWidth > 0) {
        metaElement.style.maxWidth = `${Math.floor(actionsWidth)}px`;
    }
    metaElement.style.whiteSpace = 'pre-line';
    metaElement.style.wordBreak = 'break-word';
    metaElement.style.overflowWrap = 'anywhere';
    wrapper.appendChild(metaElement);
}

function extractArticleRowData(articleRow) {
    if (!articleRow) return null;
    
    const quantityEl = articleRow.querySelector('.item-count');
    const quantity = quantityEl ? quantityEl.textContent.trim() : null;
    
    const priceEl = articleRow.querySelector('.price-container .align-items-center span[class*="text-end"]');
    const price = priceEl ? priceEl.textContent.trim() : null;

    const attributes = Array.from(articleRow.querySelectorAll('.product-attributes [aria-label], .product-attributes [title], .product-attributes [data-bs-original-title]'))
        .map((element) => (
            element.getAttribute('aria-label')
            || element.getAttribute('data-bs-original-title')
            || element.getAttribute('title')
            || ''
        ).trim())
        .filter(Boolean)
        .join('|');

    const commentWrapper = articleRow.querySelector('.product-comments');
    const comment = commentWrapper
        ? (
            commentWrapper.getAttribute('data-bs-original-title')
            || commentWrapper.getAttribute('title')
            || commentWrapper.textContent
            || ''
        ).trim().replace(/\s+/g, ' ')
        : null;
    
    return { quantity, price, attributes, comment };
}

function formatChangeValue(value) {
    const normalized = (value || '').trim().replace(/\s+/g, ' ');
    return normalized || '(none)';
}

function splitAttributeValues(value) {
    return new Set(
        String(value || '')
            .split('|')
            .map((entry) => entry.trim())
            .filter(Boolean)
    );
}

function getAttributeDiffDetail(oldValue, newValue) {
    const oldSet = splitAttributeValues(oldValue);
    const newSet = splitAttributeValues(newValue);

    const added = Array.from(newSet).filter((entry) => !oldSet.has(entry));
    const removed = Array.from(oldSet).filter((entry) => !newSet.has(entry));

    const parts = [];
    if (added.length > 0) {
        parts.push(`added: ${added.join(', ')}`);
    }
    if (removed.length > 0) {
        parts.push(`removed: ${removed.join(', ')}`);
    }

    return parts.join(' | ') || 'attributes changed';
}

function createModificationData(changes, details) {
    if (!changes || changes.length === 0) {
        return null;
    }

    return {
        summaryLines: changes,
        detailLines: details || []
    };
}

function detectRowChanges(oldData, newData) {
    if (!oldData || !newData) return null;
    
    const changes = [];
    const details = [];
    
    if (oldData.quantity !== newData.quantity) {
        changes.push(`qty ${oldData.quantity}→${newData.quantity}`);
    }
    if (oldData.price !== newData.price) {
        changes.push(`price ${oldData.price}→${newData.price}`);
    }
    if (oldData.attributes !== newData.attributes) {
        changes.push('attributes updated');
        details.push(`attributes: ${getAttributeDiffDetail(oldData.attributes, newData.attributes)}`);
    }
    if (oldData.comment !== newData.comment) {
        changes.push('comment updated');
        details.push(`comment: ${formatChangeValue(oldData.comment)} -> ${formatChangeValue(newData.comment)}`);
    }
    
    return createModificationData(changes, details);
}

function checkPriceWithCardmarket(articleRow, mkmid, pricePromise) {
    var priceContainer = articleRow.querySelector(".price-container .flex-column");
    if (!priceContainer) {
        return;
    }
    priceContainer.parentNode.style.width = "fit-content";
    if(!mkmid) {
        const noMkmIdDiv = document.createElement("div");
        priceContainer.appendChild(noMkmIdDiv);
        noMkmIdDiv.innerText = "no mkm id";
        return;
    }
    pricePromise.then(result => {
        if (!result || !result.priceGuides) {
            // Price data unavailable (network error or missing cache)
            return;
        }
        
        const marketData = result;
        const prices = getPricesByMkmId(marketData.priceGuides, mkmid);

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
    
        const suffix = foilElement ? '-foil' : holoElement ? '-holo' : '';
        const low = prices[`low${suffix}`];
        const avg = prices[`avg${suffix}`];
        const trend = prices[`trend${suffix}`];
        
        // Select the offer price span specifically from the .align-items-center div, not the shipping cost span
        const offerElement = priceContainer.querySelector('.align-items-center span[class*="text-end"]');
        const currStr = offerElement.innerText;
        const offer = parseCurrencyStringToDouble(currStr);

        // Keep helper metrics anchored inside the Angebot price column.
        priceContainer.style.alignItems = "flex-end";
        priceContainer.style.textAlign = "right";
    
        const currentProduct = marketData.productsById ? marketData.productsById[String(mkmid)] : null;
        const isNonSingle = !currentProduct || !currentProduct.idMetacard;

        const metricsWrapper = document.createElement("div");
        metricsWrapper.style.display = "grid";
        metricsWrapper.style.columnGap = "10px";
        metricsWrapper.style.rowGap = "2px";
        metricsWrapper.style.marginTop = "4px";
        metricsWrapper.style.marginLeft = "auto";
        metricsWrapper.style.justifyContent = "end";
        metricsWrapper.style.alignSelf = "flex-end";
        metricsWrapper.style.textAlign = "left";

        // For non-singles, only show single column; for singles, show two columns
        if (isNonSingle) {
            metricsWrapper.style.gridTemplateColumns = "max-content";
        } else {
            metricsWrapper.style.gridTemplateColumns = "max-content max-content";
        }

        priceContainer.appendChild(metricsWrapper);

        const exactHeader = document.createElement("div");
        exactHeader.textContent = "Printing";
        exactHeader.style.fontWeight = "600";
        exactHeader.style.fontSize = "0.8em";
        metricsWrapper.appendChild(exactHeader);

        const exactLines = document.createElement("div");
        exactLines.style.fontSize = "0.9em";
        exactLines.style.textAlign = "left";

        function appendMetricLine(container, icon, value, color) {
            const line = document.createElement("div");
            if (typeof value === 'number' && Number.isFinite(value)) {
                line.innerText = `${icon} ${value.toFixed(2)}`;
                if (color) {
                    line.style.color = color;
                }
            } else {
                line.innerText = `${icon} -`;
                line.style.color = "gray";
            }
            container.appendChild(line);
        }

        appendMetricLine(exactLines, "⬇️", low, low ? getColorForLowPrice(low, offer) : null);
        appendMetricLine(exactLines, "↔️", avg, avg ? getColorBasedOnPercentageRange(avg, offer) : null);
        appendMetricLine(exactLines, "📈", trend, trend ? getColorBasedOnPercentageRange(trend, offer) : null);

        metricsWrapper.appendChild(exactLines);

        // Only add cheapest column for singles
        if (!isNonSingle) {
            const metacardId = currentProduct ? getProductGroupingKey(currentProduct) : null;
            const cheapestMetaPrice = metacardId ? marketData.cheapestByMetacard[metacardId] : null;
            const isCurrentPrintingCheapest = cheapestMetaPrice && String(cheapestMetaPrice.idProduct) === String(mkmid);
            const cheapestProduct = cheapestMetaPrice && marketData.productsById
                ? marketData.productsById[String(cheapestMetaPrice.idProduct)]
                : null;
            const cheapestProductSetName = getProductSetName(cheapestProduct)
                ? String(getProductSetName(cheapestProduct))
                : null;
            const cheapestProductUrl = cheapestMetaPrice ? buildProductUrlById(cheapestMetaPrice.idProduct) : null;

            const cheapestHeader = document.createElement("div");
            cheapestHeader.style.fontWeight = "600";
            cheapestHeader.style.fontSize = "0.8em";

            const cheapestHeaderLabel = cheapestProductSetName
                ? `Cheapest\n${cheapestProductSetName}`
                : "Cheapest";

            if (cheapestProductUrl && !isCurrentPrintingCheapest) {
                const cheapestLink = document.createElement("a");
                cheapestLink.href = cheapestProductUrl;
                cheapestLink.target = "_blank";
                cheapestLink.rel = "noopener noreferrer";
                cheapestLink.textContent = cheapestHeaderLabel;
                cheapestLink.style.whiteSpace = "pre-line";
                cheapestLink.style.lineHeight = "1.2";
                if (cheapestProductSetName) {
                    attachImmediateTooltip(cheapestLink, cheapestProductSetName);
                }
                cheapestHeader.appendChild(cheapestLink);
            } else {
                cheapestHeader.textContent = cheapestHeaderLabel;
                cheapestHeader.style.whiteSpace = "pre-line";
                cheapestHeader.style.lineHeight = "1.2";
                if (cheapestProductSetName) {
                    attachImmediateTooltip(cheapestHeader, cheapestProductSetName);
                }
            }
            metricsWrapper.appendChild(cheapestHeader);

            const cheapestLines = document.createElement("div");
            cheapestLines.style.fontSize = "0.9em";
            cheapestLines.style.textAlign = "left";

            if (isCurrentPrintingCheapest) {
                const samePrintingLine = document.createElement("div");
                samePrintingLine.innerText = "this printing";
                samePrintingLine.style.color = "gray";
                samePrintingLine.style.fontStyle = "italic";
                cheapestLines.appendChild(samePrintingLine);
            } else {
                const cheapestLow = cheapestMetaPrice && typeof cheapestMetaPrice.low === 'number' ? cheapestMetaPrice.low : null;
                const cheapestAvg = cheapestMetaPrice && typeof cheapestMetaPrice.avg === 'number' ? cheapestMetaPrice.avg : null;
                const cheapestTrend = cheapestMetaPrice && typeof cheapestMetaPrice.trend === 'number' ? cheapestMetaPrice.trend : null;

                appendMetricLine(cheapestLines, "⬇️", cheapestLow, cheapestLow ? getColorForLowPrice(cheapestLow, offer) : null);
                appendMetricLine(cheapestLines, "↔️", cheapestAvg, cheapestAvg ? getColorBasedOnPercentageRange(cheapestAvg, offer) : null);
                appendMetricLine(cheapestLines, "📈", cheapestTrend, cheapestTrend ? getColorBasedOnPercentageRange(cheapestTrend, offer) : null);
            }

            metricsWrapper.appendChild(cheapestLines);
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
            getArticleModificationData(articleId)
        ]).then(([listedAt, lastModifiedAt, modificationData]) => {
            appendArticleTimestamps(articleRow, listedAt, lastModifiedAt, modificationData);
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

function getArticleRowsInNode(node) {
    if (!(node instanceof HTMLElement)) {
        return [];
    }

    const rows = [];
    if (node.matches('.article-row')) {
        rows.push(node);
    }
    rows.push(...node.querySelectorAll('.article-row'));
    return rows;
}

function observeArticleRowModifications(table) {
    const trackModifications = isOwnStockOffersPage();
    const knownArticleIds = new Set(
        Array.from(table.getElementsByClassName('article-row'))
            .map(row => extractArticleId(row.id))
            .filter(Boolean)
    );

    const removedRowData = new Map();

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.removedNodes) {
                for (const row of getArticleRowsInNode(node)) {
                    const id = extractArticleId(row.id);
                    if (trackModifications && id && knownArticleIds.has(id)) {
                        removedRowData.set(id, extractArticleRowData(row));
                    }
                }
            }

            for (const node of mutation.addedNodes) {
                for (const row of getArticleRowsInNode(node)) {
                    const id = extractArticleId(row.id);
                    if (trackModifications && id && removedRowData.has(id)) {
                        const oldData = removedRowData.get(id);
                        const newData = extractArticleRowData(row);
                        const changeData = detectRowChanges(oldData, newData);

                        removedRowData.delete(id);
                        Promise.all([
                            saveArticleLastModified(id, new Date().toISOString()),
                            changeData ? saveArticleModificationData(id, changeData) : Promise.resolve()
                        ])
                            .then(() => updateContentOfCard(row, pricePromise))
                            .catch(err => console.error('Error handling row modification:', err));
                    } else {
                        updateContentOfCard(row, pricePromise);
                    }
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
    console.debug("offers.js");
    updateContent();
})();
