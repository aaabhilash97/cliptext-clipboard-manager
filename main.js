var logger = require('electron-log');
logger.info("init........");
const { app } = require('electron');
const Sequelize = require('sequelize');
const path = require('path');
const db = new Sequelize({
    dialect: 'sqlite', // SQLite only
    storage: path.join(getUserHome(), '.database.sqlite'),
    logging: false
});

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

db.authenticate()
    .then(() => {
        logger.info('Connection has been established successfully.');
    })
    .catch(err => {
        logger.error('Unable to connect to the database:', err);
    });
const clipDb = db.define('clipboards', {
    id: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    text: {
        type: Sequelize.STRING
    },
    date: {
        type: Sequelize.DATE
    }
});
// force: true will drop the table if it already exists
clipDb.sync({ force: false }).then(() => {
    // Table created
}).catch((ex) => {
    logger.error(ex);
});



var md5 = require('md5');
var AutoLaunch = require('auto-launch');

var minecraftAutoLauncher = new AutoLaunch({
    name: 'clipit',
    path: '/Applications/clipit.app',
});

minecraftAutoLauncher.enable();
const { Menu, Tray, clipboard } = require('electron');

let tray = null;

function clearHistory() {
    clipDb.destroy({truncate: true}).catch(()=>{
    }).then(()=>{
        createTray();
    });
}

function createTray(params) {
    if (!params) params = {};
    try {

        clipDb.findAll({
            attributes: ['text'],
            order: [
                ['updatedAt', 'DESC']
            ]
        }).then((r) => {
            let trayItems = [
                { label: '      Quit      ', click: app.quit, enabled: params.disabled ? false : true },
                { label: '      Clear      ', click: clearHistory, enabled: params.disabled ? false : true },
                { label: '                                 ', enabled: false }
            ];
            for (let item of r) {
                if (item.text) {
                    trayItems.push({
                        label: item.text.slice(0, 50),
                        value: item.text,
                        click: function(r) {
                            clipboard.writeText(r.value);
                        }
                    });
                }
            }
            if (trayItems.length == 3) {
                trayItems.push({ label: 'clipboard is empty', enabled: false });
            }
            if (tray && !tray.isDestroyed()) {
                tray.destroy();
            }
            tray = new Tray('./images/16x16.png');
            const contextMenu = Menu.buildFromTemplate(trayItems);
            tray.setToolTip('This is my application.');
            tray.setContextMenu(contextMenu);
            tray.setTitle("clipit");
            // tray.on('click', () => {
            //     logger.info('tray click');
            //     createTray();
            // });
            setTimeout(()=>{

                if (params.popup) tray.popUpContextMenu();
            }, 300);
        }).catch((e) => {
            logger.error("ssasasas", e);
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
});


function upsert(values, condition) {
    return clipDb
        .findOne({ where: { id: condition.id } })
        .then(function(obj) {
            if (obj) { // update
                values.date = new Date();
                return obj.update(values).catch((e) => {
                    logger.debug(e);
                }).then((e) => {
                    logger.debug(e);
                    createTray();
                });
            } else { // insert
                return clipDb.create(values).catch((e) => {
                    logger.debug(e);
                }).then((e) => {
                    logger.debug(e);
                    createTray();
                });
            }
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
            upsert(doc, doc);
        }
    }, 500);
}

app.dock.hide();
// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
