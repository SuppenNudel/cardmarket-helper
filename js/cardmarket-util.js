const LANG_POS_MAP = {
    "en": "-16px 0px",
    "fr": "-48px 0px",
    "de": "-80px 0px",
    "sp": "-112px 0px",
    "it": "-144px 0px",
    "zh_CN": "-176px 0px",
    "ja": "-208px 0px",
    "pt": "-240px 0px",
    "ru": "-272px 0px",
    "ko": "-304px 0px",
    "zh_TW": "-336px 0px"
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
    icon.style.borderRightWidth = "0px"
    icon.style.borderRightStyle = "solid";
    icon.style.marginTop = "1px";
    icon.style.marginBottom = "1px";
    icon.style.verticalAlign = "middle";
    return icon
}