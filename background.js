onStartup();

function onStartup() {
    // load in checkbox values from chrome.storage.local:

    chrome.storage.local.get("autoOpenCheckbox", (result) => {
        if (JSON.parse(result.autoOpenCheckbox)) {
            loadLatestTabs(); // run the loadLatestTabs function from startup
        }
    });

    chrome.storage.local.get("autoSaveCheckbox", (result) => {
        if (JSON.parse(result.autoSaveCheckbox)) {
            //if auto save checkbox is ON, if so start saving all tabs every minute.
        }
    });
}

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

        windowTabList.windows.push(currentWindowList); //push final window of tabs into output list:

        // Final output list:
        // console.log("FINAL LIST: ", windowTabList);

        genericChromeStorageSaver("myTabs", windowTabList);
    });
}

function loadLatestTabs() {
    // loading in the previously stored tabs!
    chrome.storage.local.get("myTabs", (result) => {
        if (result.myTabs != undefined) {
            // console.log("Tabs found:\n" + result.myTabs);

            // For each different window previously saved:
            for (const [key, value] of Object.entries(result.myTabs.windows)) {
                console.log(key, value);

                var incognito = value.incognito ? true : false;

                chrome.windows.create(
                    {
                        incognito: incognito,
                        state: "maximized",
                    },
                    (w) => {
                        var windowId = w.id;

                        value.tab_urls.forEach((tab) => {
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
        } else {
            var errorMessage = "No previously saved chrome tabs found :(";
            console.log(errorMessage);
            return errorMessage;
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
        '{ "' + key + '": ' + JSON.stringify(value) + " }"
    );
    // console.log("keyPairValue: ", keyValuePair);

    chrome.storage.local.set(keyValuePair, (result) => {
        // console.log("Stored the following:\n");
        // console.log(keyValuePair);
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

// listen for sendMessages sent from popup.js
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     console.log(request);
//     console.log(sender);
//     sendResponse({ farewell: "goodbye" });
//     return true; // this has to be here for async
// });
