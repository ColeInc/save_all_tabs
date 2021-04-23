onStartup();

function onStartup() {
    // load in checkbox values from chrome.storage.local - REMEMBER TO JSON.parse()
    // set the html to corresponding value found in storage (if any)
    // check if auto open checkbox is ticked, if so run loadLatestTabs() from here!
    // (idk if this is right place to check it or some monitor inside popup.js) check if auto save checkbox is ON, if so start saving all tabs every minute.
}

// listen for sendMessages sent from popup.js
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request);
    console.log(sender);
    sendResponse({ farewell: "goodbye" });
    return true; // this has to be here for async
});

function getCurrentTabs() {
    chrome.tabs.query({}, (result) => {
        var currentWindow = 0;
        var windowTabList = {
            windows: [],
        };
        var currentWindowList = {
            incognito: false,
            tab_urls: [],
        };

        result.forEach((tab) => {
            if (currentWindow === tab.windowId) {
                // SAME WINDOW FOUND
                currentWindowList.tab_urls.push(tab.url);
            } else if (currentWindow === 0) {
                // FIRST WINDOW FOUND

                currentWindow = tab.windowId;
                currentWindowList.tab_urls.push(tab.url);

                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                }
            } else if (currentWindow !== tab.windowId) {
                // NEW WINDOW FOUND

                windowTabList.windows.push(currentWindowList);
                currentWindowList = {
                    incognito: false,
                    tab_urls: [],
                };

                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                }
                currentWindowList.tab_urls.push(tab.url);
                currentWindow = tab.windowId;
            }
        });
        //push final window of tabs into output list:
        windowTabList.windows.push(currentWindowList);

        // Final output list:
        // console.log("FINAL LIST: ", windowTabList);

        storeTabs({ myTabs: JSON.stringify(windowTabList) });
    });
}

function storeTabs(jsonPayload) {
    var allTabs = chrome.storage.local.set(jsonPayload, (result) => {
        console.log("Stored the following:\n" + jsonPayload.myTabs);
    });
}

function loadLatestTabs() {
    // loading in the previously stored tabs!
    chrome.storage.local.get("myTabs", (result) => {
        if (result.myTabs != undefined) {
            var tabs = JSON.parse(result.myTabs);
            console.log("Tabs found:\n" + tabs);

            // For each different window previously saved:
            for (const [key, value] of Object.entries(tabs.windows)) {
                console.log(key, value);

                var incognito = value.incognito ? true : false;

                chrome.windows.create(
                    {
                        incognito: incognito,
                        state: "maximized",
                    },
                    (w) => {
                        var windowId = w.id;
                        // console.log("windowId --> " + w.id);

                        value.tab_urls.forEach((tab) => {
                            // console.log("individual tab: " + tab);
                            chrome.tabs.create({
                                url: tab,
                                windowId: windowId,
                            });

                            // delete the annoying first empty tab that gets created in each window:
                            deleteFirstTab(windowId);
                        });
                    }
                );
            }

            // perhaps try send back to UI message of success/failure on tab load...
        } else {
            var errorMessage = "No previously saved chrome tabs found :(";
            console.log(errorMessage);
            alert(errorMessage);
        }
    });
}

function deleteFirstTab(windowId) {
    chrome.tabs.query({ windowId: windowId, index: 0 }, (result) => {
        chrome.tabs.remove(result[0].id);
    });
}

function genericChromeStorageSaver(key, value) {
    var keyValuePair = JSON.parse(
        '{ "' + key + '": "' + JSON.stringify(value) + '" }'
    );

    chrome.storage.local.set(keyValuePair, (result) => {
        console.log("Stored the following:\n");
        console.log(keyValuePair);
    });
}

function autoOpenChecked() {
    // console.log("autoOpenChecked!");
    genericChromeStorageSaver("autoOpenCheckbox", true); // updates the chrome.storage.local value for this checkbox
}

function autoOpenUnchecked() {
    // console.log("autoOpenUnchecked!");
    genericChromeStorageSaver("autoOpenCheckbox", false);
}

function autoSaveChecked() {
    // console.log("autoSaveChecked!");
    genericChromeStorageSaver("autoSaveCheckbox", true);
}

function autoSaveUnchecked() {
    // console.log("autoSaveUnchecked!");
    genericChromeStorageSaver("autoSaveCheckbox", false);
}
