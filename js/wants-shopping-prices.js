function normalizeLookupText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildProductNameLookup(productsById) {
    const byNameAndSet = {};
    const byNameOnly = {};

    for (const [productId, product] of Object.entries(productsById || {})) {
        const name = normalizeLookupText(product && (product.enName || product.name || product.localizedName));
        if (!name) {
            continue;
        }

        const set = normalizeLookupText(getProductSetName(product));
        const nameAndSet = `${name}::${set}`;
        (byNameAndSet[nameAndSet] || (byNameAndSet[nameAndSet] = [])).push(String(productId));
        (byNameOnly[name] || (byNameOnly[name] = [])).push(String(productId));
    }

    return { byNameAndSet, byNameOnly };
}

function getProductIdFromPageRow(row) {
    const directId = row.getAttribute('data-product-id') || row.dataset.productId;
    if (directId) {
        return String(directId).trim();
    }

    const nestedProduct = row.querySelector('[data-product-id]');
    if (nestedProduct && nestedProduct.getAttribute('data-product-id')) {
        return nestedProduct.getAttribute('data-product-id').trim();
    }

    const thumbnail = row.querySelector('[mkmid], .thumbnail-icon');
    if (thumbnail) {
        const id = thumbnail.getAttribute('mkmid');
        if (id) {
            return id;
        }

        const imageMarkup = thumbnail.getAttribute('title')
            || thumbnail.getAttribute('aria-label')
            || thumbnail.getAttribute('data-bs-title')
            || '';
        const imageMatch = imageMarkup.match(/\/(\d+)\.[^\/?"']+/);
        if (imageMatch) {
            return imageMatch[1];
        }
    }

    for (const link of row.querySelectorAll('a[href]')) {
        try {
            const id = new URL(link.href, window.location.origin).searchParams.get('idProduct');
            if (id) {
                return id;
            }
        } catch (error) {
            // Ignore malformed page links.
        }
    }

    return null;
}

function getPageRowNameAndSet(row) {
    const nameElement = row.querySelector('.card-name, [data-bs-original-title][data-bs-toggle="tooltip"], td:nth-child(4)');
    const setElement = row.querySelector('.expansion-symbol[aria-label], .expansion-symbol[data-bs-original-title], td:nth-child(5) [aria-label]');
    return {
        name: nameElement
            ? nameElement.getAttribute('data-bs-original-title') || nameElement.textContent
            : '',
        set: setElement
            ? setElement.getAttribute('aria-label') || setElement.getAttribute('data-bs-original-title') || setElement.textContent
            : ''
    };
}

function chooseProductId(candidates, priceGuides) {
    const withPrices = candidates.filter((id) => getPricesByMkmId(priceGuides, id));
    return (withPrices.length ? withPrices : candidates)
        .slice()
        .sort((a, b) => Number(a) - Number(b))[0] || null;
}

function resolvePageRowProductId(row, priceData) {
    const directId = getProductIdFromPageRow(row);
    if (directId) {
        return directId;
    }

    const { name, set } = getPageRowNameAndSet(row);
    const nameKey = normalizeLookupText(name);
    if (!nameKey) {
        return null;
    }

    const setKey = normalizeLookupText(set);
    const exactCandidates = priceData.productLookup.byNameAndSet[`${nameKey}::${setKey}`] || [];
    return chooseProductId(exactCandidates, priceData.priceGuides)
        || chooseProductId(priceData.productLookup.byNameOnly[nameKey] || [], priceData.priceGuides);
}

function findPageRowPriceContainer(row) {
    return row.querySelector('.price-container .flex-column, .price-container, td.price, .col-offer, td.text-end:last-child, td:last-child');
}

function getPageRowOfferPrice(priceContainer) {
    if (!priceContainer) {
        return null;
    }

    const offerElement = priceContainer.querySelector(
        '.align-items-center span[class*="text-end"], .align-items-center .fw-bold, span[class*="text-end"], .fw-bold, .price'
    ) || priceContainer;
    return parseCurrencyStringToDouble(offerElement.textContent);
}

function getPageRowPriceSuffix(row) {
    const foilLabel = row.querySelector('[aria-label="Foil"], [title="Foil"]');
    if (foilLabel) {
        return '-foil';
    }

    const foilCell = row.querySelector('.ternary-header .visually-hidden, td.foil .visually-hidden');
    if (foilCell && foilCell.textContent.trim().toUpperCase() === 'Y') {
        return '-foil';
    }

    const holoLabel = row.querySelector('[aria-label*="Holo"], [title*="Holo"]');
    return holoLabel ? '-holo' : '';
}

function createPageMetric(label, value, color) {
    const line = document.createElement('div');
    const formattedValue = typeof value === 'number' && Number.isFinite(value)
        ? value.toFixed(2)
        : '-';
    line.append(document.createTextNode(`${label} `));

    const price = document.createElement('span');
    price.textContent = formattedValue;
    price.style.color = color || (formattedValue === '-' ? 'gray' : '');
    line.appendChild(price);
    return line;
}

function appendPriceColumn(wrapper, heading, metrics, setName, productId, offerPrice) {
    const column = document.createElement('div');
    column.style.minWidth = '4.5rem';

    const title = document.createElement(productId ? 'a' : 'div');
    title.textContent = heading;
    title.style.fontWeight = '600';
    title.style.fontSize = '0.8em';
    if (setName) {
        title.title = setName;
    }
    if (title instanceof HTMLAnchorElement) {
        title.href = buildProductUrlById(productId);
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
    }
    column.appendChild(title);

    const suffix = metrics && metrics.suffix ? metrics.suffix : '';
    const low = metrics ? metrics.low ?? metrics[`low${suffix}`] : null;
    const avg = metrics ? metrics.avg ?? metrics[`avg${suffix}`] : null;
    const trend = metrics ? metrics.trend ?? metrics[`trend${suffix}`] : null;
    const canCompare = typeof offerPrice === 'number' && Number.isFinite(offerPrice);
    column.append(
        createPageMetric('LOW', low, canCompare && low ? getColorForLowPrice(low, offerPrice) : null),
        createPageMetric('AVG', avg, canCompare && avg ? getColorBasedOnPercentageRange(avg, offerPrice) : null),
        createPageMetric('TREND', trend, canCompare && trend ? getColorBasedOnPercentageRange(trend, offerPrice) : null)
    );
    wrapper.appendChild(column);
}

function addPriceInfoToPageRow(row, priceData, isWizardResults) {
    const productId = resolvePageRowProductId(row, priceData);
    if (!productId || row.dataset.cmPriceInfoProductId === productId) {
        return false;
    }

    const priceContainer = isWizardResults ? findPageRowPriceContainer(row) : null;
    const insertionPoint = priceContainer
        || row.querySelector('td.name, .product-name, .name, .product-info')
        || (row.matches('tr') ? row.querySelector('td') : row);
    if (!insertionPoint) {
        return false;
    }
    let wrapper = row.querySelector('.cm-helper-price-info');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'cm-helper-price-info';
        wrapper.style.display = 'grid';
        wrapper.style.gridTemplateColumns = 'max-content max-content';
        wrapper.style.columnGap = '10px';
        wrapper.style.rowGap = '2px';
        wrapper.style.marginTop = '4px';
        wrapper.style.fontSize = '0.9em';
        insertionPoint.appendChild(wrapper);
    } else {
        wrapper.replaceChildren();
    }

    if (priceContainer) {
        priceContainer.style.alignItems = 'flex-end';
        priceContainer.style.textAlign = 'right';
    }

    const priceGuide = getPricesByMkmId(priceData.priceGuides, productId);
    const suffix = getPageRowPriceSuffix(row);
    const exactMetrics = priceGuide ? {
        low: priceGuide[`low${suffix}`],
        avg: priceGuide[`avg${suffix}`],
        trend: priceGuide[`trend${suffix}`]
    } : null;
    const offerPrice = getPageRowOfferPrice(priceContainer);
    appendPriceColumn(wrapper, 'Printing', exactMetrics, null, null, offerPrice);

    const product = priceData.productsById[String(productId)];
    const groupingKey = getProductGroupingKey(product);
    const cheapest = groupingKey ? priceData.cheapestByMetacard[groupingKey] : null;
    if (product && product.idMetacard != null) {
        const cheapestProduct = cheapest && priceData.productsById[String(cheapest.idProduct)];
        const setName = getProductSetName(cheapestProduct);
        const isCurrentPrintingCheapest = cheapest && String(cheapest.idProduct) === String(productId);
        appendPriceColumn(
            wrapper,
            isCurrentPrintingCheapest ? 'Cheapest (this printing)' : 'Cheapest',
            cheapest,
            setName,
            isCurrentPrintingCheapest ? null : cheapest && cheapest.idProduct,
            offerPrice
        );
    }

    row.dataset.cmPriceInfoProductId = productId;
    return true;
}

function getPriceInfoRows(root) {
    const selector = 'table tbody tr, #UserOffersTable .article-row, [data-product-id], .product-row';
    const rows = [];
    if (root instanceof HTMLElement && root.matches(selector)) {
        rows.push(root);
    }
    if (root.querySelectorAll) {
        rows.push(...root.querySelectorAll(selector));
    }
    return rows;
}

let wizardRelayoutTimer = null;

function requestWizardRelayout(attempt = 0) {
    if (wizardRelayoutTimer) {
        clearTimeout(wizardRelayoutTimer);
    }

    wizardRelayoutTimer = setTimeout(() => {
        wizardRelayoutTimer = null;
        const containers = new Set(document.querySelectorAll('[data-masonry], .masonry, .masonry-grid, .js-masonry'));
        document.querySelectorAll('.detailed-result-card').forEach((card) => {
            const resultGrid = card.closest('.row');
            if (resultGrid) {
                containers.add(resultGrid);
            }
        });

        let masonryFound = false;
        containers.forEach((container) => {
            try {
                const masonry = window.Masonry && typeof window.Masonry.data === 'function'
                    ? window.Masonry.data(container)
                    : null;
                if (masonry) {
                    masonryFound = true;
                    if (typeof masonry.reloadItems === 'function') {
                        masonry.reloadItems();
                    }
                    if (typeof masonry.layout === 'function') {
                        masonry.layout();
                    }
                }
                requestAnimationFrame(() => {
                    const containerTop = container.getBoundingClientRect().top;
                    const itemBottom = Array.from(container.children).reduce((bottom, item) =>
                        Math.max(bottom, item.getBoundingClientRect().bottom - containerTop), 0);
                    if (itemBottom > 0) {
                        container.style.height = `${itemBottom}px`;
                    }
                });
            } catch (error) {
                console.warn('Shopping Wizard layout refresh failed:', error);
            }
        });
        window.dispatchEvent(new Event('resize'));
        if (!masonryFound && attempt < 12) {
            requestWizardRelayout(attempt + 1);
        }
    }, attempt === 0 ? 80 : 150);
}

const observedWizardCards = new WeakSet();
let wizardCardResizeObserver = null;

function observeWizardCardSizes() {
    if (!window.ResizeObserver) {
        return;
    }

    if (!wizardCardResizeObserver) {
        wizardCardResizeObserver = new ResizeObserver(() => requestWizardRelayout());
    }

    document.querySelectorAll('.detailed-result-card').forEach((card) => {
        if (!observedWizardCards.has(card)) {
            observedWizardCards.add(card);
            wizardCardResizeObserver.observe(card);
        }
    });
}

(async function addWantsAndWizardPriceInfo() {
    try {
        const priceData = await getAllPriceData();
        priceData.productLookup = buildProductNameLookup(priceData.productsById);
        const isWizardResults = /\/Wants\/ShoppingWizard\/Results(?:\/|$)/i.test(window.location.pathname);
        const renderRows = (root) => {
            const rows = getPriceInfoRows(root);
            let addedPriceInfo = false;
            rows.forEach((row) => {
                addedPriceInfo = addPriceInfoToPageRow(row, priceData, isWizardResults) || addedPriceInfo;
            });
            if (isWizardResults && addedPriceInfo) {
                requestWizardRelayout();
            }
            if (isWizardResults) {
                observeWizardCardSizes();
            }
        };
        renderRows(document);

        const observer = new MutationObserver((mutations) => {
            renderRows(document);

            const thumbnailWasInserted = mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) =>
                node instanceof HTMLElement && node.matches('img') && node.closest('.thumbnail-icon')
            ));
            if (isWizardResults && thumbnailWasInserted) {
                requestWizardRelayout();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
        console.error('Could not add Cardmarket price info to wants or shopping wizard:', error);
    }
})();