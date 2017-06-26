const GhReleases = require('electron-gh-releases');
const package_json = require("./package.json");
var logger = require('electron-log');
logger.transports.file.level = 'error';
logger.transports.console.level = 'debug';
let options = {
    repo: 'aaabhilash97/cliptext',
    currentVersion: package_json.version
};

try{

    const updater = new GhReleases(options);

    // Check for updates
    // `status` returns true if there is a new update available
    setInterval(()=>{
        updater.check((err, status) => {
            if (!err && status) {
                // Download the update
                updater.download();
            }
        });
    }, 10000);

    // When an update has been downloaded
    updater.on('update-downloaded', (info) => {
        // Restart the app and install the update
        logger.info("update downloaded", info);
        updater.install();
    });

    // Access electrons autoUpdater
    logger.info(updater.autoUpdater);
}catch(ex){
    logger.error("update error", ex);
}
