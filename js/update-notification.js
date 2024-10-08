function createAlert(text) {
    const divContainer = document.createElement("div");
    divContainer.role = "alert"
    divContainer.classList = "alert systemMessage alert-success alert-dismissible fade show"

    const span = document.createElement("span");
    span.classList = "fonticon-check-circle alert-icon";

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-bs-dismiss", "alert");
    button.ariaLabel = "Close";
    button.classList = "btn-close";

    const divContent = document.createElement("div");
    divContent.classList = "alert-content";

    const h4 = document.createElement("h4");
    h4.classList = "alert-heading";
    h4.textContent = text;

    divContent.append(h4);

    divContainer.append(span, button, divContent);

    return divContainer;
}

function makeAnnouncement(text) {
    const alertContainer = document.getElementById("AlertContainer");
    alertContainer.append(createAlert(text));
}

(async function main() {
    console.log("update-notification.js");

    const manifestData = browser.runtime.getManifest();
    const version = manifestData.version;

    makeAnnouncement("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.");
})();
