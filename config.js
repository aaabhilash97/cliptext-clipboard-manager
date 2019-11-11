const packageInfos = require('./package.json');

const logger = require('electron-log');
const NeDB = require('nedb');
const path = require('path');
const fs = require('fs');

logger.transports.file.level = 'error';
logger.transports.console.level = 'debug';


const DBDir = path.join(getUserHome(), `.${packageInfos.name}`);

try {
  fs.accessSync(DBDir);
} catch (err) {
  fs.mkdirSync(DBDir);
}

/**
 * Get Home folder for current  user
 * @return {string} User home folder path
 */
function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

const clipboardDB = new NeDB(
    {filename: path.join(DBDir, '/.clipboarddbv2'), autoload: true});
const settingsDB = new NeDB(
    {filename: path.join(DBDir, '/.clipboarddbprefv2'), autoload: true});

settingsDB.ensureIndex({fieldName: 'key', unique: true}, function(err) {
  if (err) console.error(err);
});

clipboardDB.ensureIndex({fieldName: 'updated_at'}, function(err) {
  if (err) console.error(err);
});
clipboardDB.ensureIndex({fieldName: 'hash'}, function(err) {
  if (err) console.error(err);
});

module.exports = {
  logger: logger,
  packageInfos: packageInfos,
  DBDir: DBDir,
  clipboardDB: clipboardDB,
  settingsDB: settingsDB,
  appName: packageInfos.name,
  isDevelopment: process.env.ENV === 'development',
};

