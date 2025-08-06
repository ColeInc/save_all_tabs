// Service Worker initialization - handle startup events
chrome.runtime.onStartup.addListener(onStartup);
chrome.runtime.onInstalled.addListener(onStartup);

// Keep service worker alive when there are active alarms
let keepAliveInterval;

function keepServiceWorkerAlive() {
    keepAliveInterval = setInterval(() => {
        chrome.runtime.getPlatformInfo(() => {
            // Simple API call to prevent service worker from going idle
        });
    }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

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
            
            // Keep service worker alive when alarm is active
            keepServiceWorkerAlive();
        });
        console.log("alarm created!");
    },
    clear: function (e) {
        chrome.alarms.clear("autoSaveAlarm");
        console.log("alarm deleted!");
        
        // Stop keeping service worker alive when no alarms
        stopKeepAlive();
    },
};

function getCurrentTabs() {
    console.log("🔄 SAVE TABS: Starting to collect current tabs...");
    chrome.tabs.query({}, (result) => {
        console.log(`📊 SAVE TABS: Found ${result.length} total tabs across all windows`);
        
        var currentWindow = 0;
        var windowTabList = {
            windows: [],
        };
        var currentWindowList = {
            incognito: false,
            tab_urls: [],
        };

        result.forEach((tab, index) => {
            console.log(`📋 Tab ${index + 1}: "${tab.title}" - ${tab.url} (Window ID: ${tab.windowId}, Incognito: ${tab.incognito})`);
            
            if (currentWindow === tab.windowId) {
                // SAME WINDOW FOUND
                currentWindowList.tab_urls.push(tab.url);
            } else if (currentWindow === 0) {
                // FIRST WINDOW FOUND
                console.log(`🪟 SAVE TABS: Processing first window (ID: ${tab.windowId})`);
                currentWindow = tab.windowId;
                currentWindowList.tab_urls.push(tab.url);

                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                    console.log("🕶️ SAVE TABS: Window marked as incognito");
                }
            } else if (currentWindow !== tab.windowId) {
                // NEW WINDOW FOUND
                console.log(`🪟 SAVE TABS: Finished window ${currentWindow} with ${currentWindowList.tab_urls.length} tabs`);
                console.log(`🪟 SAVE TABS: Starting new window (ID: ${tab.windowId})`);
                
                windowTabList.windows.push(currentWindowList);
                currentWindowList = {
                    incognito: false,
                    tab_urls: [],
                };

                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                    console.log("🕶️ SAVE TABS: New window marked as incognito");
                }
                currentWindowList.tab_urls.push(tab.url);
                currentWindow = tab.windowId;
            }
        });

        windowTabList.windows.push(currentWindowList); //push final window of tabs into output list
        console.log(`🪟 SAVE TABS: Finished final window ${currentWindow} with ${currentWindowList.tab_urls.length} tabs`);

        // Final summary
        console.log(`✅ SAVE TABS: Summary - ${windowTabList.windows.length} windows processed:`);
        windowTabList.windows.forEach((window, index) => {
            console.log(`   Window ${index + 1}: ${window.tab_urls.length} tabs (Incognito: ${window.incognito})`);
            window.tab_urls.forEach((url, tabIndex) => {
                console.log(`     Tab ${tabIndex + 1}: ${url}`);
            });
        });

        genericChromeStorageSaver("myTabs", windowTabList);
        console.log("💾 SAVE TABS: Data saved to chrome.storage.local");
    });
}

