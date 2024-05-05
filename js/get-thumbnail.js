rot90 = ["split"];
rot270 = ["art_series"];

async function changePreviewImage(thumbnailIcon, imgTag) {
    // Create a new DOMParser
    var parser = new DOMParser();
    // Parse the HTML string to create a Document
    var doc = parser.parseFromString(imgTag, 'text/html');
    // Access the created element
    var theImage = doc.body.firstChild;

    // Retrieve data from local storage
    try {
        var result = await browser.storage.local.get(['thumbnail']);
        // Code to handle successful retrieval of data
    } catch (error) {
        // Code to handle any errors that occurred during the retrieval
        console.error('Error:', error);
    }
    const thumbnail = result.thumbnail;

    if (thumbnail != 0) {
        if (!thumbnail) {
            theImage.height = 150;
        } else {
            theImage.height = thumbnail;
        }

        const parent = thumbnailIcon.parentNode;

        parent.innerHTML = '';
        parent.appendChild(theImage);
        parent.style.width = "10.0rem";
    }

    return theImage;
}

function* iterateThumbnails() {
    let thumbnailIcons = document.querySelectorAll("span.thumbnail-icon");
    for (let thumbnailIcon of thumbnailIcons) {
        yield thumbnailIcon;
    }
}

async function showThumbnail(thumbnailIcon) {
    let imgTag = thumbnailIcon.title;
    if (!imgTag) {
        imgTag = thumbnailIcon.ariaLabel;
    }
    var matches = imgTag.match(/(\d+)\.jpg/);
    if (matches) {
        var mkmId = matches[1];
    }
    const theImage = await changePreviewImage(thumbnailIcon, imgTag);
    if (mkmId) {
        theImage.setAttribute("mkmId", mkmId);
    }
    return theImage;
}

async function getScryfallCardFromImage(theImage) {
    const mkmId = theImage.getAttribute("mkmId");
    if (!mkmId) {
        return null;
    }
    const card = await cardByMkmId(mkmId);
    if (card.details) {
        console.log(card.details, mkmId);
        return;
    }

    if (rot90.includes(card.layout) && !card.keywords.includes('Aftermath')) {
        theImage.style = "transform: rotate(90deg);";
    } else if (rot270.includes(card.layout)) {
        theImage.style = "transform: rotate(270deg);";
    }

    return card;
}


(async function main() {
    console.log("get-thumbnail.js");
})();
