function parseCurrencyStringToDouble(currencyString) {
    const cleanedString = String(currencyString || '').replace(/[^\d,]/g, '');
    const result = parseFloat(cleanedString.replace(',', '.'));
    return Number.isNaN(result) ? null : result;
}

function getColorBasedOnPercentageRange(referencePrice, priceToCompare) {
    const lowerBound = referencePrice * 0.90;
    const upperBound = referencePrice * 1.10;

    if (priceToCompare < lowerBound) {
        return 'green';
    }
    if (priceToCompare <= upperBound) {
        return 'orange';
    }
    return 'red';
}

function getColorForLowPrice(lowPrice, offerPrice) {
    if (offerPrice <= lowPrice) {
        return 'green';
    }
    if (offerPrice <= lowPrice * 1.10) {
        return 'orange';
    }
    return 'red';
}

function normalizePriceGuides(priceGuides) {
    if (!priceGuides) {
        return {};
    }

    if (Array.isArray(priceGuides)) {
        return priceGuides.reduce((acc, entry) => {
            if (entry && entry.idProduct != null) {
                acc[String(entry.idProduct)] = entry;
            }
            return acc;
        }, {});
    }

    return priceGuides;
}

function normalizeProducts(products) {
    if (!products) {
        return {};
    }

    if (Array.isArray(products)) {
        return products.reduce((acc, entry) => {
            if (entry && entry.idProduct != null) {
                acc[String(entry.idProduct)] = entry;
            }
            return acc;
        }, {});
    }

    return products;
}

function getComparableMetrics(priceGuide) {
    if (!priceGuide) {
        return null;
    }

    const variants = [
        { suffix: '', low: priceGuide.low, avg: priceGuide.avg, trend: priceGuide.trend },
        { suffix: '-foil', low: priceGuide['low-foil'], avg: priceGuide['avg-foil'], trend: priceGuide['trend-foil'] },
        { suffix: '-holo', low: priceGuide['low-holo'], avg: priceGuide['avg-holo'], trend: priceGuide['trend-holo'] }
    ];

    return variants
        .filter((variant) => typeof variant.low === 'number' && Number.isFinite(variant.low) && variant.low > 0)
        .sort((a, b) => a.low - b.low)[0] || null;
}

function getProductGroupingKey(product) {
    if (!product) {
        return null;
    }

    if (product.idMetacard != null) {
        return String(product.idMetacard);
    }

    const name = String(product.enName || product.name || product.localizedName || '');
    const expansion = String(product.expansionName || product.setName || product.expansion || '');
    if (name && expansion) {
        return `${name}::${expansion}`;
    }
    return name || null;
}

function buildCheapestMetacardPriceIndex(priceGuides, productsById) {
    const cheapestByMetacard = {};

    for (const [idProduct, product] of Object.entries(productsById)) {
        const groupingKey = getProductGroupingKey(product);
        const comparableMetrics = groupingKey ? getComparableMetrics(priceGuides[idProduct]) : null;
        if (!comparableMetrics) {
            continue;
        }

        const currentCheapest = cheapestByMetacard[groupingKey];
        if (!currentCheapest || comparableMetrics.low < currentCheapest.low) {
            cheapestByMetacard[groupingKey] = {
                low: comparableMetrics.low,
                avg: comparableMetrics.avg,
                trend: comparableMetrics.trend,
                suffix: comparableMetrics.suffix,
                idProduct: idProduct
            };
        }
    }

    return cheapestByMetacard;
}

async function getAllPriceData() {
    const [gameData, accessoriesData, gameProductData, nonSinglesData, accessoriesProductData] = await Promise.all([
        getCachedCardmarketData(KEY_PRICEDATA),
        getCachedCardmarketData(KEY_PRICEDATA_ACCESSORIES),
        getCachedCardmarketData(KEY_PRODUCTDATA),
        getCachedCardmarketData(KEY_NON_SINGLES),
        getCachedCardmarketData(KEY_ACCESSORIES)
    ]);

    const allPriceGuides = {
        ...normalizePriceGuides(gameData && gameData.priceGuides),
        ...normalizePriceGuides(accessoriesData && accessoriesData.priceGuides)
    };
    const allProductsById = {
        ...normalizeProducts(gameProductData && gameProductData.products),
        ...normalizeProducts(nonSinglesData && nonSinglesData.products),
        ...normalizeProducts(accessoriesProductData && accessoriesProductData.products)
    };

    return {
        priceGuides: allPriceGuides,
        productsById: allProductsById,
        cheapestByMetacard: buildCheapestMetacardPriceIndex(allPriceGuides, allProductsById)
    };
}

function getPricesByMkmId(priceGuides, mkmId) {
    return priceGuides && mkmId ? priceGuides[String(mkmId)] || null : null;
}

function buildProductUrlById(idProduct) {
    if (!idProduct) {
        return null;
    }

    const pageLang = (document.documentElement.lang || 'en').split('-')[0];
    try {
        return `https://www.cardmarket.com/${pageLang}/${getGame()}/Products?idProduct=${encodeURIComponent(String(idProduct))}`;
    } catch (error) {
        return null;
    }
}

function getProductSetName(product) {
    if (!product || typeof product !== 'object') {
        return null;
    }
    return product.expansionName || product.setName || product.expansion || null;
}

function attachImmediateTooltip(element, text) {
    if (!element || !text) {
        return;
    }
    element.setAttribute('title', text);
    element.setAttribute('aria-label', text);
}