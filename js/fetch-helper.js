// Helper function for content scripts to make cross-origin fetch requests
// via the background service worker (to bypass CORS in Manifest v3)

async function backgroundFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        browser.runtime.sendMessage(
            {
                action: 'fetch',
                url: url,
                options: options
            },
            (response) => {
                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response.error));
                }
            }
        );
    });
}
