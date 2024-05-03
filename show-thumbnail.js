(async function main() {
    console.log("loading big-images.js");
    const gen = iterateThumbnails();
    while(true) {
        const element = gen.next();
        if(element.done) {
            break
        }
        const image = await showThumbnail(element.value);
        const scryfallCard = getScryfallCardFromImage(image);
    }
})();