(function () {
    if (window.CardmarketHelperErrorNotifier) {
        return;
    }

    const REPORT_BASE_URL = 'https://github.com/SuppenNudel/cardmarket-helper/issues/new';
    const TOAST_ID = 'cmh-error-toast-root';
    const INTERACTION_WINDOW_MS = 7000;
    const DEDUPE_WINDOW_MS = 15000;

    let lastInteractionAt = 0;
    let lastInteractionType = 'unknown';
    let lastShownAtByFingerprint = Object.create(null);

    function now() {
        return Date.now();
    }

    function rememberInteraction(type) {
        lastInteractionAt = now();
        lastInteractionType = type;
    }

    function trackUserInteractions() {
        const events = ['click', 'change', 'input', 'submit', 'keydown'];
        for (const eventName of events) {
            window.addEventListener(eventName, () => rememberInteraction(eventName), true);
        }
    }

    function isLikelyUserInteractionError() {
        return (now() - lastInteractionAt) <= INTERACTION_WINDOW_MS;
    }

    function toErrorDetails(value) {
        if (!value) {
            return {
                message: 'Unknown error',
                stack: ''
            };
        }

        if (value instanceof Error) {
            return {
                message: value.message || String(value),
                stack: value.stack || ''
            };
        }

        if (typeof value === 'string') {
            return {
                message: value,
                stack: ''
            };
        }

        try {
            return {
                message: JSON.stringify(value),
                stack: ''
            };
        } catch (jsonError) {
            return {
                message: String(value),
                stack: ''
            };
        }
    }

    function buildFingerprint(message, context) {
        return [message, context || '', location.pathname].join(' | ').slice(0, 500);
    }

    function shouldShowFingerprint(fingerprint) {
        const lastShown = lastShownAtByFingerprint[fingerprint] || 0;
        const elapsed = now() - lastShown;
        if (elapsed < DEDUPE_WINDOW_MS) {
            return false;
        }

        lastShownAtByFingerprint[fingerprint] = now();
        return true;
    }

    function buildReportLink(errorDetails, contextLabel) {
        const manifest = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest)
            ? browser.runtime.getManifest()
            : { version: 'unknown' };

        const title = `[Bug] ${contextLabel || 'User interaction error'}: ${errorDetails.message}`;
        const body = [
            '## What happened',
            `A user-facing error occurred during: ${contextLabel || lastInteractionType}.`,
            '',
            '## Error message',
            '```',
            errorDetails.message,
            '```',
            '',
            '## Stack trace',
            '```',
            errorDetails.stack || '(no stack trace)',
            '```',
            '',
            '## Environment',
            `- Extension version: ${manifest.version || 'unknown'}`,
            `- Page URL: ${location.href}`,
            `- User Agent: ${navigator.userAgent}`
        ].join('\n');

        const query = `title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
        return `${REPORT_BASE_URL}?${query}`;
    }

    function ensureToastRoot() {
        let root = document.getElementById(TOAST_ID);
        if (root) {
            return root;
        }

        root = document.createElement('div');
        root.id = TOAST_ID;
        root.style.position = 'fixed';
        root.style.top = '16px';
        root.style.right = '16px';
        root.style.zIndex = '2147483647';
        root.style.maxWidth = '420px';
        root.style.width = 'calc(100% - 24px)';
        root.style.pointerEvents = 'none';
        document.documentElement.appendChild(root);
        return root;
    }

    function showToast(errorDetails, contextLabel) {
        const root = ensureToastRoot();
        const reportLink = buildReportLink(errorDetails, contextLabel);

        const toast = document.createElement('div');
        toast.style.pointerEvents = 'auto';
        toast.style.background = '#fff6f3';
        toast.style.border = '1px solid #e79a86';
        toast.style.borderRadius = '10px';
        toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.20)';
        toast.style.padding = '12px';
        toast.style.marginBottom = '10px';
        toast.style.fontFamily = "'Segoe UI', 'Trebuchet MS', sans-serif";
        toast.style.color = '#2f1a14';
        toast.style.fontSize = '13px';
        toast.style.lineHeight = '1.35';

        const title = document.createElement('div');
        title.textContent = 'Cardmarket Helper hit an error';
        title.style.fontWeight = '700';
        title.style.marginBottom = '6px';

        const message = document.createElement('div');
        message.textContent = `${contextLabel || 'Action'} failed: ${errorDetails.message}`;
        message.style.marginBottom = '8px';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.alignItems = 'center';

        const reportAnchor = document.createElement('a');
        reportAnchor.href = reportLink;
        reportAnchor.target = '_blank';
        reportAnchor.rel = 'noopener noreferrer';
        reportAnchor.textContent = 'Report this issue';
        reportAnchor.style.color = '#0b57d0';
        reportAnchor.style.fontWeight = '600';

        const dismissButton = document.createElement('button');
        dismissButton.type = 'button';
        dismissButton.textContent = 'Dismiss';
        dismissButton.style.border = '1px solid #d3b0a6';
        dismissButton.style.background = '#fff';
        dismissButton.style.borderRadius = '6px';
        dismissButton.style.padding = '3px 8px';
        dismissButton.style.cursor = 'pointer';
        dismissButton.addEventListener('click', () => {
            toast.remove();
        });

        actions.appendChild(reportAnchor);
        actions.appendChild(dismissButton);

        toast.appendChild(title);
        toast.appendChild(message);
        toast.appendChild(actions);

        root.appendChild(toast);

        setTimeout(() => {
            if (toast.isConnected) {
                toast.remove();
            }
        }, 15000);
    }

    function notify(error, contextLabel) {
        const details = toErrorDetails(error);
        const fingerprint = buildFingerprint(details.message, contextLabel);
        if (!shouldShowFingerprint(fingerprint)) {
            return;
        }

        showToast(details, contextLabel || lastInteractionType);
    }

    function handleCaughtError(error, contextLabel) {
        if (!isLikelyUserInteractionError()) {
            return;
        }

        notify(error, contextLabel);
    }

    function isExtensionScriptUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        return url.startsWith('moz-extension://') || url.startsWith('chrome-extension://');
    }

    function isLikelyExtensionError(errorDetails) {
        const haystack = `${errorDetails.message || ''}\n${errorDetails.stack || ''}`;
        return haystack.includes('moz-extension://') || haystack.includes('chrome-extension://');
    }

    function installGlobalErrorListeners() {
        window.addEventListener('error', (event) => {
            if (!isLikelyUserInteractionError()) {
                return;
            }

            if (!isExtensionScriptUrl(event.filename)) {
                return;
            }

            notify(event.error || event.message, lastInteractionType);
        });

        window.addEventListener('unhandledrejection', (event) => {
            if (!isLikelyUserInteractionError()) {
                return;
            }

            const details = toErrorDetails(event.reason);
            if (!isLikelyExtensionError(details)) {
                return;
            }

            notify(event.reason, `${lastInteractionType} (async)`);
        });
    }

    function installConsoleErrorHook() {
        const originalConsoleError = console.error;
        console.error = function () {
            try {
                if (isLikelyUserInteractionError()) {
                    const args = Array.from(arguments);
                    const likelyError = args.find((arg) => arg instanceof Error) || args[args.length - 1];
                    const contextLabel = (typeof args[0] === 'string' && args[0].length < 120)
                        ? args[0]
                        : lastInteractionType;
                    handleCaughtError(likelyError, contextLabel);
                }
            } catch (hookError) {
                // Never break console behavior.
            }

            originalConsoleError.apply(console, arguments);
        };
    }

    window.CardmarketHelperErrorNotifier = {
        notify,
        handleCaughtError,
        trackInteraction: rememberInteraction
    };

    trackUserInteractions();
    installGlobalErrorListeners();
    installConsoleErrorHook();
})();
