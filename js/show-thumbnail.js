(async function main() {
    console.log("show-thumbnail.js");
    const gen = iterateThumbnails();
    while(true) {
        const element = gen.next();
        if(element.done) {
            break
        }
        showThumbnail(element.value);
    }
})();
