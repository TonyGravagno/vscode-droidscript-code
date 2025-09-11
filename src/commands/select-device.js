const vscode = require('vscode');
const localData = require('../local-data');

/**
 * Show QuickPick to choose a stored DroidScript endpoint.
 */
module.exports = async function selectDevice() {
    // Load cached configuration to access saved endpoints.
    const config = localData.load();

    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Enter IP Address: 192.168.254.112:8088';
    quickPick.ignoreFocusOut = true;
    // Pre-populate with recently used endpoints.
    quickPick.items = config.serverIPs.map(ip => ({ label: ip }));

    const endpoint = await new Promise(resolve => {
        quickPick.onDidAccept(() => {
            const value = quickPick.selectedItems[0]?.label || quickPick.value;
            quickPick.hide();
            resolve(value);
        });
        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve(undefined);
        });
        quickPick.show();
    });

    if (!endpoint) return;
    // Normalize the chosen endpoint and persist it.
    const value = endpoint.trim().replace(/^https?:\/\//, '');
    const [host, portPart] = value.split(':');
    const port = portPart || config.PORT || '8088';
    const ep = `${host}:${port}`;

    config.serverIP = `http://${ep}`;
    config.PORT = port;
    config.serverIPs = [ep, ...config.serverIPs.filter(h => h !== ep)].slice(0, 10);
    localData.save(config);

    vscode.window.showInformationMessage(`Selected DroidScript device ${ep}`);
};
