function updatePackedButton(orderId, timestamp) {
    const button = document.getElementById("packedButton");
    if (!button) {
        return;
    }

    if (timestamp) {
        button.textContent = "Unpack";
        button.onclick = function () {
            updatePackedStorage(orderId, null);
        };
    } else {
        button.textContent = "Mark as Packed";
        button.onclick = function () {
            updatePackedStorage(orderId, Date.now());
        };
    }
}

function formatPackedTimestamp(timestamp) {
    const date = new Date(timestamp);

    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };

    return new Intl.DateTimeFormat('de-DE', options).format(date).replace(',', '');
}

function updatePackedTimeline(timestamp) {
    const textDiv = document.getElementById("timelinePackedText");
    const packedElement = document.getElementById("timelinePackedElement");
    if (!textDiv || !packedElement) {
        return;
    }

    if (timestamp) {
        textDiv.textContent = 'Packed: ' + formatPackedTimestamp(timestamp);

        packedElement.classList.remove("notYetStatus");
        packedElement.classList.add("bg-primary", "text-inverted");
        textDiv.classList.remove("text-muted");

        const timeline = document.getElementById("Timeline");
        const currentStatusElement = timeline ? timeline.querySelector(".currentStatus") : null;
        if (currentStatusElement) {
            const index = Array.from(currentStatusElement.parentNode.children).indexOf(currentStatusElement);
            if (index < 2) {
                currentStatusElement.classList.remove("currentStatus");
                packedElement.classList.add("currentStatus");
            }
        }
    } else {
        textDiv.textContent = 'Not yet packed';
        textDiv.classList.add("text-muted");
        packedElement.classList.add("notYetStatus");
        packedElement.classList.remove("bg-primary", "text-inverted", "currentStatus");

        const elements = document.querySelectorAll("#Timeline > div > .timeline-box.text-inverted");
        const lastElement = elements[elements.length - 1];
        if (lastElement) {
            lastElement.classList.add("currentStatus");
        }
    }
}

function updatePackedStorage(orderId, timestamp) {
    browser.storage.local.get('orders').then(result => {
        const orders = result.orders || {};

        if (timestamp) {
            orders[orderId] = {
                timestamp: timestamp,
                orderId: orderId
            };
        } else {
            delete orders[orderId];
        }

        return browser.storage.local.set({ orders: orders });
    }).then(() => {
        updatePackedTimeline(timestamp);
        updatePackedButton(orderId, timestamp);
    }).catch(error => {
        console.error('Error updating packed state:', error);
    });
}

function addPackedButton(orderId, timestamp) {
    const shippingAddress = document.getElementById('collapsibleShippingAddress');
    if (!shippingAddress) {
        return;
    }

    const shippingAddressBody = shippingAddress.querySelector(".shipping-address");
    if (!shippingAddressBody) {
        return;
    }

    if (document.getElementById("packedButton")) {
        updatePackedButton(orderId, timestamp);
        return;
    }

    shippingAddressBody.style.float = 'left';

    const buttonContainer = document.createElement("div");
    buttonContainer.style.float = 'right';
    shippingAddress.appendChild(buttonContainer);

    const button = document.createElement("button");
    button.className = "btn btn-primary my-2 btn-sm";
    button.id = "packedButton";
    buttonContainer.appendChild(button);

    updatePackedButton(orderId, timestamp);
}

function addPackedTimeline(timestamp) {
    if (document.getElementById("timelinePackedElement")) {
        updatePackedTimeline(timestamp);
        return;
    }

    const timelineParent = document.getElementById("Timeline");
    if (!timelineParent) {
        return;
    }

    const timelineBoxes = timelineParent.getElementsByClassName("timeline-box");
    const secondChild = timelineBoxes[1];
    if (!secondChild || !secondChild.parentElement) {
        return;
    }

    const packedElement = document.createElement("div");
    packedElement.className = "timeline-box px-1 py-2 small text-nowrap position-relative fw-bold col-6 col-md";
    packedElement.id = "timelinePackedElement";

    const textDiv = document.createElement("div");
    textDiv.id = "timelinePackedText";
    packedElement.append(textDiv);

    secondChild.parentElement.insertBefore(packedElement, secondChild.nextSibling);
    updatePackedTimeline(timestamp);
}

function getOrderIdFromPage() {
    const h1 = document.querySelector("div.page-title-container h1");
    const orderIdMatch = h1 && h1.textContent.match(/#(\d+)/);
    return orderIdMatch ? orderIdMatch[1] : null;
}

(async function main() {
    const isSalesPaidArticles = /\/Orders\/Sales\/Paid\/Articles/i.test(window.location.pathname);
    const isSalesOrderDetails = document.querySelector('a[href$="Orders/Sales"]') !== null && !isSalesPaidArticles;

    if (!isSalesOrderDetails) {
        return;
    }

    const orderId = getOrderIdFromPage();
    if (!orderId) {
        return;
    }

    browser.storage.local.get('orders').then(result => {
        const orders = result.orders || {};
        const order = orders[orderId];
        const timestamp = order ? order.timestamp : null;

        addPackedButton(orderId, timestamp);
        addPackedTimeline(timestamp);
    }).catch(error => {
        console.error('Error loading packed state:', error);
    });
})();
