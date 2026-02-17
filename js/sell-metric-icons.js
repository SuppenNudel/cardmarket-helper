(async function main() {
    console.log("sell-metric-icons.js")
    const listProductForm = document.querySelector("#ListProductForm");
    const idCondition = listProductForm.querySelector("#idCondition");

    const conditionParentDiv = idCondition?.closest("div");
    conditionParentDiv.classList.remove("col-md-7", "col-xl-8");
    conditionParentDiv.classList.add("col-md-8", "col-xl-8");

    const conditionLabel = listProductForm.querySelector('label[for="idCondition"]');
    conditionLabel.classList.remove("col-md-5", "col-xl-4");
    conditionLabel.classList.add("col-md-2", "col-xl-2");

    const conditionWrapperDiv = document.createElement("div");
    conditionWrapperDiv.classList.add("col", "col-md-2", "col-xl-2");
    conditionWrapperDiv.style.textAlign = "right";
    const badgeLink = createConditionIcon(parseInt(idCondition.value));
    conditionWrapperDiv.appendChild(badgeLink);
    
    const updateConditionBadge = () => {
        const conditionId = parseInt(idCondition.value);
        const short = CONDITION_ID_MAP_SHORT[conditionId] || "NM";
        const badgeSpan = badgeLink.querySelector("span");
        badgeSpan.textContent = short;
        badgeLink.className = `article-condition condition-${short.toLowerCase()} me-1`;
        badgeLink.dataset.bsOriginalTitle = short === "EX" ? "Excellent" : short;
    };
    idCondition.addEventListener("change", updateConditionBadge);
    idCondition.addEventListener("input", updateConditionBadge);

    conditionLabel.insertAdjacentElement("afterend", conditionWrapperDiv);
    
    const idLanguage = listProductForm.querySelector("#idLanguage");
    const languageParentDiv = idLanguage?.closest("div");
    languageParentDiv.classList.remove("col-md-7", "col-xl-8");
    languageParentDiv.classList.add("col-md-8", "col-xl-8");

    const languageLabel = listProductForm.querySelector('label[for="idLanguage"]');
    languageLabel.classList.remove("col-md-5", "col-xl-4");
    languageLabel.classList.add("col-md-2", "col-xl-2");

    const languageWrapperDiv = document.createElement("div");
    languageWrapperDiv.classList.add("col", "col-md-2", "col-xl-2");
    languageWrapperDiv.style.textAlign = "right";
    const langId = parseInt(idLanguage.value);
    const langCode = Object.keys(LANG_MAP).find(key => LANG_MAP[key] === langId) || "en";
    const languageIcon = createLanguageIcon(langCode);
    languageWrapperDiv.appendChild(languageIcon);
    
    const updateLanguageIcon = () => {
        const langId = parseInt(idLanguage.value);
        const langCode = Object.keys(LANG_MAP).find(key => LANG_MAP[key] === langId) || "en";
        languageIcon.style.backgroundPosition = LANG_POS_MAP[langCode];
    };
    idLanguage.addEventListener("change", updateLanguageIcon);
    idLanguage.addEventListener("input", updateLanguageIcon);

    languageLabel.insertAdjacentElement("afterend", languageWrapperDiv);
})();