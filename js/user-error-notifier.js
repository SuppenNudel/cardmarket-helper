(function () {
    if (window.CardmarketHelperErrorNotifier) {
        return;
    }

    const REPORT_BASE_URL = 'https://github.com/SuppenNudel/cardmarket-helper/issues/new';
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

        const title = `[Bug] Cardmarket Helper extension error during ${contextLabel || 'user interaction'}: ${errorDetails.message}`;
        const body = [
            '## What happened',
            'This error was caused by the Cardmarket Helper extension code (not by cardmarket.com itself).',
            `The error occurred during: ${contextLabel || lastInteractionType}.`,
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
            `- Page title: ${document.title}`,
            `- Last interaction type: ${lastInteractionType}`,
            `- Timestamp: ${new Date().toISOString()}`,
            `- User Agent: ${navigator.userAgent}`
        ].join('\n');

        const query = [
            `title=${encodeURIComponent(title)}`,
            `body=${encodeURIComponent(body)}`,
            'labels=bug'
        ].join('&');
        return `${REPORT_BASE_URL}?${query}`;
    }

    function makeAnnouncement(text, version) {
    }
    
    function showToast(errorDetails, contextLabel) {
        const reportLink = buildReportLink(errorDetails, contextLabel);

        const divContainer = document.createElement('div');
        divContainer.role = 'alert';
        divContainer.classList = 'alert systemMessage alert-danger alert-dismissible fade show';
        divContainer.style.pointerEvents = 'auto';
        divContainer.style.marginBottom = '10px';

        const span = document.createElement('span');
        span.classList = 'fonticon-beta-test alert-icon';

        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-bs-dismiss', 'alert');
        button.ariaLabel = 'Close';
        button.classList = 'btn-close';
        button.addEventListener('click', () => {
            divContainer.remove();
        });

        const divContent = document.createElement('div');
        divContent.classList = 'alert-content';

        const h4 = document.createElement('h4');
        h4.classList = 'alert-heading';
        h4.textContent = `Cardmarket Helper extension error: ${contextLabel || 'Action'} failed: ${errorDetails.message}`;

        const a = document.createElement('a');
        a.href = reportLink;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Report this issue ↗️';

        divContent.append(h4, a);
        divContainer.append(span, button, divContent);

        
        const alertContainer = document.getElementById("AlertContainer");
        alertContainer.append(divContainer);
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
            if (!isExtensionScriptUrl(event.filename)) {
                return;
            }

            notify(event.error || event.message, lastInteractionType);
        });

        window.addEventListener('unhandledrejection', (event) => {
            const details = toErrorDetails(event.reason);
            if (!isLikelyExtensionError(details)) {
                return;
            }

            notify(event.reason, `${lastInteractionType} (async)`);
        });
    }

    function getConsoleErrorCandidate(args) {
        const firstArg = args.length > 0 ? args[0] : null;
        const errorArg = args.find((arg) => arg instanceof Error);
        const tailArg = args.length > 0 ? args[args.length - 1] : null;
        const candidate = errorArg || tailArg || firstArg;
        const contextLabel = (typeof firstArg === 'string' && firstArg.length < 160)
            ? firstArg
            : lastInteractionType;

        return { candidate, contextLabel };
    }

    function shouldNotifyFromWarn(args) {
        if (args.some((arg) => arg instanceof Error)) {
            return true;
        }

        const text = args
            .map((arg) => {
                if (typeof arg === 'string') {
                    return arg;
                }
                if (arg instanceof Error) {
                    return `${arg.message} ${arg.stack || ''}`;
                }
                return String(arg);
            })
            .join(' ')
            .toLowerCase();

        return /error|failed|exception|could not|cannot|unhandled|quota|denied|missing/.test(text);
    }

    function installConsoleErrorHook() {
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.error = function () {
            try {
                const args = Array.from(arguments);
                const { candidate, contextLabel } = getConsoleErrorCandidate(args);
                handleCaughtError(candidate, contextLabel);
            } catch (hookError) {
                // Never break console behavior.
            }

            originalConsoleError.apply(console, arguments);
        };

        console.warn = function () {
            try {
                const args = Array.from(arguments);
                if (shouldNotifyFromWarn(args)) {
                    const { candidate, contextLabel } = getConsoleErrorCandidate(args);
                    handleCaughtError(candidate, contextLabel);
                }
            } catch (hookError) {
                // Never break console behavior.
            }

            originalConsoleWarn.apply(console, arguments);
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
