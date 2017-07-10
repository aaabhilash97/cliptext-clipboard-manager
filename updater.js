const package_json = require("./package.json");
const {autoUpdater} = require('electron');
const got = require('got');
const appVersion = package_json.version;
var semver = require('semver');
var logger = require('electron-log');
logger.transports.file.level = 'error';
logger.transports.console.level = 'debug';
let options = {
    repo: 'https://raw.githubusercontent.com/aaabhilash97/cliptext/master/auto_updater.json'
};

try{
    setInterval(()=>{
        got(options.repo).then((data)=>{
            data = JSON.parse(data.body);
            let regex = /-(\d+\.\d+\.\d+)-/;
            let version = data.url.match(regex);
            if(semver.gt(version[1], appVersion)){
                autoUpdater.setFeedURL(options.repo);
                autoUpdater.on("checking-for-update", ()=>{
                    logger.info("checking for updates");
                });
                autoUpdater.on("update-available", ()=>{
                    logger.info("update-available");
                });
                autoUpdater.on("update-not-available", ()=>{
                    logger.info("update-not-available");
                });
                autoUpdater.on("update-downloaded", ()=>{
                    autoUpdater.quitAndInstall();
                });
                autoUpdater.checkForUpdates();
            }
        }).catch((ex)=>{
            logger.error(ex);
        });
    }, 1000000);
}catch(ex){
    logger.error("update error", ex);
}
