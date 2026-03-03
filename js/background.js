// Background service worker for handling cross-origin requests
// This bypasses CORS restrictions that content scripts face in Manifest v3

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetch') {
        // Handle fetch requests from content scripts
        const fetchOptions = request.options || {};
        
        // Add default headers for external API calls
        if (!fetchOptions.headers) {
            fetchOptions.headers = {};
        }
        
        fetch(request.url, fetchOptions)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                console.error('Background fetch error:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        // Return true to indicate we'll send response asynchronously
        return true;
    }
});

console.log('Background service worker loaded');
