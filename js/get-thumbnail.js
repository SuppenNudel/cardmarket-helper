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
        var result = await browser.storage.local.get(['thumbnail']);
        // Code to handle successful retrieval of data
    } catch (error) {
        // Code to handle any errors that occurred during the retrieval
        console.error('Error:', error);
    }
    const thumbnail = result.thumbnail;

    const thumbnailEnabled = Number(thumbnail) > 0;
    const imageHeight = thumbnailEnabled ? Number(thumbnail) : 150;
    const imageWidth = imageHeight / 1.4;

    theImage.height = imageHeight;
    theImage.width = imageWidth;

    if (thumbnailEnabled) {
        // Save the original icon markup once so it can be restored if the setting is disabled later.
        if (!thumbnailIcon.dataset.originalHtml) {
            thumbnailIcon.dataset.originalHtml = thumbnailIcon.innerHTML;
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

function getThumbnailImgTag(thumbnailIcon) {
    if (!thumbnailIcon) {
        return null;
    }

    return thumbnailIcon.title
        || thumbnailIcon.ariaLabel
        || thumbnailIcon.getAttribute("data-bs-title")
        || null;
}

function setThumbnailMkmId(thumbnailIcon) {
    const imgTag = getThumbnailImgTag(thumbnailIcon);
    const mkmId = extractMkmId(imgTag);
    if (!mkmId) {
        return null;
    }

    thumbnailIcon.setAttribute("mkmId", mkmId);
    return mkmId;
}

async function showThumbnail(thumbnailIcon) {
    const imgTag = getThumbnailImgTag(thumbnailIcon);
    const mkmId = setThumbnailMkmId(thumbnailIcon);
    const theImage = await changePreviewImage(thumbnailIcon, imgTag);
    if (mkmId) {
        theImage.setAttribute("mkmId", mkmId);
    }
    return theImage;
}

function restoreThumbnails() {
    for (const thumbnailIcon of document.querySelectorAll('span.thumbnail-icon')) {
        if (!thumbnailIcon.dataset.originalHtml) {
            continue;
        }

        thumbnailIcon.innerHTML = thumbnailIcon.dataset.originalHtml;

        // Reset injected styles.
        thumbnailIcon.classList.add('is-24x24');
        thumbnailIcon.style.display = '';
        thumbnailIcon.style.overflow = '';
        thumbnailIcon.style.height = '';
        thumbnailIcon.style.width = '';

        const parent = thumbnailIcon.closest('td, .col-thumbnail');
        if (parent) {
            parent.style.height = '';
            parent.style.minHeight = '';
            parent.style.width = '';
            parent.style.verticalAlign = '';
        }

        const row = thumbnailIcon.closest('tr');
        if (row) {
            row.style.height = '';
            row.style.minHeight = '';
        }
    }
}

(async function main() {
    console.log("get-thumbnail.js");

    for (const thumbnailIcon of iterateThumbnails()) {
        setThumbnailMkmId(thumbnailIcon);
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (!('thumbnail' in changes)) {
            return;
        }

        const nextValue = Number(changes.thumbnail.newValue);
        if (Number.isFinite(nextValue) && nextValue > 0) {
            showThumbnails();
        } else {
            restoreThumbnails();
        }
    });
})();
