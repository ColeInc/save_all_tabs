popupStartup();

// ------------------------------------------------
// START UP FUNCTION - FETCH AUTO OPEN / AUTO SAVE SWITCH STATE:
// ------------------------------------------------

function popupStartup() {
    // get local storage value of Auto Open Checkbox:
    chrome.storage.local.get("autoOpenCheckbox", (result) => {
        if (JSON.parse(result.autoOpenCheckbox)) {
            document.getElementById("autoOpenCheckbox").checked = true;
        }
    });

    // get local storage value of Auto Save Checkbox:
    chrome.storage.local.get("autoSaveCheckbox", (result) => {
        if (JSON.parse(result.autoSaveCheckbox)) {
            document.getElementById("autoSaveCheckbox").checked = true;
        }
    });

    // chrome.runtime.sendMessage({ greeting: "hello" }, function (response) {
    //     console.log("response is below:");
    //     alert(response.farewell);
    // });
}

// ------------------------------------------------
// SAVETABS / LOADTABS BUTTONS -  EVENT LISTENERS:
// ------------------------------------------------

// SAVETABS BUTTON LISTENER
document.getElementById("saveTabs").addEventListener("click", () => {
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        var resp = backgroundPage.getCurrentTabs();
        if (resp.length > 0) {
            document.getElementById("errorNotification").innerHTML = resp;
        }
    });
});

// LOADTABS BUTTON LISTENER
document.getElementById("loadTabs").addEventListener("click", () => {
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        var resp = backgroundPage.loadLatestTabs();
        if (resp.length > 0) {
            document.getElementById("errorNotification").innerHTML = resp;
        }
    });
});

// ------------------------------------------------
// CHECKBOX EVENT LISTENERS:
// ------------------------------------------------

// AUTO OPEN Checkbox
document.getElementById("autoOpenCheckbox").addEventListener("change", (e) => {
    if (e.target.checked) {
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            backgroundPage.autoOpenChecked();
        });
    } else {
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            backgroundPage.autoOpenUnchecked();
        });
    }
});

// AUTO SAVE Checkbox
document.getElementById("autoSaveCheckbox").addEventListener("change", (e) => {
    if (e.target.checked) {
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            backgroundPage.autoSaveChecked();
        });
    } else {
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            backgroundPage.autoSaveUnchecked();
        });
    }
});
