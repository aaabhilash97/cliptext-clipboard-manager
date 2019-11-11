const {logger, appName, isDevelopment, settingsDB} = require('./config');

const AutoLaunch = require('auto-launch');

const autoLaunch = new AutoLaunch({
  name: appName,
  mac: {
    useLaunchAgent: true,
  },
});


let initSync = false;
const settings = {
  clipboardLimit: 30,
  autoStart: true,
};

/**
 * @return {Promise}
 */
function sync() {
  return new Promise((resolve, reject)=>{
    settingsDB.find({}).exec(async (error, results) =>{
      try {
        if (error) {
          logger.error('Error in fetching settings from DB:', error);
          return reject(error);
        }
        for (const result of results) {
          settings[result.key] = result.value;
        }
        initSync = true;
        return resolve(settings);
      } catch (error) {
        logger.debug('Error in reading or apply settings: ', error);
        return reject(error);
      }
    });
  });
}

/**
 * Save settings to database
 * @param {String} key
 * @param {Any} value
 * @return {Promise}
 */
function saveToDB(key, value) {
  return new Promise((resolve, reject)=>{
    settingsDB.update(
        {key: key},
        {key, key, value: value},
        {upsert: true},
        (err)=> {
          if (err) {
            console.error(err);
            logger.error('Error in in update settings: ', err);
            return reject(err);
          }
          return resolve({
            [key]: value,
          });
        });
  });
}


/**
 * Get settings from store
 * @param {string} key setting key
 * @return {Any} setting value
 */
async function get(key) {
  if (!initSync) {
    await sync();
    if (!isDevelopment && settings.autoStart) {
      const enabled = await autoLaunch.isEnabled();
      logger.debug('autostart status: ', enabled);
      if (!enabled) await autoLaunch.enable();
    } else {
      await autoLaunch.disable();
    }
  }
  return settings[key];
}

/**
 *
 * @param {String} key
 * @param {Any} value
 */
async function set(key, value) {
  settings[key] = value;
  await saveToDB(key, value);
}

module.exports = {
  get: get,
  set: set,
};
