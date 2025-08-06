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
            var switchToTheme = result.theme === "light" ? "light" : "dark"; // if explicitly saved to light, set theme to light, otherwise anything else set dark
        } else {
            var switchToTheme = "dark"; // if no theme saved, go dark
        }
        document.documentElement.setAttribute("userTheme", switchToTheme);
    });
}

// ------------------------------------------------
// SAVETABS / LOADTABS BUTTONS -  EVENT LISTENERS:
// ------------------------------------------------

// SAVETABS BUTTON LISTENER
document.getElementById("saveTabs").addEventListener("click", () => {
    console.log("🔘 POPUP: Save Tabs button clicked - sending message to background script");
    chrome.runtime.sendMessage({ action: "getCurrentTabs" }, (response) => {
        if (response && response.success) {
            // Show success feedback
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").style.color = "#4CAF50";
            // document.getElementById("errorNotification").innerHTML = "Tabs saved successfully!";
            
            // Hide the notification after 2 seconds
            setTimeout(() => {
                document.getElementById("errorNotification").style.display = "none";
                document.getElementById("errorNotification").style.color = "#ff5555";
                document.getElementById("errorNotification").innerHTML = "";
            }, 2000);
        } else {
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").style.color = "#ff5555";
            document.getElementById("errorNotification").innerHTML = "Failed to save tabs";
        }
    });
});

// LOADTABS BUTTON LISTENER
document.getElementById("loadTabs").addEventListener("click", () => {
    console.log("🔘 POPUP: Load Tabs button clicked - sending message to background script");
    chrome.runtime.sendMessage({ action: "loadLatestTabs" }, (response) => {
        if (response && response.success) {
            // Show success feedback
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").style.color = "#4CAF50";
            // document.getElementById("errorNotification").innerHTML = "Tabs loaded successfully!";
            
            // Hide the notification after 2 seconds
            setTimeout(() => {
                document.getElementById("errorNotification").style.display = "none";
                document.getElementById("errorNotification").style.color = "#ff5555";
                document.getElementById("errorNotification").innerHTML = "";
            }, 2000);
        } else {
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").style.color = "#ff5555";
            document.getElementById("errorNotification").innerHTML = response.error || "No previously saved tabs found";
        }
    });
});

// ------------------------------------------------
// CHECKBOX EVENT LISTENERS:
// ------------------------------------------------

// AUTO OPEN Checkbox
document.getElementById("autoOpenCheckbox").addEventListener("change", (e) => {
    if (e.target.checked) {
        chrome.runtime.sendMessage({ action: "autoOpenChecked" });
    } else {
        chrome.runtime.sendMessage({ action: "autoOpenUnchecked" });
    }
});

// AUTO SAVE Checkbox
document.getElementById("autoSaveCheckbox").addEventListener("change", (e) => {
    if (e.target.checked) {
        chrome.runtime.sendMessage({ action: "autoSaveChecked" });
    } else {
        chrome.runtime.sendMessage({ action: "autoSaveUnchecked" });
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
    if (isNumeric(mins) && mins >= 1) {
        document.getElementById("inputNotification").innerHTML = "";
        document.getElementById("inputNotification").style.display = "none";
        chrome.runtime.sendMessage({ 
            action: "setAutoSaveMins", 
            minutes: e.target.value 
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
document
    .getElementById("autoOpenSwitchCaption")
    .addEventListener("mouseenter", function (event) {
        var hiddenElement = document.getElementById("autoOpenDesc");
        hiddenElement.style.display = "block";
    });

// Hover OFF AutoOpen Description Event Listener:
document
    .getElementById("autoOpenSwitchCaption")
    .addEventListener("mouseleave", function (event) {
        var hiddenElement = document.getElementById("autoOpenDesc");
        hiddenElement.style.display = "none";
    });

// Hover ON AutoSave Description Event Listener:
document
    .getElementById("autoSaveSwitchCaption")
    .addEventListener("mouseenter", function (event) {
        var hiddenElement = document.getElementById("autoSaveDesc");
        hiddenElement.style.display = "block";
    });

// Hover OFF AutoSave Description Event Listener:
document
    .getElementById("autoSaveSwitchCaption")
    .addEventListener("mouseleave", function (event) {
        var hiddenElement = document.getElementById("autoSaveDesc");
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
    console.log("🔘 POPUP: Export Tabs button clicked - sending message to background script");
    chrome.runtime.sendMessage({ action: "exportTabs" }, (response) => {
        if (response && response.success) {
            // Show success feedback
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").style.color = "#4CAF50";
            document.getElementById("errorNotification").innerHTML = "Tabs exported to bookmarks successfully!";
            
            // Hide the notification after 3 seconds
            setTimeout(() => {
                document.getElementById("errorNotification").style.display = "none";
                document.getElementById("errorNotification").style.color = "#ff5555";
                document.getElementById("errorNotification").innerHTML = "";
            }, 3000);
        } else {
            document.getElementById("errorNotification").style.display = "block";
            document.getElementById("errorNotification").style.color = "#ff5555";
            document.getElementById("errorNotification").innerHTML = "Failed to export tabs to bookmarks";
        }
    });
});

// dark / light mode easter egg listener ;)
document.getElementById("daynnite").addEventListener("click", () => {
    chrome.storage.local.get("theme", (result) => {
        if (result.theme != undefined) {
            var switchToTheme = result.theme === "dark" ? "light" : "dark"; // toggle theme
        } else {
            var switchToTheme = "light"; // if no theme saved, default is dark, so toggle to light
        }
        document.documentElement.setAttribute("userTheme", switchToTheme);

        // save their latest choice back to local storage
        chrome.runtime.sendMessage({
            action: "genericChromeStorageSaver",
            key: "theme",
            value: switchToTheme
        });
    });
});
