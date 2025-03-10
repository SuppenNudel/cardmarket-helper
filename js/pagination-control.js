const map = {
    "ArrowLeft": "prev",
    "ArrowRight": "next"
};

async function main() {
    console.log("pagination-control.js");

    document.addEventListener('keyup', function (event) {
        // Check if an element is focused and if it's interactive (input, textarea, etc.)
        const activeElement = document.activeElement;
        if (
            activeElement &&
            (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT' || activeElement.isContentEditable)
        ) {
            return; // If focused on an input/textarea or editable content, don't do anything
        }

        if (event.key in map) {
            const dir = map[event.key];
            const element = document.querySelector(`a.pagination-control[data-direction="${dir}"]`);

            if (element) {
                element.click();
            } else {
                console.log(`Element with direction "${dir}" not found.`);
            }
        }
    });
}

main();
