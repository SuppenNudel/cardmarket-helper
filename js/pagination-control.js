const map = {
    "ArrowLeft": "prev",
    "ArrowRight": "next"
};

(async function main() {
    console.log("pagination-control.js");
    document.addEventListener('keyup', function (event) {
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
})();
