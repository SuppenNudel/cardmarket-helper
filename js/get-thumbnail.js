function showThumbnails() {
    const gen = iterateThumbnails();
    while(true) {
        const element = gen.next();
        if(element.done) {
            break
        }
        showThumbnail(element.value);
    }
}

async function changePreviewImage(thumbnailIcon, imgTag) {
    // Create a new DOMParser
    var parser = new DOMParser();
    // Parse the HTML string to create a Document
    var doc = parser.parseFromString(imgTag, 'text/html');
    // Access the created element
    var theImage = doc.body.firstChild;

    // Retrieve data from local storage
    try {
        var result = await browser.storage.sync.get(['thumbnail']);
        // Code to handle successful retrieval of data
    } catch (error) {
        // Code to handle any errors that occurred during the retrieval
        console.error('Error:', error);
    }
    const thumbnail = result.thumbnail;

    if (thumbnail != 0) {
        if (!thumbnail) {
            theImage.height = 150;
            theImage.width = 150 / 1.4;
        } else {
            theImage.height = thumbnail;
            theImage.width = thumbnail / 1.4;
        }

        // Replace only the camera icon inside the thumbnailIcon span, keeping tooltip functionality
        thumbnailIcon.innerHTML = '';
        thumbnailIcon.appendChild(theImage);
        
        // Set height and width on the parent .col-thumbnail to show the full image
        const parent = thumbnailIcon.closest('.col-thumbnail');
        if (parent) {
            parent.style.height = thumbnail ? `${thumbnail}px` : "150px";
            parent.style.width = "10rem";
        }
    }

    return theImage;
}

function* iterateThumbnails() {
    let thumbnailIcons = document.querySelectorAll("span.thumbnail-icon");
    for (let thumbnailIcon of thumbnailIcons) {
        yield thumbnailIcon;
    }
}

function extractMkmId(imgTag) {
    if (!imgTag) {
        return null;
    }

    // Prefer the image src URL when an <img ...> tag is provided.
    const srcMatch = imgTag.match(/src\s*=\s*["']([^"']+)["']/i);
    const source = srcMatch ? srcMatch[1] : imgTag;

    // Capture the numeric filename just before the extension, e.g. /294805.jpg -> 294805
    const fileMatch = source.match(/\/(\d+)\.[^\/.?]+(?:\?|$)/);
    return fileMatch ? fileMatch[1] : null;
}

async function showThumbnail(thumbnailIcon) {
    let imgTag = thumbnailIcon.title;
    if (!imgTag) {
        imgTag = thumbnailIcon.ariaLabel;
    }
    if (!imgTag) {
        imgTag = thumbnailIcon.getAttribute("data-bs-title");
    }
    const mkmId = extractMkmId(imgTag);
    const theImage = await changePreviewImage(thumbnailIcon, imgTag);
    if (mkmId) {
        theImage.setAttribute("mkmId", mkmId);
    }
    return theImage;
}

(async function main() {
    console.log("get-thumbnail.js");
})();
