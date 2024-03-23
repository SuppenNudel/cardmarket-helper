console.log("get-thumbnail.js");

rot90 = ["split"];
rot270 = ["art_series"];

function changePreviewImage(thumbnailIcon, imgTag) {
    // Create a new DOMParser
    var parser = new DOMParser();
    // Parse the HTML string to create a Document
    var doc = parser.parseFromString(imgTag, 'text/html');
    // Access the created element
    var theImage = doc.body.firstChild;
    theImage.height = 150;

    const parent = thumbnailIcon.parentNode;

    parent.innerHTML = '';
    parent.appendChild(theImage);
    parent.style.width = "10.0rem";

    return theImage;
}

function* iterateThumbnails() {
    let thumbnailIcons = document.querySelectorAll("span.thumbnail-icon");
    for (let thumbnailIcon of thumbnailIcons) {
        yield thumbnailIcon;
    }
}

function showThumbnail(thumbnailIcon) {
    let imgTag = thumbnailIcon.title;
    if(!imgTag) {
        imgTag = thumbnailIcon.ariaLabel;
    }
    var matches = imgTag.match(/(\d+)\.jpg/);
    if (matches) {
        var mkmId = matches[1];
    }
    const theImage = changePreviewImage(thumbnailIcon, imgTag);
    if(mkmId) {
        theImage.setAttribute("mkmId", mkmId);
    }
    return theImage;
}

async function getScryfallCardFromImage(theImage) {
    const mkmId = theImage.getAttribute("mkmId");
    if(!mkmId) {
        return null;
    }
    const card = await cardByMkmId(mkmId);
    if(card.details) {
        console.log(card.details, mkmId);
        return;
    }

    if(rot90.includes(card.layout) && !card.keywords.includes('Aftermath')) {
        theImage.style = "transform: rotate(90deg);";
    } else if(rot270.includes(card.layout)) {
        theImage.style = "transform: rotate(270deg);";
    }

    return card;
}
