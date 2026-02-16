// Open options page when browser action icon is clicked
browser.browserAction.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
});
