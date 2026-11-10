function observeThumbnailChanges() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) {
                    continue;
                }

                const thumbnailIcons = [];
                if (node.matches('span.thumbnail-icon')) {
                    thumbnailIcons.push(node);
                }
                thumbnailIcons.push(...node.querySelectorAll('span.thumbnail-icon'));

                for (const thumbnailIcon of thumbnailIcons) {
                    showThumbnail(thumbnailIcon).catch((error) => {
                        console.error('Error showing thumbnail:', error);
                    });
                }
            }
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
}

(async function main() {
    console.log("show-thumbnail.js");
    observeThumbnailChanges();
    showThumbnails();
})();
