# How It Works

This document explains the runtime flow of the DroidScript VSCode extension and how it manages device connections, projects, and developer tooling.

## Installation and Activation
- The extension activates when a workspace contains a `.dsproj` file, as defined in `package.json`.
- `extension.js` exports `activate()` which registers commands and providers, creates tree views for projects, docs, and samples, prepares the workspace, and ensures bundled assets are extracted.
- Tree views implemented by `ProjectsTreeView.js`, `DocsTreeView.js`, and `SamplesTreeView.js`.

## Extension Enablement
- `activate()` registers commands through a local `subscribe` helper. Commands range from connecting to a device, synchronizing files, running or stopping apps, to project management actions.
- Command implementations live in `src/commands/` such as `connect-to-droidscript.js` and `load-files.js`.
- Providers for completion items, hover information, signature help, and code actions are registered for JavaScript.
- Status bar items and tree views are established to interact with projects and documentation.

## Connecting to a Device
1. Users trigger the `droidscript-code.connect` command.
2. `connect-to-droidscript.js` prompts for the device IP and, if necessary, a password.
3. The module fetches server info using `dsclient.js`. On failure, retry or re-entry prompts are shown. On success, the supplied callback (the debug server’s start function) runs.
4. The callback initializes the WebSocket defined in `src/websocket.js`. `wsOnOpen()` marks the extension as connected, starts keep‑alive pings, and exposes a log channel for device output.
5. If connection fails, the progress message indicates failure and the user is offered options to retry or re‑enter the IP address.
6. `websocket.js` also defines `wsOnError` and `wsOnClose` to handle failures and cleanup.

### Device UI and Assets
- On first activation or when versions change, `extractAssets()` wipes and recreates `~/.droidscript`, populating it with bundled definitions.
- After a successful connection, `onDebugServerStart()` invokes `downloadDefinitions()` to pull `.d.ts` API files from the device into `~/.droidscript/definitions/ts`.
- Sample programs fetched from the device are stored under `~/.droidscript/samples` when opened.

### Connection Failure and Success
- When server info cannot be fetched or login fails, the user is notified and prompted to retry or adjust IP/password.
- When the WebSocket opens, `onDebugServerStart()` refreshes project and sample trees, checks for unsaved changes, and displays status bar controls.

## Disconnection
- A WebSocket close triggers `wsOnClose()`, which resets the `CONNECTED` flag and calls `onDebugServerStop()`.
- `onDebugServerStop()` hides status items, clears the current project, refreshes views, and prompts the user to reconnect.

## Opening a Project for Local Development
1. Selecting a project in the sidebar runs `openProject()`.
2. The extension checks `dsconfig.json` for an existing local copy; otherwise the user chooses a folder.
3. The project entry is saved to `dsconfig.json` and `openProjectFolder()` is called.
4. `openProjectFolder()` adds the folder to the VSCode workspace, creates a `.dsproj` file if missing, sets the current project name, and optionally syncs files from the device.

### Pulling a Project from the Device
- `openProject()` calls `openProjectFolder(proj, "dnlAll")` to force a full download when the project is new.
- `loadFiles()` prompts for the sync action. For downloads, `getAllFiles()` lists remote files via `indexFolder()`, creates needed directories, and writes each file locally using `writeFile()`.
- Downloaded files live inside the chosen project folder, which becomes part of the current workspace.

### Syncing and File Events
- File watchers (`onDidSaveTextDocument`, `onCreateFile`, `onDeleteFile`, `onRenameFile`) queue operations. When connected, pending actions upload, delete, or rename files on the device via `dsclient` functions.

## Configuration Files
- `dsconfig.json` in the user’s home directory stores server settings and local project metadata.
- Managed by `src/local-data.js` which reads and writes `dsconfig.json`.
- Project-specific configuration such as `jsconfig.json` and `.vscode/settings.json` can be generated via commands to enable typing and auto-formatting.

## Providers and Documentation
- `completionItemProvider.js` (completion items), `hoverProvider.js` (hover info), `signatureProvider.js` (signature help), and `codeActionProvider.js` (code actions) draw from JSON under `completions/`.
- Hover flow: when the user hovers over a symbol, `hoverProvider` determines the scope and method name, finds a match in `scopesJson`, and returns Markdown with signatures and documentation.

## Commands and Keyboard Shortcuts
- Default keybindings map `Alt+R` to `droidscript-code.runApp` and `Alt+S` to `droidscript-code.stop`. All registered commands can have custom keybindings assigned by the user.
- Declared in `package.json` under `contributes.keybindings`; users may rebind any `droidscript-code.*` command.
- A wide array of commands is exposed, including project management, execution control, file synchronization, and documentation access.

## Potential Areas for Attention
- `extractAssets()` deletes the entire `.droidscript` directory before recreating it; misconfiguration could remove user files.
- Error handling around network operations relies on generic messages; more detailed reporting might help debugging.

