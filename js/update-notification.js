function createAlert(text, version) {
    const divContainer = document.createElement("div");
    divContainer.role = "alert"
    divContainer.classList = "alert systemMessage alert-success alert-dismissible fade show"

    const span = document.createElement("span");
    span.classList = "fonticon-beta-test alert-icon";

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-bs-dismiss", "alert");
    button.ariaLabel = "Close";
    button.classList = "btn-close";

    button.addEventListener("click", function () {
        browser.storage.local.set({ lastAckedVersion: version })
            .then(() => {
                console.log('Currently used version saved: ' + version);
            })
            .catch((error) => {
                console.error('Error saving data:', error);
            });
    });

    const divContent = document.createElement("div");
    divContent.classList = "alert-content";

    const h4 = document.createElement("h4");
    h4.classList = "alert-heading";
    h4.textContent = text;

    const a = document.createElement("a");
    a.href = "https://nudelforce.notion.site/e9ed9bd81c684952ade7985944f87f17";
    a.target = "_blank";
    a.textContent = "Check out the Homepage for Changelogs";

    divContent.append(h4, a);

    divContainer.append(span, button, divContent);

    return divContainer;
}

function makeAnnouncement(text, version) {
    const alertContainer = document.getElementById("AlertContainer");
    alertContainer.append(createAlert(text, version));
}

(async function main() {
    console.log("update-notification.js");

    const manifestData = browser.runtime.getManifest();
    const version = manifestData.version;

    browser.storage.local.get(['lastAckedVersion'])
        .then((result) => {
            const lastAckedVersion = result.lastAckedVersion;
            if(!lastAckedVersion || lastAckedVersion != version) {
                makeAnnouncement(`Cardmarket Assistant, new Version: ${version}`, version);
            }
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });

})();
