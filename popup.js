// ------------------------------------------------
// START UP FUNCTION - FETCH AUTO OPEN / AUTO SAVE SWITCH STATE:
// ------------------------------------------------

popupStartup();

function popupStartup() {
    // get local storage value of Auto Open Checkbox:
    chrome.storage.local.get("autoOpenCheckbox", (result) => {
        if (result.autoOpenCheckbox) {
            document.getElementById("autoOpenCheckbox").checked = true;
        }
    });

    // get local storage value of Auto Save Checkbox:
    chrome.storage.local.get("autoSaveCheckbox", (result) => {
        if (result.autoSaveCheckbox) {
            document.getElementById("autoSaveCheckbox").checked = true;
        }
    });

    // get local storage value of Auto Save minutes text input:
    chrome.storage.local.get("autoSaveMins", (result) => {
        var minutes = result.autoSaveMins;

        if (isNumeric(minutes)) {
            document.getElementById("autoSaveMinsInput").value = minutes;
        }
    });

    // Get last saved theme from local storage:
    chrome.storage.local.get("theme", (result) => {
        if (result.theme != undefined) {
            var switchToTheme = result.theme === "light" ? "light" : "dark" // if explicitly saved to light, set theme to light, otherwise anything else set dark
        } else {
            var switchToTheme = "dark" // if no theme saved, go dark
        }
        document.documentElement.setAttribute("userTheme", switchToTheme);
    });
}

// ------------------------------------------------
// SAVETABS / LOADTABS BUTTONS -  EVENT LISTENERS:
// ------------------------------------------------

// SAVETABS BUTTON LISTENER
document.getElementById("saveTabs").addEventListener("click", () => {
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        var resp = backgroundPage.getCurrentTabs();
        if (resp.length > 0) {
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").innerHTML = resp;
        }
    });
});

// LOADTABS BUTTON LISTENER
document.getElementById("loadTabs").addEventListener("click", () => {
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        var resp = backgroundPage.loadLatestTabs();
        if (resp.length > 0) {
            document.getElementById("errorNotification").style.display = "block";
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

function isNumeric(str) {
    if (typeof str != "string") return false; // we only process strings!
    return (
        !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str))
    ); // ...and ensure strings of whitespace fail
}

// Auto Save MINUTES Input Box
document.getElementById("autoSaveMinsInput").addEventListener("input", (e) => {
    var mins = e.target.value;
    if (isNumeric(mins) && mins > 1) {
        document.getElementById("inputNotification").innerHTML = "";
        document.getElementById("inputNotification").style.display = "none";
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            backgroundPage.setAutoSaveMins(e.target.value);
        });
    } else if (mins.length > 0) {
        document.getElementById("inputNotification").style.display = "block";
        document.getElementById("inputNotification").style.color = "#ff5555";
        document.getElementById("inputNotification").innerHTML =
            "Invalid auto save frequency!";
    }
});

// Auto Save Minutes Input Box - Event Listner for when user clicks out of textbox
document.getElementById("autoSaveMinsInput").addEventListener("blur", (e) => {
    var mins = e.target.value;
    if (!isNumeric(mins) || mins < 1 || mins.length === 0) {
        chrome.storage.local.get("autoSaveMins", (result) => {
            var minutes = result.autoSaveMins;
            if (isNumeric(minutes)) {
                document.getElementById("autoSaveMinsInput").value = minutes;
            } else {
                document.getElementById("autoSaveMinsInput").value = 2; // set input field back to default value
            }
        });
        document.getElementById("inputNotification").innerHTML = ""; // remove the error msg that may have been displayed
        document.getElementById("inputNotification").style.color = "#bdbdbd";
        document.getElementById("inputNotification").style.display = "none";
    }
});

// chrome.runtime.sendMessage({ greeting: "hello" }, function (response) {
//     console.log("response is below:");
//     alert(response.farewell);
// });

// Hover ON AutoOpen Description Event Listener:
document.getElementById("autoOpenSwitchCaption").addEventListener("mouseenter", function (event) {
    var hiddenElement = document.getElementById("autoOpenDesc")
    hiddenElement.style.display = "block";
});

// Hover OFF AutoOpen Description Event Listener:
document.getElementById("autoOpenSwitchCaption").addEventListener("mouseleave", function (event) {
    var hiddenElement = document.getElementById("autoOpenDesc")
    hiddenElement.style.display = "none";
});

// Hover ON AutoSave Description Event Listener:
document.getElementById("autoSaveSwitchCaption").addEventListener("mouseenter", function (event) {
    var hiddenElement = document.getElementById("autoSaveDesc")
    hiddenElement.style.display = "block";
});

// Hover OFF AutoSave Description Event Listener:
document.getElementById("autoSaveSwitchCaption").addEventListener("mouseleave", function (event) {
    var hiddenElement = document.getElementById("autoSaveDesc")
    hiddenElement.style.display = "none";
});

// ripple button click animation. skidded af from - https://css-tricks.com/how-to-recreate-the-ripple-effect-of-material-design-buttons/
function createRipple(event) {
    const button = event.currentTarget;

    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];

    if (ripple) {
        ripple.remove();
    }

    button.appendChild(circle);
}

const buttons = document.getElementsByClassName("mainButton");
for (const button of buttons) {
    button.addEventListener("click", createRipple);
}

// Export Tabs to Chrome Bookmarks Button Listener:
document.getElementById("exportTabs").addEventListener("click", () => {
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        var resp = backgroundPage.exportTabs();
        if (resp.length > 0) {
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").innerHTML = resp;
        }
    });
});

// dark / light mode easter egg listener ;)
document.getElementById("daynnite").addEventListener("click", () => {

    chrome.storage.local.get("theme", (result) => {
        if (result.theme != undefined) {
            var switchToTheme = result.theme === "dark" ? "light" : "dark" // toggle theme
        } else {
            var switchToTheme = "dark" // if no theme saved, go dark
        }
        document.documentElement.setAttribute("userTheme", switchToTheme);

        // save their latest choice back to local storage
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            backgroundPage.genericChromeStorageSaver("theme", switchToTheme);
        });
    });
})
