async function initStorage(storageKey, defaultValue) {
    try {
        let storageData = await browser.storage.local.get(storageKey);

        // if key doesn't hold data yet
        if(!storageData[storageKey] ||  Object.keys(storageData[storageKey]).length === 0) {
            storageData[storageKey] = defaultValue;
            await browser.storage.local.set({ storageKey: storageData[storageKey] });
        }
        return storageData[storageKey];
    } catch (error) {
        console.error(`Error when init control ${storageKey}:`, error);
    }
}

async function initFormats() {
    try {
        // Retrieve the 'formats' object from storage.local
        let storageData = await browser.storage.local.get('formats');

        // If 'formats' object doesn't exist yet or is empty, initialize it with default values
        if (!storageData.formats || Object.keys(storageData.formats).length === 0) {
            storageData.formats = formatsDefault;
            // await browser.storage.local.set({ 'formats': storageData.formats });
        }
        return storageData.formats;
    } catch (error) {
        console.error(`Error when init formats:`, error);
    }
}

function setupAnalyseToggle(format) {
    document.getElementById('mtgtop8-'+format).addEventListener("change", async (event) => {
        let storageData = await browser.storage.local.get('formats');
        storageData.formats[format].mtgtop8 = event.target.checked;
        await browser.storage.local.set({ 'formats': storageData.formats });
    });
}

function setupHideToggle(format) {
    document.getElementById('hide-'+format).addEventListener("change", async (event) => {
        let storageData = await browser.storage.local.get('formats');
        storageData.formats[format].hideIfNotLegalIn = event.target.checked;
        await browser.storage.local.set({ 'formats': storageData.formats });
    });
}

function setupControl(controlId, storageKey) {
    document.getElementById(controlId).addEventListener("change", async (event) => {
        const value = event.target.value;
        await browser.storage.local.set({ storageKey: value });
    });
}

function setupThumbnailSize() {
    const thumbnailSwitch = document.getElementById("thumbnail-switch");
    const slider = document.getElementById("thumbnail-range");
    const output = document.getElementById("output");

    function syncThumbnailUi(isEnabled) {
        slider.disabled = !isEnabled;
        output.textContent = slider.value;
    }

    browser.storage.local.get('thumbnail').then(storageData => {
        const storedValue = Number(storageData.thumbnail);
        const hasCustomValue = Number.isFinite(storedValue) && storedValue > 0;

        if (hasCustomValue) {
            slider.value = String(storedValue);
        }

        thumbnailSwitch.checked = hasCustomValue;
        syncThumbnailUi(hasCustomValue);
    });

    slider.oninput = async function() {
        output.textContent = this.value;
        await browser.storage.local.set({ 'thumbnail': this.value });
    }

    thumbnailSwitch.onchange = async function(event) {
        const checked = event.target.checked;
        syncThumbnailUi(checked);
        await browser.storage.local.set({ 'thumbnail': checked ? slider.value : 0 });
    }
}

const PRICE_AUTOFILL_DEFAULTS = {
    minRivalSales: 300,
    minRivalAvailableItems: 250,
    priceSource: 'lowestRival',
    undercutMode: 'fixed',
    undercutValue: 0.01,
    minimumPrice: 0.05,
    includeCalculatedRivals: true,
    includePowersellers: true,
    includeProfessional: false
};

function setupPriceAutofill() {
    const numericFields = [
        'minRivalSales',
        'minRivalAvailableItems',
        'undercutValue',
        'minimumPrice'
    ];
    const selectFields = ['priceSource', 'undercutMode'];
    const checkboxFields = ['includeCalculatedRivals', 'includePowersellers', 'includeProfessional'];
    const allFields = [...numericFields, ...selectFields, ...checkboxFields];

    browser.storage.local.get('priceAutofill').then(result => {
        const stored = result.priceAutofill || {};
        for (const key of allFields) {
            const el = document.getElementById(`pa-${key}`);
            if (!el) continue;
            
            if (checkboxFields.includes(key)) {
                el.checked = stored[key] ?? PRICE_AUTOFILL_DEFAULTS[key];
            } else {
                el.value = stored[key] ?? PRICE_AUTOFILL_DEFAULTS[key];
            }
        }
    });

    for (const key of allFields) {
        const el = document.getElementById(`pa-${key}`);
        if (!el) continue;
        
        el.addEventListener('change', async () => {
            const result = await browser.storage.local.get('priceAutofill');
            const current = result.priceAutofill || {};
            const value = checkboxFields.includes(key)
                ? el.checked
                : selectFields.includes(key)
                    ? el.value
                    : Number(el.value);
            const updated = { ...PRICE_AUTOFILL_DEFAULTS, ...current, [key]: value };
            await browser.storage.local.set({ priceAutofill: updated });
        });
    }
}

