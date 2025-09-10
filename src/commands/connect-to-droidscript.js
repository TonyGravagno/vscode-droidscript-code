// function to connect a workspace to DroidScript server

const vscode = require('vscode');

const ext = require("../dsclient");
const localData = require("../local-data");

/** @type {DSCONFIG_T} */
let DSCONFIG;
/** @type {() => void} */
let CALLBACK;
/** @type {(msg?: string) => void} */
let STATUS;

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

        const ips = DSCONFIG.serverIPs;
        const ports = DSCONFIG.PORTs;
        let connected = false;
        for (let i = 0; i < Math.min(ips.length, ports.length); i++) {
            const ip = ips[i];
            const port = ports[i];
            STATUS && STATUS(`Trying ${ip}:${port}`);
            connected = await connectWith(ip, port, false);
            if (connected) break;
        }
        if (!connected) {
            STATUS && STATUS();
            showIpPopup();
        }
    } else {
        if (CONNECTED) {
            const res = await vscode.window.showInformationMessage("Status: Connected", "Reload", "Disconnect");
            if (res == "Disconnect") vscode.commands.executeCommand("droidscript-code.disconnect");
            if (res != "Reload") return;
        }
        if (!DSCONFIG.serverIP) showIpPopup();
        else await connectWith(DSCONFIG.serverIP.replace(/https?:\/\//, '').split(':')[0], DSCONFIG.PORT, true);
    }
}

// display a popup dialog to enter ip address
async function showIpPopup() {
    const options = {
        placeHolder: 'Enter IP Address: 192.168.254.112:8088',
        ignoreFocusOut: true
    };
    const value = await vscode.window.showInputBox(options);
    if (!value) {
        if (value !== undefined) showIpPopup();
        return;
    }
    const [host, port = DSCONFIG.PORT] = value.trim().split(':');
    STATUS && STATUS(`Trying ${host}:${port}`);
    await connectWith(host, port, true);
}

/** Attempt connection to given host and port. */
async function connectWith(host, port, showError) {
    DSCONFIG.serverIP = `http://${host}:${port}`;
    DSCONFIG.PORT = port;
    let info = await ext.getServerInfo(`http://${host}:${port}`);
    if (!info || info.status !== "ok") {
        if (showError) {
            const selection = await vscode.window.showErrorMessage(
                "Make sure the DS App is running and IP Address is correct.",
                "Retry",
                "Re-enter IP Address"
            );
            if (selection === "Retry") {
                STATUS && STATUS(`Trying ${host}:${port}`);
                return connectWith(host, port, true);
            } else if (selection === "Re-enter IP Address") {
                showIpPopup();
            }
        }
        STATUS && STATUS();
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
    DSCONFIG.serverIPs = DSCONFIG.serverIPs.filter(h => h !== host);
    DSCONFIG.PORTs = DSCONFIG.PORTs.filter(p => p !== port);
    DSCONFIG.serverIPs.unshift(host);
    DSCONFIG.PORTs.unshift(port);

    localData.save(DSCONFIG);
    STATUS && STATUS();
    CALLBACK();
    return true;
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
        else if (selection === "Re-enter IP Address") showIpPopup();
        return false;
    }

    if (data.status !== "ok")
        return await showPasswordPopup("Password is incorrect.", "Re-enter password");

    // to be use in DroidScript CLI
    DSCONFIG.password = pass;
    localData.save(DSCONFIG);
    return true;
}
