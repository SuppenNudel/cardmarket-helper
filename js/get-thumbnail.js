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
        const imageHeight = thumbnail ? Number(thumbnail) : 150;
        const imageWidth = imageHeight / 1.4;

        if (!thumbnail) {
            theImage.height = imageHeight;
            theImage.width = imageWidth;
        } else {
            theImage.height = imageHeight;
            theImage.width = imageWidth;
        }

        // Replace only the camera icon inside the thumbnailIcon span, keeping tooltip functionality
        thumbnailIcon.innerHTML = '';
        thumbnailIcon.appendChild(theImage);

        // Override Cardmarket's icon sizing so the wrapper grows with the injected image.
        thumbnailIcon.classList.remove('is-24x24');
        thumbnailIcon.style.display = 'inline-block';
        thumbnailIcon.style.overflow = 'visible';
        thumbnailIcon.style.height = `${imageHeight}px`;
        thumbnailIcon.style.width = `${imageWidth}px`;
        
        // Keep table or grid rows aligned to the custom thumbnail height.
        const parent = thumbnailIcon.closest('td, .col-thumbnail');
        if (parent) {
            parent.style.height = `${imageHeight}px`;
            parent.style.minHeight = `${imageHeight}px`;
            parent.style.width = '10rem';
            parent.style.verticalAlign = 'top';
        }

        const row = thumbnailIcon.closest('tr');
        if (row) {
            row.style.height = `${imageHeight}px`;
            row.style.minHeight = `${imageHeight}px`;
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
