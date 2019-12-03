const { logger, packageInfos, clipboardDB, appName } = require("./config");
const settings = require("./settings");
const updater = require("./updater.js");

const { app, Menu, Tray, clipboard, globalShortcut } = require("electron");
const path = require("path");
const md5 = require("md5");

/* Tray elements */
let tray = null;

const emptyFillerMenu = { label: "clipboard is empty", enabled: false };
const titleMenu1 = {
  label: `${appName} v${packageInfos.version}          `,
  enabled: false
};
const titleMenu2 = {
  label: `_____________________Clipboard History________________________`,
  enabled: false
};
const menuSeparator = {
  label: "______________________________________________________________",
  enabled: false
};

const clearAllMenu = {
  label: "Clear All",
  click: clearAllHistory,
  accelerator: "Command+Alt+c"
};

const quitMenu = { label: "Quit", click: app.quit, accelerator: "Command+Q" };

const settingsMenu = {
  label: "Settings",
  submenu: []
};
const settingsAutoStartEntry = {
  label: "Launch on System startup",
  click: setAutostart,
  type: "radio"
};
settingsMenu.submenu.push(settingsAutoStartEntry);

const settingsLimitEntry = {
  label: "Clipboard Limit",
  submenu: []
};
for (const limit of [30, 50, 100, 200, 400]) {
  settingsLimitEntry.submenu.push({
    label: String(limit),
    value: limit,
    click: setClipboardLimit,
    type: "radio"
  });
}
settingsMenu.submenu.push(settingsLimitEntry);

/* Tray elements  end */

/**
 * Clear history from database
 */
function clearAllHistory() {
  clipboardDB.remove({}, { multi: true }, function(err, numRemoved) {
    if (err) {
      logger.error("Error in clearing history: ", err);
    } else {
      updateTray();
    }
  });
}

/**
 * Set clipboard limit value
 * @param {Number} value clipboard limit size
 */
async function setClipboardLimit(value) {
  try {
    await settings.set("clipboardLimit", value.value);
    await updateTray();
  } catch (error) {
    logger.error("setClipboardLimit error: ", error);
  }
}

/**
 * Set auto start
 */
async function setAutostart() {
  try {
    const value = !settingsAutoStartEntry.checked;
    await settings.set("autoStart", value);
    await updateTray();
  } catch (error) {
    logger.error("setAutostart error: ", error);
  }
}

/**
 * get clipboard limit value from db
 * @return {Number}
 */
async function getClipboardLimit() {
  const clipboardLimit = await settings.get("clipboardLimit");
  for (const limitEntry of settingsLimitEntry.submenu) {
    if (limitEntry.value == clipboardLimit) {
      limitEntry.checked = true;
    } else {
      limitEntry.checked = false;
    }
  }
  return clipboardLimit;
}

/**
 * get autostart from db
 */
async function getAutostart() {
  const autoStart = await settings.get("autoStart");
  settingsAutoStartEntry.checked = autoStart ? true : false;
  return autoStart;
}

/**
 * Read clipboard history from database
 * @return {Promise}
 */
function getClipboardItems() {
  return new Promise(async (resolve, reject) => {
    const clipboardLimit = await getClipboardLimit();
    clipboardDB
      .find({})
      .sort({ updated_at: -1 })
      .limit(clipboardLimit)
      .exec(function(err, results) {
        if (err) {
          logger.error("DB clipboard find error: ", err);
          return reject(err);
        }
        return resolve(results);
      });
  });
}

/**
 *
 * @param {Any} r
 */
function historyClick(r) {
  if (r.use_label) {
    clipboard.writeText(r.label);
  } else {
    clipboardDB.findOne({ _id: r._id }, function(err, result) {
      if (err) {
        return logger.error("[historyClick]Error in reading DB", err);
      }
      clipboard.writeText(result.text);
    });
  }
}

/**
 *
 * @param {Any} params
 */
async function createTray() {
  try {
    if (!tray || tray.isDestroyed()) {
      tray = new Tray(path.join(__dirname, "images/16x16.png"));
    }
    tray.setToolTip(packageInfos.description);
    tray.setTitle(appName);
    tray.on("right-click", () => {
      tray.popUpContextMenu();
    });
  } catch (exception) {
    logger.error("Exception in create tray: ", exception);
  }
}

/**
 *
 * @param {Any} params
 */
async function updateTray(params) {
  try {
    if (!params) params = {};

    await getAutostart();
    await getClipboardLimit();

    const results = await getClipboardItems();

    const trayItems = [titleMenu1, titleMenu2];

    if (results.length === 0) {
      trayItems.push(emptyFillerMenu);
    }
    let i = 1;
    for (const item of results) {
      if (item.text && item._id) {
        const trayEntry = {
          _id: item._id,
          label: item.text.slice(0, 50),
          click: historyClick,
          accelerator: `Command+${i}`
        };
        if (item.text.length <= 50) {
          trayEntry.use_label = true;
        }
        trayItems.push(trayEntry);
        i++;
      }
    }
    trayItems.push(menuSeparator, clearAllMenu, settingsMenu, quitMenu);

    if (!tray || tray.isDestroyed()) {
      createTray();
    }
    const contextMenu = Menu.buildFromTemplate(trayItems);
    tray.setContextMenu(contextMenu);

    setTimeout(() => {
      if (params.popup) tray.popUpContextMenu();
    }, 100);
  } catch (exception) {
    logger.error("Exception in update tray: ", exception);
  }
}

/**
 * Watch clipboard
 */
function clipboardWatch() {
  let currentValue = clipboard.readText();
  setInterval(async () => {
    try {
      const newValue = clipboard.readText();
      if (currentValue !== newValue) {
        currentValue = newValue;
        await saveClipboard(currentValue);
      }
    } catch (error) {
      logger.error("error in clipboard watch or saveToDb: ", err);
    }
  }, 200);
}

/**
 * Save settings to database
 * @param {String} text
 * @return {Promise}
 */
function saveClipboard(text) {
  return new Promise((resolve, reject) => {
    if (!text) {
      return resolve();
    }
    const doc = {
      hash: md5(text),
      text: text,
      updated_at: new Date()
    };
    clipboardDB.update(
      { hash: doc.hash },
      doc,
      { upsert: true },
      (err, numberOfUpdated, upsert) => {
        if (err) {
          logger.error("Error in in update settings: ", err);
          return reject(err);
        }
        if (upsert || numberOfUpdated) {
          updateTray();
        }
        return resolve({});
      }
    );
  });
}

if (process.platform == "darwin" && process.env.ENV != "development") {
  app.dock.hide();
}
// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  globalShortcut.register("CommandOrControl+Alt+h", () => {
    updateTray({
      disabled: true,
      popup: true
    });
  });

  clipboardWatch();
  createTray();
  updateTray();
  updater.checkForUpdates();
  if (process.platform == "darwin" && process.env.ENV != "development") {
    app.dock.hide();
  }
});
