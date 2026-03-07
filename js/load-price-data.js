// Cardmarket data fetching - uses background script for centralized caching

const cardGames = {
    "Magic": 1,
    "YuGiOh": 3,
    "Pokemon": 6,
    "OnePiece": 18,
    "Lorcana": 19,
    "StarWarsUnlimited": 21,
    "FleshAndBlood": 16,
    "Digimon": 17,
    "DragonBallSuper": 13,
    "Vanguard": 8,
    "WeissSchwarz": 10,
    "BattleSpiritsSaga": 20,
    "FinalFantasy": 9,
    "FoW": 7,
    "WoW": 2,
    "StarWarsDestiny": 15,
    "Dragoborne": 11,
    "MyLittlePony": 12,
    "Spoils": 5
};

const KEY_PRICEDATA = 'pricedata';
const KEY_PRODUCTDATA = 'productdata';
const KEY_NON_SINGLES = 'nonsingles';

function getGame() {
    const gameHref = document.querySelector('#brand-gamesDD > a');
    if (!gameHref || !gameHref.href) {
        throw new Error("Could not determine game from page - game dropdown not found");
    }
    const parts = gameHref.href.split('/');
    const game = parts.pop();
    if (!game) {
        throw new Error("Could not extract game name from URL");
    }
    return game;
}

function getGameId(game) {
    if (!game) {
        throw new Error("Game parameter is missing or undefined");
    }
    if (game in cardGames) {
        return cardGames[game];
    } else {
        throw new Error(`Game "${game}" is not supported yet`);
    }
}

async function getCachedCardmarketData(key) {
    const game = getGame();
    
    try {
        const response = await browser.runtime.sendMessage({
            action: 'getCardmarketData',
            key: key,
            game: game
        });
        
        if (!response) {
            throw new Error('No response from background script');
        }
        
        if (response.success) {
            return response.data;
        } else {
            throw new Error(response.error || 'Unknown error from background script');
        }
    } catch (error) {
        console.error(`Error getting cached data for ${key}:`, error);
        return null;
    }
}

async function getCardmarketData() {
    const pricedata = await getCachedCardmarketData(KEY_PRICEDATA);
    const productdata = await getCachedCardmarketData(KEY_PRODUCTDATA);

    return [pricedata, productdata];
}

// Legacy functions kept for backwards compatibility (no longer used internally)
function getCardmarketDataUrl(key, gameId) {
    switch (key) {
        case KEY_PRICEDATA:
            return `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_${gameId}.json`;
        case KEY_PRODUCTDATA:
            return `https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_${gameId}.json`;
        case KEY_NON_SINGLES:
            return `https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_${gameId}.json`;
        default:
            break;
    }
}

function isDataOutdated(createdAt) {
    const cachedDate = new Date(createdAt);
    const currentDate = new Date();
    const timeDifference = currentDate - cachedDate;
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    return hoursDifference > 24;
}

function save(key, data) {
    const game = getGame();
    const objStr = key + game;
    const obj = { [objStr]: data };
    browser.storage.local.set(obj)
        .catch((error) => {
            console.error('Error saving data:', error);
        });
}