async function sendDriveSyncAction(action, payload = {}) {
    const response = await browser.runtime.sendMessage({ action, ...payload });
    if (!response || !response.success) {
        throw new Error(response && response.error || `Action failed: ${action}`);
    }
    return response.data;
}

function formatSyncTime(timestamp) {
    if (!timestamp) {
        return 'Never synced';
    }
    return `Last synced ${new Date(timestamp).toLocaleString()}`;
}

function setupGoogleDriveSync() {
    const connectButton = document.getElementById('drive-connect');
    const syncNowButton = document.getElementById('drive-sync-now');
    const disconnectButton = document.getElementById('drive-disconnect');
    const authPanel = document.getElementById('drive-auth-panel');
    const authLink = document.getElementById('drive-auth-link');
    const statusElement = document.getElementById('drive-status');
    let pollTimer = null;
    let lastStatus = null;

    if (!connectButton || !syncNowButton || !disconnectButton || !authPanel || !authLink || !statusElement) {
        return;
    }

    function setBusy(isBusy) {
        if (isBusy) {
            connectButton.disabled = true;
            syncNowButton.disabled = true;
            disconnectButton.disabled = true;
        } else if (lastStatus) {
            renderStatus(lastStatus);
        }
    }

    function renderStatus(status) {
        lastStatus = status;
        authPanel.classList.toggle('is-visible', Boolean(status.pendingAuth));
        if (status.pendingAuth) {
            authLink.href = status.pendingAuth.authorizationUrl;
        }

        connectButton.disabled = status.isConnected;
        syncNowButton.disabled = !status.isConnected;
        disconnectButton.disabled = !status.isConnected && !status.pendingAuth;

        if (status.pendingAuth) {
            statusElement.textContent = 'Waiting for Google authorization.';
        } else if (status.isConnected) {
            statusElement.textContent = `Connected using hidden Drive app data. ${formatSyncTime(status.lastSyncAt)}.`;
        } else {
            statusElement.textContent = 'Google Drive sync is not connected.';
        }

        if (status.lastError) {
            statusElement.textContent += ` Error: ${status.lastError}`;
        }
    }

    async function refreshStatus() {
        const status = await sendDriveSyncAction('googleDriveSyncGetStatus');
        renderStatus(status);
        return status;
    }

    function stopPolling() {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    function startPolling(intervalSeconds) {
        stopPolling();
        pollTimer = setInterval(async () => {
            try {
                const status = await sendDriveSyncAction('googleDriveSyncPollAuth');
                renderStatus(status);
                if (status.isConnected || !status.pendingAuth) {
                    stopPolling();
                    await refreshStatus();
                }
            } catch (error) {
                stopPolling();
                statusElement.textContent = error.message;
            }
        }, Math.max(intervalSeconds || 5, 5) * 1000);
    }

    connectButton.addEventListener('click', async () => {
        setBusy(true);
        try {
            const status = await sendDriveSyncAction('googleDriveSyncStartAuth');
            renderStatus(status);
            if (status.pendingAuth && status.pendingAuth.authorizationUrl) {
                if (browser.tabs && browser.tabs.create) {
                    await browser.tabs.create({ url: status.pendingAuth.authorizationUrl });
                } else {
                    window.open(status.pendingAuth.authorizationUrl, '_blank', 'noopener,noreferrer');
                }
                startPolling(status.pendingAuth.interval);
            }
        } catch (error) {
            statusElement.textContent = error.message;
        } finally {
            setBusy(false);
        }
    });

    syncNowButton.addEventListener('click', async () => {
        setBusy(true);
        try {
            const status = await sendDriveSyncAction('googleDriveSyncNow');
            renderStatus(status);
        } catch (error) {
            statusElement.textContent = error.message;
        } finally {
            setBusy(false);
            await refreshStatus();
        }
    });

    disconnectButton.addEventListener('click', async () => {
        setBusy(true);
        try {
            stopPolling();
            const status = await sendDriveSyncAction('googleDriveSyncDisconnect');
            renderStatus(status);
        } catch (error) {
            statusElement.textContent = error.message;
        } finally {
            setBusy(false);
            await refreshStatus();
        }
    });

    refreshStatus().then(status => {
        if (status.pendingAuth) {
            startPolling(status.pendingAuth.interval);
        }
    }).catch(error => {
        statusElement.textContent = error.message;
    });
}

document.addEventListener("DOMContentLoaded", function () {
    setupThumbnailSize();
    setupPriceAutofill();
    setupGoogleDriveSync();
});
