// module to load the local droidscript jso configuration

const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const CONSTANTS = require("./CONSTANTS");

/** @type {DSCONFIG_T} */
const data = {
  VERSION: CONSTANTS.VERSION,
  serverIP: "",
  serverIPs: [],
  reload: "",
  PORT: CONSTANTS.PORT,
  localProjects: [],
  info: {},
};

function load() {
  if (global._dsconf_data) return global._dsconf_data;
  migrateConfigFile();
  const filePath = path.join(os.homedir(), CONSTANTS.DSCONFIG_FILE);
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, "utf8");
    Object.assign(data, JSON.parse(fileData));

    if (data.VERSION != CONSTANTS.VERSION)
      console.log("version change", data.VERSION, "->", CONSTANTS.VERSION);
    adjust(data);
  }

  return (global._dsconf_data = data);
}

/**
 * v0.3.6+, ~/dsconfig.json migrates to ~/.droidscript/dsconfig.json
 */
function migrateConfigFile() {
  const oldFilePath = path.join(os.homedir(), "dsconfig.json");
  if (!fs.existsSync(oldFilePath)) return;
  const newFilePath = path.join(os.homedir(), CONSTANTS.DSCONFIG_FILE);
  fs.moveSync(oldFilePath, newFilePath);
}

/** @param {DSCONFIG_T} CONFIG */
function save(CONFIG = data) {
  if (CONFIG != data) console.error("invalid data");
  const strdata = JSON.stringify(adjust(CONFIG), null, 2);
  const filePath = path.join(os.homedir(), CONSTANTS.DSCONFIG_FILE);
  fs.writeFileSync(filePath, strdata);
}

/** @param {DSCONFIG_T} config */
function adjust(config) {
  if (!config.localProjects) config.localProjects = [];
  if (!config.info) config.info = {};
  if (!config.serverIPs) config.serverIPs = [];

  config.serverIPs = config.serverIPs
    .map((h) => {
      const [host, port] = h.replace(/^https?:\/\//, "").split(":");
      return `${host}:${port || config.PORT || CONSTANTS.PORT}`;
    })
    .filter((h, i, a) => h && a.indexOf(h) === i);

  // normalize serverIP and seed recent list
  if (config.serverIP) {
    config.serverIP = config.serverIP.replace(
      /(https?:\/\/)?([^:]+)(:(\d+))?/,
      (_, r = "http://", host = "", _p, p = config.PORT) => {
        config.PORT = p;
        const endpoint = `${host}:${p}`;
        config.serverIPs = [
          endpoint,
          ...config.serverIPs.filter((h) => h !== endpoint),
        ];
        return `${r}${endpoint}`;
      }
    );
  }

  config.serverIPs = config.serverIPs.slice(0, 10);

  config.localProjects = config.localProjects.filter(
    (m) => m?.path && fs.existsSync(m.path)
  );
  for (const p of config.localProjects) p.path = path.resolve(p.path);
  return config;
}

/**
 * @param {Parameters<LocalProject[]['find']>[0]} filter
 * @param {DSCONFIG_T} CONFIG
 */
const getProject = (filter, CONFIG = data) => CONFIG.localProjects.find(filter);

/**
 * @param {string} name
 * @param {DSCONFIG_T} CONFIG
 */
const getProjectByName = (name, CONFIG = data) =>
  CONFIG.localProjects.find((p) => p.PROJECT == name);

/**
 * @param {string} file
 * @param {DSCONFIG_T} CONFIG
 */
const getProjectByFile = (file, CONFIG = data) =>
  CONFIG.localProjects.find((p) => file.startsWith(p.path + path.sep));

module.exports = {
  load,
  save,
  getProject,
  getProjectByName,
  getProjectByFile,
};
