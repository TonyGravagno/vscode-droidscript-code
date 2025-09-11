// function to connect a workspace to DroidScript server

const vscode = require('vscode');

const ext = require("../dsclient");
const localData = require("../local-data");

// Reusable guidance shown when a connection attempt fails.
const CONNECTION_FAILED_MSG =
    "Connection failed. Make sure the DS App is running \n" +
    "and IP:Port endpoint is correct.\n" +
    "Select endpoint from above or enter a new endpoint.";

/** @type {DSCONFIG_T} */
let DSCONFIG;
/** @type {() => void} */
let CALLBACK;
/** @type {(msg?: string) => void} */
let STATUS;
/** Flag to abort endpoint attempts */
let cancelTry = false;

/** @param {() => void} callback @param {(msg?: string) => void} status */
module.exports = async function (callback, status) {
    DSCONFIG = localData.load();
    CALLBACK = callback;
    STATUS = status;

    if (true) {
        if (CONNECTED) {
            const res = await vscode.window.showInformationMessage("Status: Connected", "Reload", "Disconnect");
            if (res == "Disconnect") vscode.commands.executeCommand("droidscript-code.disconnect");
            if (res != "Reload") { STATUS && STATUS(); return; }
        }

        await tryEndpoints();
    } else {
        if (CONNECTED) {
            const res = await vscode.window.showInformationMessage("Status: Connected", "Reload", "Disconnect");
            if (res == "Disconnect") vscode.commands.executeCommand("droidscript-code.disconnect");
            if (res != "Reload") return;
        }
        if (!DSCONFIG.serverIP) await vscode.commands.executeCommand("droidscript-code.selectDevice");
        else await connectWith(DSCONFIG.serverIP.replace(/https?:\/\//, '').split(':')[0], DSCONFIG.PORT, true);
    }
}

// expose cancel function so the status bar can interrupt connection attempts
module.exports.cancel = () => {
    cancelTry = true;
};

// iterate through stored endpoints until one connects
async function tryEndpoints() {
    const endpoints = DSCONFIG.serverIPs;
    for (let i = 0; i < endpoints.length; i++) {
        if (cancelTry) {
            cancelTry = false;
            STATUS && STATUS();
            await vscode.commands.executeCommand("droidscript-code.selectDevice");
            return;
        }
        const [host, port = DSCONFIG.PORT] = endpoints[i].split(':');
        STATUS && STATUS(`Trying ${host}:${port}`);
        const connected = await connectWith(host, port, false);
        if (connected) return;
    }
    cancelTry = false;
    STATUS && STATUS();
    await showConnectionFailed();
}

/** Attempt connection to given host and port. */
async function connectWith(host, port, showError) {
    DSCONFIG.serverIP = `http://${host}:${port}`;
    DSCONFIG.PORT = port;
    let info = await ext.getServerInfo(`http://${host}:${port}`);
    if (!info || info.status !== "ok") {
        STATUS && STATUS();
        if (showError) await showConnectionFailed();
        return false;
    }

    Object.assign(DSCONFIG.info, info);

    if (DSCONFIG.info.usepass) {
        let ok = false;
        if (DSCONFIG.password) ok = await login(DSCONFIG.password);
        if (!ok) ok = await showPasswordPopup();
        if (!ok) return false;
    }

    // remember successful connection
    const endpoint = `${host}:${port}`;
    DSCONFIG.serverIPs = DSCONFIG.serverIPs.filter(h => h !== endpoint);
    DSCONFIG.serverIPs.unshift(endpoint);
    DSCONFIG.serverIPs = DSCONFIG.serverIPs.slice(0, 10);

    localData.save(DSCONFIG);
    STATUS && STATUS();
    CALLBACK();
    return true;
}

// Notify the user and open the Select Device picker.
async function showConnectionFailed() {
    void vscode.window.showErrorMessage(CONNECTION_FAILED_MSG);
    await vscode.commands.executeCommand("droidscript-code.selectDevice");
}

// Display a popup dialog to enter password
/**
 * @param {string} msg
 * @param {string} placeHolder
 */
async function showPasswordPopup(msg = "", placeHolder = "Enter Password") {
    const options = {
        prompt: msg,
        placeHolder: placeHolder,
        ignoreFocusOut: true
    };
    const value = await vscode.window.showInputBox(options);
    if (value === undefined) return false;
    return await login(value);
}

// Login
/** @return {Promise<boolean>} */
async function login(pass = '') {
    let data = await ext.login(pass);

    if (!data) {
        const selection = await vscode.window.showWarningMessage("IP Address cannot be reached.", "Retry", "Re-enter IP Address")
        if (selection === "Retry") login(pass);
        else if (selection === "Re-enter IP Address") await vscode.commands.executeCommand("droidscript-code.selectDevice");
        return false;
    }

    if (data.status !== "ok")
        return await showPasswordPopup("Password is incorrect.", "Re-enter password");

    // to be use in DroidScript CLI
    DSCONFIG.password = pass;
    localData.save(DSCONFIG);
    return true;
}
