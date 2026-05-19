// Helper function for content scripts to make cross-origin fetch requests
// via the background script (to bypass CORS in content scripts)

function isMissingReceiverError(error) {
    const message = String(error && error.message ? error.message : error || '');
    return message.includes('Receiving end does not exist') ||
        message.includes('Could not establish connection');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendFetchMessage(url, options) {
    return browser.runtime.sendMessage({
        action: 'fetch',
        url: url,
        options: options
    });
}

async function backgroundFetch(url, options = {}) {
    // Check if runtime is available
    if (!browser || !browser.runtime || !browser.runtime.sendMessage) {
        throw new Error('browser.runtime.sendMessage is not available. Extension context may be invalid.');
    }

    console.log('Sending message to background script for URL:', url);

    let response;
    try {
        response = await sendFetchMessage(url, options);
    } catch (error) {
        if (!isMissingReceiverError(error)) {
            console.error('backgroundFetch error for URL:', url, error);
            throw error;
        }

        // Firefox can briefly return no receiver after extension reload.
        await delay(300);
        response = await sendFetchMessage(url, options);
    }

    console.log('Received response from background script:', response);

    if (!response) {
        throw new Error('No response from background script. The background script may not be running.');
    }

    if (response.success) {
        return response.data;
    }

    throw new Error(response.error || 'Unknown error from background script');
}
