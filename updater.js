const {logger, packageInfos} = require('./config');

const {autoUpdater} = require('electron');
const got = require('got');
const semver = require('semver');


const appVersion = packageInfos.version;

const options = {
  repo: 'https://raw.githubusercontent.com/aaabhilash97/cliptext/master/auto_updater.json',
};

/**
 * Start update checker
 */
function checkForUpdates() {
  setInterval(async ()=>{
    try {
      let data = await got(options.repo);
      data = JSON.parse(data.body);
      const regex = /-(\d+\.\d+\.\d+)-/;
      const version = data.url.match(regex);
      if (semver.gt(version[1], appVersion)) {
        autoUpdater.setFeedURL(options.repo);
        autoUpdater.on('checking-for-update', ()=>{
          logger.info('checking for updates');
        });
        autoUpdater.on('update-available', ()=>{
          logger.info('update-available');
        });
        autoUpdater.on('update-not-available', ()=>{
          logger.info('update-not-available');
        });
        autoUpdater.on('update-downloaded', ()=>{
          autoUpdater.quitAndInstall();
        });
        autoUpdater.checkForUpdates();
      }
    } catch (error) {
      logger.error('Error in checking update', error);
    }
  }, 1000000);
}

module.exports = {
  checkForUpdates: checkForUpdates,
};
