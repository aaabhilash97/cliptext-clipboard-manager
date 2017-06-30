//export XDG_CURRENT_DESKTOP=Unity
var logger = require('electron-log');
logger.transports.file.level = 'error';
logger.transports.console.level = 'debug';
logger.debug("init........");
const { app, BrowserWindow } = require('electron');
const path = require('path');
var Datastore = require('nedb');
const fs = require('fs');
const package_json = require("./package.json");
const DB_DIR = path.join(getUserHome(), ".cliptext");
try {
    fs.accessSync(DB_DIR);
} catch (err) {
    fs.mkdirSync(DB_DIR);
}

let db = new Datastore({ filename: path.join(DB_DIR, '/.clipboarddb'), autoload: true });
let prefDb = new Datastore({ filename: path.join(DB_DIR, '/.clipboarddbpref'), autoload: true });
db.ensureIndex({ fieldName: 'id', unique: true }, function() {});
prefDb.ensureIndex({ fieldName: 'type', unique: true }, function() {});
db.ensureIndex({ fieldName: 'index', unique: true }, function() {});

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

var md5 = require('md5');
var AutoLaunch = require('auto-launch');

var cliptext_auto_launch = new AutoLaunch({
    name: 'cliptext',
    mac: {
        useLaunchAgent: true
    }
});


const { Menu, Tray, clipboard } = require('electron');

let tray = null;

function clearHistory() {
    db.remove({}, { multi: true }, function(err, numRemoved) {
        if (err) logger.error('clearHistory: ', err);
        logger.debug("clear cliked", numRemoved);
        createTray();
    });
}

let clipbiard_limit = 10;
let auto_start = true;

prefDb.find({ type: "settings" }).exec(function(e, r) {
    if (e) return logger.error("get settings", e);
    if (r.length > 0) {
        clipbiard_limit = r[0].limit;
        auto_start = r[0].auto_start;
        if(process.env.ENV !== "development" && auto_start){
            cliptext_auto_launch.isEnabled().then((enabled)=>{
                logger.info("autostart", enabled);
                if(!enabled) cliptext_auto_launch.enable();
                createTray();
            });
        }else{
            cliptext_auto_launch.disable();
            createTray();
        }
    }
});

function limit_fn(value) {
    clipbiard_limit = value.value;
    upsert(prefDb, { type: "settings", limit: value.value }, { type: "settings" });
}

function setAutostart() {
    prefDb.findOne({type: "settings"}, function(e, r){
        if(e) return logger.error("error setAutostart", e);
        if(!r) r = {};
        auto_start = !(r.auto_start);
        upsert(prefDb, { type: "settings", auto_start: auto_start }, { type: "settings" });
    });
}

function clickFn(r) {
    db.findOne({index: r.index_c}, function(err, obj) {
        if(err || !obj) return logger.error("clickFn err", err);
        clipboard.writeText(obj.text);
    });
}

function createTray(params) {
    if (!params) params = {};
    try {
        db.find({}).sort({ date: -1 }).limit(clipbiard_limit).exec(function(err, r) {
            if (err) return logger.error("nedb find err", err);
            let trayItems = [
                { label: `cliptext v${package_json.version}          `, enabled: false },
                { label: `____________________Clipboard History_________________________`, enabled: false }
            ];

            if (r.length === 0) {
                trayItems.push({ label: 'clipboard is empty', enabled: false });
            }
            let i = 1;
            for (let item of r) {
                if (item.text) {
                    trayItems.push({
                        label: item.text.slice(0, 50),
                        index_c: item.index,
                        click: clickFn,
                        accelerator: `Command+${i}`
                    });
                    i++;
                }
            }
            trayItems.push({
                label: '_______________________________________________________________',
                enabled: false
            }, { label: 'Clear All', click: clearHistory, accelerator: 'Command+Alt+c' }, {
                label: "Clipboard Limit",
                submenu: [{
                    label: '10',
                    value: 10,
                    click: limit_fn,
                    type: "radio",
                    checked: clipbiard_limit == 10 ? true : false
                }, {
                    label: '30',
                    value: 30,
                    click: limit_fn,
                    type: "radio",
                    checked: clipbiard_limit == 30 ? true : false
                }, {
                    label: '50',
                    value: 50,
                    click: limit_fn,
                    type: "radio",
                    checked: clipbiard_limit == 50 ? true : false
                }, {
                    label: 'unlimited',
                    value: 300,
                    click: limit_fn,
                    type: "radio",
                    checked: clipbiard_limit == 300 ? true : false

                }]
            }, {
                label: "Settings", submenu: [{
                    label: 'Launch on System startup',
                    click: setAutostart,
                    type: "radio",
                    checked: auto_start?true:false
                }]
            },{ label: 'Quit', click: app.quit, accelerator: 'Command+Q' });
            if(!tray || tray.isDestroyed()) tray = new Tray(path.join(__dirname, 'images/16x16.png'));
            const contextMenu = Menu.buildFromTemplate(trayItems);
            tray.setToolTip('This is my application.');
            tray.setContextMenu(contextMenu);
            tray.setTitle("cliptext");
            tray.on('close', () => {
                logger.debug('tray click');
                createTray();
            });
            setTimeout(() => {
                if (params.popup) tray.popUpContextMenu();
            }, 300);
        });
    } catch (exc) {
        logger.error(exc);
    }
}

const { globalShortcut } = require('electron');

app.on('ready', () => {
    globalShortcut.register('CommandOrControl+Alt+h', () => {
        createTray({
            disabled: true,
            popup: true
        });
    });
    clipboardWatch();
    require("./updater.js");
    createWindow();
});

let clip_window;
const createWindow = () => {
    clip_window = new BrowserWindow({
        width: 350,
        height: 450,
        frame: false,
        fullscreenable: false,
        resizable: true,
        transparent: true
    });
    clip_window.loadURL(`file://${path.join(__dirname, 'public', 'index.html')}`);
    clip_window.webContents.openDevTools();
        // Hide the window when it loses focus
    clip_window.on('blur', () => {
        if (!clip_window.webContents.isDevToolsOpened()) {
            clip_window.hide();
        }
    });
};


function upsert(db, values, condition) {
    db.count({}, function (err, count) {
        if(err) return logger.error("count error", err);
        values.index = count + 1;
        db.insert(values, function(err) {
            if (err && err.errorType=='uniqueViolated'){
                db.findOne(condition, function(e, obj){
                    if(e || !obj) return logger.error("findOne/upsert error", e);
                    delete values.index;
                    Object.assign(obj, values);
                    obj.date = new Date();
                    db.update(condition, obj, {upsert: true}, function(err) {
                        if (err) return logger.error("upsert update : ", err);
                        createTray();
                    });
                });
            }else if(err){
                logger.error("upsert insert : ", err);
            }else{
                createTray();
            }
        });
    });
}

function clipboardWatch() {
    let cur_clipboard = clipboard.readText();
    createTray();
    setInterval(() => {
        let new_clip = clipboard.readText();
        if (cur_clipboard !== new_clip) {
            cur_clipboard = new_clip;
            let doc = {
                id: md5(cur_clipboard),
                "text": cur_clipboard,
                date: new Date()
            };
            upsert(db, doc, { id: doc.id });
        }
    }, 500);
}

if (process.platform == "darwin" && process.env.ENV!="development") app.dock.hide();
// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
