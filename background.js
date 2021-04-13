chrome.browserAction.onClicked.addListener(
    chrome.tabs.query({}, function (result) {
        var currentWindow = 0;
        var windowTabList = {
            windows: [],
        };
        var currentWindowList = {
            incognito: false,
            tab_urls: [],
        };
        result.forEach(function (tab) {
            // console.log(currentWindow);
            // console.log(tab.windowId);
            if (currentWindow === tab.windowId) {
                // SAME WINDOW FOUND
                // currentWindowList += tab.url;
                currentWindowList.tab_urls.push(tab.url);
                // console.log("same window found.");
                // console.log(tab);
            } else if (currentWindow === 0) {
                // FIRST WINDOW FOUND
                currentWindow = tab.windowId;
                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                }
            } else if (currentWindow !== tab.windowId) {
                // NEW WINDOW FOUND
                // console.log("new window found!");
                // windowTabList += currentWindowList;
                windowTabList.windows.push(currentWindowList);
                currentWindowList = {
                    incognito: false,
                    tab_urls: [],
                };
                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                }
                // currentWindowList += tab.url;
                currentWindowList.tab_urls.push(tab.url);
                currentWindow = tab.windowId;
            }
        });
        // Final output list
        console.log("FINAL LIST: ", windowTabList);

        storeTabs({ beans: JSON.stringify(windowTabList) });
        getLatestTabs();
    })
);

function storeTabs(jsonPayload) {
    // generate valid name to store the json payload under first
    // chrome.storage.local.set({key: value},
    var allTabs = chrome.storage.local.set(jsonPayload, function (result) {
        console.log("Value is set to " + jsonPayload.beans);
    });
}

function getLatestTabs() {
    chrome.storage.local.get("beans", function (result) {
        console.log("Value currently is " + result.beans);
    });
}
