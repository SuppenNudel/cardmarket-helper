// language codes are what ManaBox uses in the csv export

// maps from ManaBox language codes to CSS background positions for Cardmarket language icons
const LANG_POS_MAP = {
    "en": "-16px 0px",
    "fr": "-32px 0px",
    "de": "-48px 0px",
    "es": "-64px 0px",
    "it": "-80px 0px",
    "zh_CN": "-96px 0px",
    "ja": "-112px 0px",
    "pt": "-128px 0px",
    "ru": "-144px 0px",
    "ko": "-160px 0px",
    "zh_TW": "-176px 0px"
}

// maps from ManaBox language codes to Cardmarket language IDs
const LANG_MAP = {
    "en": 1,
    "fr": 2,
    "de": 3,
    "es": 4,
    "it": 5,
    "zh_CN": 6,
    "ja": 7,
    "pt": 8,
    "ru": 9,
    "ko": 10,
    "zh_TW": 11
}

function createLanguageIcon(lang) {
    const icon = document.createElement('span');
    icon.style.display = "inline-block";
    icon.style.width = "16px";
    icon.style.height = "16px";
    icon.style.backgroundImage = "url('//static.cardmarket.com/img/1de15dd3f9a7fa49c1f2feb09a3608a5/spriteSheets/ssMain2.png')";
    icon.style.backgroundPosition = LANG_POS_MAP[lang];
    icon.style.paddingTop = "0px";
    icon.style.paddingRight = "0px";
    icon.style.borderRightWidth = "0px";
    icon.style.borderRightStyle = "solid";
    icon.style.marginTop = "1px";
    icon.style.marginBottom = "1px";
    icon.style.verticalAlign = "middle";
    return icon
}

const CONDITION_SHORT_MAP_ID = {
    "MT": 1,
    "NM": 2,
    "EX": 3,
    "GD": 4,
    "LP": 5,
    "PL": 6,
    "PO": 7
}

const CONDITION_MAP_ID = {
    "mint": 1,
    "near_mint": 2,
    "excellent": 3,
    "good": 4,
    "light_played": 5,
    "played": 6,
    "poor": 7
}

const CONDITION_MAP = {
    "mint": "MT",
    "near_mint": "NM",
    "excellent": "EX",
    "good": "GD",
    "light_played": "LP",
    "played": "PL",
    "poor": "PO"
}
