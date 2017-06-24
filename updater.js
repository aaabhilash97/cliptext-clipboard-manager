var logger = require('electron-log');
logger.transports.file.level = 'error';
logger.transports.console.level = 'debug';
try{
    const {autoUpdater} = require('electron');
    const appVersion = require('./package.json').version;

    var updateFeed = 'http://localhost:3000/updates/latest';

    autoUpdater.setFeedURL(updateFeed + '?v=' + appVersion);
}catch(exc){
    logger.error("update exception", exc);
}