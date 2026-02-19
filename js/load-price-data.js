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

async function getCachedCardmarketData(key) {
    const game = getGame();

    const storageKey = key + game;
    const result = await browser.storage.local.get(storageKey);

    let data = result[storageKey];
    if (data == undefined) {
        data = await loadCardmarketData(key);
    } else {
        if (isDataOutdated(data.createdAt)) {
            data = await loadCardmarketData(key);
        }
    }
    return data;
}

async function loadCardmarketData(key) {
    const game = getGame();
    const gameId = getGameId(game);
    const url = getCardmarketDataUrl(key, gameId);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();

        let infoKey;
        switch (key) {
            case KEY_PRICEDATA:
                infoKey = 'priceGuides';
                break;
            case KEY_PRODUCTDATA:
                infoKey = 'products';
            default:
                break;
        }

        const dictionary = data[infoKey].reduce((acc, obj) => {
            acc[obj.idProduct] = obj;
            return acc;
        }, {});
        data[infoKey] = dictionary;

        save(key, data);
        return data;
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
}

function getGame() {
    const gameHref = document.querySelector('#brand-gamesDD > a');
    const parts = gameHref.href.split('/');
    const game = parts.pop();
    return game;
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

function isDataOutdated(createdAt) {
    // Parse the timestamp string into a Date object
    const cachedDate = new Date(createdAt);
    const currentDate = new Date();

    const timeDifference = currentDate - cachedDate; // Difference in milliseconds
    const hoursDifference = timeDifference / (1000 * 60 * 60); // Convert milliseconds to hours

    return hoursDifference > 24;
}

async function getCardmarketData() {
    const pricedata = await getCachedCardmarketData(KEY_PRICEDATA);
    const productdata = await getCachedCardmarketData(KEY_PRODUCTDATA);

    return [pricedata, productdata];
}