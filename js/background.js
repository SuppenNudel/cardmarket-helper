// Background script for cross-origin network requests from content scripts

console.log('Background script loading...');

// Check required permissions on startup
async function checkPermissions() {
    const required = [
        'https://api.scryfall.com/*',
        'https://downloads.s3.cardmarket.com/*',
        'https://raw.githubusercontent.com/*'
    ];
    
    for (const origin of required) {
        const hasPermission = await browser.permissions.contains({ origins: [origin] });
        if (!hasPermission) {
            console.error(`Background: Missing required permission for ${origin}`);
            console.error('Please grant permissions in about:addons → Cardmarket Helper → Permissions');
            return false;
        }
    }
    
    console.log('Background: All required permissions granted');
    return true;
}

checkPermissions();

async function fetchJson(url, options = {}) {
    console.log('Background: Starting fetch for:', url);
    
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            mode: 'cors',
            credentials: 'omit',
            cache: 'default'
        });
        
        console.log('Background: Fetch completed, status:', response.status);
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Background: Fetch failed:', error);
        
        // Check if it's a permission issue
        if (error.message && error.message.includes('CORS')) {
            const urlObj = new URL(url);
            const hasPermission = await browser.permissions.contains({ 
                origins: [`${urlObj.protocol}//${urlObj.host}/*`] 
            });
            
            if (!hasPermission) {
                throw new Error(`Missing permission for ${urlObj.host}. Please grant permissions in about:addons.`);
            }
        }
        
        throw error;
    }
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background: Received message:', request && request.action);

    if (!request || request.action !== 'fetch') {
        return false;
    }

    console.log('Background: Received fetch request for:', request.url);

    fetchJson(request.url, request.options || {})
        .then(data => {
            console.log('Background: Sending success response for:', request.url);
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('Background fetch error for', request.url, ':', error);
            sendResponse({ success: false, error: error.message || String(error) });
        });

    // Keep the message channel open for async response.
    return true;
});

console.log('Background script loaded and message listener registered');
