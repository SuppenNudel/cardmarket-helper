document.querySelectorAll('.expansion-symbol span').forEach(span => {
    let backgroundImage = span.style.backgroundImage;
    if (backgroundImage.includes('static.')) {
        span.style.backgroundImage = backgroundImage.replace('static.', '');
    }
});