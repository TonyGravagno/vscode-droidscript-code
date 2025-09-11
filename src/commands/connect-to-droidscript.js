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

        await tryEndpoints();
    } else {
        if (CONNECTED) {
            const res = await vscode.window.showInformationMessage("Status: Connected", "Reload", "Disconnect");
            if (res == "Disconnect") vscode.commands.executeCommand("droidscript-code.disconnect");
            if (res != "Reload") return;
        }
        if (!DSCONFIG.serverIP) await showIpPopup();
        else await connectWith(DSCONFIG.serverIP.replace(/https?:\/\//, '').split(':')[0], DSCONFIG.PORT, true);
    }
}

// display a popup dialog to enter ip address
async function showIpPopup() {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Enter IP Address: 192.168.254.112:8088';
    quickPick.ignoreFocusOut = true;
    quickPick.items = DSCONFIG.serverIPs.map(ip => ({ label: ip }));
    return new Promise(resolve => {
        quickPick.onDidAccept(async () => {
            const value = quickPick.selectedItems[0]?.label || quickPick.value;
            quickPick.hide();
            if (!value) { resolve(showIpPopup()); return; }
            const input = value.trim().replace(/^https?:\/\//, '');
            const [host, portPart] = input.split(':');
            const port = portPart || DSCONFIG.PORT || '8088';
            const endpoint = `${host}:${port}`;
            DSCONFIG.serverIPs = DSCONFIG.serverIPs.filter(h => h !== endpoint);
            DSCONFIG.serverIPs.unshift(endpoint);
            DSCONFIG.serverIPs = DSCONFIG.serverIPs.slice(0, 10);
            localData.save(DSCONFIG);
            STATUS && STATUS(`Trying ${endpoint}`);
            await tryEndpoints();
            resolve();
        });
        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve();
        });
        quickPick.show();
    });
}
// iterate through stored endpoints until one connects
async function tryEndpoints() {
    const endpoints = DSCONFIG.serverIPs;
    for (let i = 0; i < endpoints.length; i++) {
        const [host, port = DSCONFIG.PORT] = endpoints[i].split(':');
        STATUS && STATUS(`Trying ${host}:${port}`);
        const connected = await connectWith(host, port, false);
        if (connected) return;
    }
    STATUS && STATUS();
    await showIpPopup();
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
    const endpoint = `${host}:${port}`;
    DSCONFIG.serverIPs = DSCONFIG.serverIPs.filter(h => h !== endpoint);
    DSCONFIG.serverIPs.unshift(endpoint);
    DSCONFIG.serverIPs = DSCONFIG.serverIPs.slice(0, 10);

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
