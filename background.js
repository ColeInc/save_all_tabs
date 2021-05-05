onStartup();

function onStartup() {
    // load in stored checkbox values from chrome.storage.local:

    chrome.storage.local.get("autoOpenCheckbox", (result) => {
        if (result.autoOpenCheckbox) {
            loadLatestTabs(); // run the loadLatestTabs function from startup
        }
    });

    chrome.storage.local.get("autoSaveCheckbox", (result) => {
        if (result.autoSaveCheckbox) {
            autoSaveAlarm.create(); // if auto save checkbox is ON, saving all tabs every x minutes.
        } else {
            autoSaveAlarm.clear(); // if the Auto Save switch isn't checked, delete any existing alarms on startup.
        }
    });
}

var autoSaveAlarm = {
    create: function (e) {
        chrome.storage.local.get("autoSaveMins", (result) => {
            var minutes = result.autoSaveMins;
            var mins = isNumeric(minutes) ? minutes : 1; // if the value from storage is a valid number use it, otherwise use default of 1.

            console.log("creating an alarm to trigger every %s mins", mins);

            chrome.alarms.create("autoSaveAlarm", {
                periodInMinutes: parseInt(mins),
            });
        });
        console.log("alarm created!");
    },
    clear: function (e) {
        chrome.alarms.clear("autoSaveAlarm");
        console.log("alarm deleted!");
    },
};

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
        // console.log("result")
        // console.log(result)
        if (result.myTabs != undefined) {
            // console.log("Tabs found:\n" + result.myTabs);

            // For each different window previously saved:
            for (const [key, value] of Object.entries(result.myTabs.windows)) {

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
                            return ""
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
        // console.log("genericChromeStorageSaver stored the following:\n");
        // console.log(keyValuePair);
    });
}

function autoOpenChecked() {
    genericChromeStorageSaver("autoOpenCheckbox", true); // updates the chrome.storage.local value for this checkbox
}

function autoOpenUnchecked() {
    genericChromeStorageSaver("autoOpenCheckbox", false);
}

function autoSaveChecked() {
    genericChromeStorageSaver("autoSaveCheckbox", true);
    autoSaveAlarm.create();
}

function autoSaveUnchecked() {
    genericChromeStorageSaver("autoSaveCheckbox", false);
    autoSaveAlarm.clear();
}

// listen for sendMessages sent from popup.js
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     console.log(request);
//     console.log(sender);
//     sendResponse({ farewell: "goodbye" });
//     return true; // this has to be here for async
// });

// Event Listener for Auto Save x minutely backups of all current tabs:
chrome.alarms.onAlarm.addListener(function (alarm) {
    console.log(
        "alarm triggered! (on %s min frequency)",
        alarm.periodInMinutes
    );
    getCurrentTabs();
});

function isNumeric(str) {
    if (typeof str != "string") return false; // we only process strings!
    return (
        !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str))
    ); // ...and ensure strings of whitespace fail
}

function setAutoSaveMins(mins) {
    // console.log("input to setAutoSaveMins:");
    // console.log(mins);

    genericChromeStorageSaver("autoSaveMins", mins);

    chrome.storage.local.get("autoSaveCheckbox", (result) => {
        if (result.autoSaveCheckbox) {
            autoSaveAlarm.clear();
            autoSaveAlarm.create(); // if an existing alarm exists, delete it and create a new one with the new frequency
        }
    });
}

// Export Tabs to Chrome Bookmarks:
function exportTabs() {

    // get most up to date version of user's tabs first:
    getCurrentTabs()

    chrome.storage.local.get("myTabs", (result) => {
        if (result.myTabs != undefined) {

            // Find or Create SAVE ALL TABS chrome bookmarks directory:
            findOrCreateBookmarksDir((resp) => {

                var bookmarkDirectoryId = resp;
                var counter = 1;

                // For each different window previously saved:
                for (const [key, value] of Object.entries(result.myTabs.windows)) {

                    // create folder for window:
                    var today = new Date();
                    var dd = String(today.getDate()).padStart(2, '0');
                    var mm = String(today.getMonth() + 1).padStart(2, '0'); // january is 0 (skidded af)
                    var yyyy = today.getFullYear();
                    var title = yyyy + '.' + mm + '.' + dd + ' v' + String(counter);

                    chrome.bookmarks.create({
                        parentId: bookmarkDirectoryId,
                        title: title
                    }, (resp) => {
                        // now iterate all tabs in the window and create each bookmark in the bookmark directory, E.g. under 2021.05.03 v2
                        value.tab_urls.forEach((tab) => {
                            chrome.bookmarks.create({
                                parentId: resp.id,
                                title: tab,
                                url: tab
                            });
                        })
                    });
                    counter++;

                }
            })
        } else {
            var errorMessage = "No previously saved chrome tabs found :(";
            console.log(errorMessage);
            return errorMessage;
        }
    });
}

// Find or Create SAVE ALL TABS chrome bookmarks directory:
function findOrCreateBookmarksDir(callback) {
    chrome.bookmarks.getTree((bookmarks) => {
        bookmarks.forEach((bookmark) => {
            // iterate highest root bookmarks
            bookmark.children.forEach((child) => {
                if (child.title === "Bookmarks bar") { // if main Bookmarks folder found. Now need to check if there's a Save all Tabs folder inside this
                    // if (child.title === "Bookmarks") { // works in Brave
                    var parentId = child.id
                    var found = false;
                    child.children.forEach((mainBookmarksChild) => {
                        if (mainBookmarksChild.title === "SAVE ALL TABS") {
                            // console.log("existing SAVE ALL TABS file found!")
                            found = true;
                            callback(mainBookmarksChild.id) // create bookmarks inside the folder 
                            return
                        }
                    })
                    if (!found) {
                        // console.log("no SAVE ALL TABS file found! Creating new folder for you :)")
                        createBookmarkFolder(parentId, callback) // create new SAVE ALL TABS folder
                        return
                    }
                } else {
                    // console.log("this isn't the Bookmarks folder!")
                }
            });
        });
    });
}

function createBookmarkFolder(parent, callback) {
    // returns the id of the SAVE ALL TABS bookmark created
    chrome.bookmarks.create({ parentId: parent, title: "SAVE ALL TABS" }, (created) => {
        // console.log("newly created SAVE ALL TABS object:")
        // console.log(created)
        callback(created.id)
    })
}