function loadLatestTabs() {
    console.log("🔄 LOAD TABS: Starting to load previously saved tabs...");
    chrome.storage.local.get("myTabs", (result) => {
        if (result.myTabs != undefined) {
            console.log(`📊 LOAD TABS: Found saved data with ${result.myTabs.windows.length} windows`);
            
            // Log what we're about to restore
            result.myTabs.windows.forEach((window, index) => {
                console.log(`🪟 LOAD TABS: Window ${index + 1} - ${window.tab_urls.length} tabs (Incognito: ${window.incognito})`);
                window.tab_urls.forEach((url, tabIndex) => {
                    console.log(`     Tab ${tabIndex + 1}: ${url}`);
                });
            });

            // For each different window previously saved:
            for (const [key, value] of Object.entries(result.myTabs.windows)) {
                var incognito = value.incognito ? true : false;
                console.log(`🔄 LOAD TABS: Creating new window ${parseInt(key) + 1} (Incognito: ${incognito})`);

                chrome.windows.create(
                    {
                        incognito: incognito,
                        state: "maximized",
                    },
                    (w) => {
                        var windowId = w.id;
                        console.log(`✅ LOAD TABS: New window created with ID: ${windowId}`);
                        console.log(`🔄 LOAD TABS: Adding ${value.tab_urls.length} tabs to window ${windowId}`);

                        value.tab_urls.forEach((tab, tabIndex) => {
                            console.log(`📋 LOAD TABS: Creating tab ${tabIndex + 1}: ${tab}`);
                            chrome.tabs.create({
                                url: tab,
                                windowId: windowId,
                            });

                            // delete the annoying first empty tab that gets created in each window:
                            if (tabIndex === 0) {
                                console.log(`🗑️ LOAD TABS: Removing default empty tab from window ${windowId}`);
                                deleteFirstTab(windowId);
                            }
                        });
                        console.log(`✅ LOAD TABS: Finished loading window ${windowId}`);
                    }
                );
            }
            console.log("✅ LOAD TABS: All windows and tabs have been queued for restoration");
        } else {
            var errorMessage = "No previously saved chrome tabs found :(";
            console.log(`❌ LOAD TABS: ${errorMessage}`);
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
    console.log(`💾 STORAGE: Saving to chrome.storage.local - Key: "${key}"`);
    var keyValuePair = JSON.parse(
        '{ "' + key + '": ' + JSON.stringify(value) + " }"
    );

    chrome.storage.local.set(keyValuePair, (result) => {
        console.log(`✅ STORAGE: Successfully saved "${key}" to chrome.storage.local`);
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

// Message handler for popup.js communication
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(`📨 BACKGROUND: Received message from popup - Action: ${request.action}`);
    
    switch (request.action) {
        case "getCurrentTabs":
            console.log("🔄 BACKGROUND: Handling getCurrentTabs request");
            getCurrentTabs();
            sendResponse({ success: true });
            break;
        case "loadLatestTabs":
            console.log("🔄 BACKGROUND: Handling loadLatestTabs request");
            // Check if there are saved tabs before trying to load them
            chrome.storage.local.get("myTabs", (storageResult) => {
                if (storageResult.myTabs != undefined && storageResult.myTabs.windows && storageResult.myTabs.windows.length > 0) {
                    loadLatestTabs();
                    sendResponse({ success: true });
                } else {
                    console.log("❌ BACKGROUND: No saved tabs found for loading");
                    sendResponse({ success: false, error: "No previously saved tabs found" });
                }
            });
            break;
        case "autoOpenChecked":
            autoOpenChecked();
            sendResponse({ success: true });
            break;
        case "autoOpenUnchecked":
            autoOpenUnchecked();
            sendResponse({ success: true });
            break;
        case "autoSaveChecked":
            autoSaveChecked();
            sendResponse({ success: true });
            break;
        case "autoSaveUnchecked":
            autoSaveUnchecked();
            sendResponse({ success: true });
            break;
        case "setAutoSaveMins":
            setAutoSaveMins(request.minutes);
            sendResponse({ success: true });
            break;
        case "exportTabs":
            console.log("🔄 BACKGROUND: Handling exportTabs request");
            exportTabs();
            sendResponse({ success: true });
            break;
        case "genericChromeStorageSaver":
            genericChromeStorageSaver(request.key, request.value);
            sendResponse({ success: true });
            break;
        default:
            sendResponse({ success: false, error: "Unknown action" });
    }
    
    return true; // Required for async response
});

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
    console.log("🔄 EXPORT TABS: Starting to export current tabs to bookmarks...");
    
    // First get current tabs and save them, then export to bookmarks
    chrome.tabs.query({}, (result) => {
        console.log(`📊 EXPORT TABS: Found ${result.length} total tabs to export`);
        
        var currentWindow = 0;
        var windowTabList = {
            windows: [],
        };
        var currentWindowList = {
            incognito: false,
            tab_urls: [],
        };

        result.forEach((tab, index) => {
            console.log(`📋 EXPORT TABS: Processing tab ${index + 1}: "${tab.title}" - ${tab.url} (Window ID: ${tab.windowId})`);
            
            if (currentWindow === tab.windowId) {
                // SAME WINDOW FOUND
                currentWindowList.tab_urls.push(tab.url);
            } else if (currentWindow === 0) {
                // FIRST WINDOW FOUND
                console.log(`🪟 EXPORT TABS: Processing first window (ID: ${tab.windowId})`);
                currentWindow = tab.windowId;
                currentWindowList.tab_urls.push(tab.url);

                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                    console.log("🕶️ EXPORT TABS: Window marked as incognito");
                }
            } else if (currentWindow !== tab.windowId) {
                // NEW WINDOW FOUND
                console.log(`🪟 EXPORT TABS: Finished window ${currentWindow} with ${currentWindowList.tab_urls.length} tabs`);
                console.log(`🪟 EXPORT TABS: Starting new window (ID: ${tab.windowId})`);
                
                windowTabList.windows.push(currentWindowList);
                currentWindowList = {
                    incognito: false,
                    tab_urls: [],
                };

                if (tab.incognito === true) {
                    currentWindowList.incognito = true;
                    console.log("🕶️ EXPORT TABS: New window marked as incognito");
                }
                currentWindowList.tab_urls.push(tab.url);
                currentWindow = tab.windowId;
            }
        });

        windowTabList.windows.push(currentWindowList); // push final window of tabs into output list
        console.log(`🪟 EXPORT TABS: Finished final window ${currentWindow} with ${currentWindowList.tab_urls.length} tabs`);

        // Summary of what will be exported
        console.log(`✅ EXPORT TABS: Summary - ${windowTabList.windows.length} windows to export:`);
        windowTabList.windows.forEach((window, index) => {
            console.log(`   Window ${index + 1}: ${window.tab_urls.length} tabs (Incognito: ${window.incognito})`);
            window.tab_urls.forEach((url, tabIndex) => {
                console.log(`     Tab ${tabIndex + 1}: ${url}`);
            });
        });

        // Now export these tabs to bookmarks
        if (windowTabList.windows.length > 0) {
            console.log("🔄 EXPORT TABS: Finding or creating bookmark directory...");
            // Find or Create SAVE ALL TABS chrome bookmarks directory:
            findOrCreateBookmarksDir((resp) => {
                var bookmarkDirectoryId = resp;
                console.log(`📁 EXPORT TABS: Using bookmark directory ID: ${bookmarkDirectoryId}`);
                var counter = 1;

                // For each different window:
                windowTabList.windows.forEach((window) => {
                    if (window.tab_urls.length > 0) {
                        // create folder for window:
                        var today = new Date();
                        var dd = String(today.getDate()).padStart(2, '0');
                        var mm = String(today.getMonth() + 1).padStart(2, '0'); // january is 0
                        var yyyy = today.getFullYear();
                        var title = yyyy + '.' + mm + '.' + dd + ' v' + String(counter);
                        
                        console.log(`📁 EXPORT TABS: Creating bookmark folder "${title}" for window ${counter}`);

                        chrome.bookmarks.create({
                            parentId: bookmarkDirectoryId,
                            title: title
                        }, (folderResp) => {
                            console.log(`✅ EXPORT TABS: Bookmark folder created with ID: ${folderResp.id}`);
                            console.log(`🔄 EXPORT TABS: Adding ${window.tab_urls.length} bookmarks to folder "${title}"`);
                            
                            // now iterate all tabs in the window and create each bookmark
                            window.tab_urls.forEach((tab, tabIndex) => {
                                if (tab && tab.length > 0) {
                                    console.log(`🔖 EXPORT TABS: Creating bookmark ${tabIndex + 1}: ${tab}`);
                                    chrome.bookmarks.create({
                                        parentId: folderResp.id,
                                        title: tab,
                                        url: tab
                                    });
                                }
                            });
                            console.log(`✅ EXPORT TABS: Finished adding bookmarks to folder "${title}"`);
                        });
                        counter++;
                    }
                });
                console.log("✅ EXPORT TABS: All bookmark folders and bookmarks have been queued for creation");
            });
        } else {
            console.log("❌ EXPORT TABS: No tabs found to export");
        }
    });
}

// Find or Create SAVE ALL TABS chrome bookmarks directory:
function findOrCreateBookmarksDir(callback) {
    console.log("🔄 EXPORT TABS: Searching for 'SAVE ALL TABS' bookmark directory...");
    chrome.bookmarks.getTree((bookmarks) => {
        console.log("📚 EXPORT TABS: Fetched bookmarks tree.");
        bookmarks.forEach((bookmark, rootIndex) => {
            console.log(`🔍 EXPORT TABS: Inspecting root bookmark node ${rootIndex} (title: "${bookmark.title}")`);
            if (!bookmark.children) {
                console.log(`⚠️ EXPORT TABS: Root node "${bookmark.title}" has no children, skipping.`);
                return;
            }
            bookmark.children.forEach((child, childIndex) => {
                console.log(`🔍 EXPORT TABS: Checking child node ${childIndex} (title: "${child.title}")`);
                if (child.title.toLowerCase() === "bookmarks bar") {
                    console.log("✅ EXPORT TABS: Found 'Bookmarks bar' root folder.");
                    var parentId = child.id;
                    var found = false;
                    if (!child.children) {
                        console.log("⚠️ EXPORT TABS: 'Bookmarks bar' has no children, skipping.");
                        return;
                    }
                    child.children.forEach((mainBookmarksChild, mbcIndex) => {
                        console.log(`🔍 EXPORT TABS: Looking for 'SAVE ALL TABS' in 'Bookmarks bar' child ${mbcIndex} (title: "${mainBookmarksChild.title}")`);
                        if (mainBookmarksChild.title.toLowerCase() === "save all tabs") {
                            console.log(`✅ EXPORT TABS: Found existing 'SAVE ALL TABS' folder with ID: ${mainBookmarksChild.id}`);
                            found = true;
                            callback(mainBookmarksChild.id);
                            return;
                        }
                    });
                    if (!found) {
                        console.log("📁 EXPORT TABS: 'SAVE ALL TABS' folder not found. Creating new folder...");
                        createBookmarkFolder(parentId, (createdId) => {
                            console.log(`✅ EXPORT TABS: Created new 'SAVE ALL TABS' folder with ID: ${createdId}`);
                            callback(createdId);
                        });
                        return;
                    }
                } else {
                    console.log(`ℹ️ EXPORT TABS: Node "${child.title}" is not 'Bookmarks bar', skipping.`);
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