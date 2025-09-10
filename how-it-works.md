# How It Works

## Extension activation and assets
- VS Code activates the extension when a workspace contains a `.dsproj` file, as declared in `package.json`【F:package.json†L16-L18】.
- The `activate()` function in `extension.js` registers all commands and language providers, creates three tree views (projects, docs, samples), and extracts bundled assets when needed【F:extension.js†L64-L166】【F:extension.js†L152-L160】.
- `extractAssets()` removes any existing `~/.droidscript` folder and recreates `samples` and `definitions` directories, copying the shipped definitions into place【F:extension.js†L174-L189】.

## Connecting to a device
- Command `droidscript-code.connect` launches the connection workflow (`src/commands/connect-to-droidscript.js`). It prompts for the device IP, retrieves server info, and performs optional password login before invoking the callback to start the debug server【F:src/commands/connect-to-droidscript.js†L13-L74】【F:src/commands/connect-to-droidscript.js†L92-L110】.
- The debug server (`src/websocket.js`) establishes a WebSocket to the device. On open it marks the extension as connected, logs activity, starts a keep‑alive loop, and calls the start callback; on close it clears the loop, marks `CONNECTED` false, and invokes the stop callback【F:src/websocket.js†L19-L85】【F:src/websocket.js†L98-L107】.
- On connection failure, the IP workflow shows an error and offers retry or re‑enter options【F:src/commands/connect-to-droidscript.js†L52-L60】. On success, definitions are pulled from the device to `~/.droidscript/definitions/ts`【F:extension.js†L777-L795】.
- Device UI resources and definitions are therefore cached under the user's home `~/.droidscript` folder, ready for offline use.【F:extension.js†L174-L189】【F:extension.js†L777-L795】

## Disconnect behavior
- When the WebSocket closes, `onDebugServerStop()` hides status‑bar items, clears the current project name, refreshes tree views, and prompts the user to reconnect【F:extension.js†L832-L840】.

## Opening a device project locally
- Selecting a project in the Projects view calls `openProject()`, which locates or creates a local folder, records it in `dsconfig.json`, and invokes `openProjectFolder()`【F:extension.js†L876-L930】.
- `openProjectFolder()` ensures the folder exists, downloads files if necessary, adds the folder to the current workspace, creates a `.dsproj` marker, opens the main source file, and optionally loads documentation【F:extension.js†L936-L979】.

## Pulling project files from the device
- `loadFiles()` prompts for a sync action and then calls `getAllFiles()` to either download or upload project files【F:extension.js†L247-L282】.
- `indexFolder()` enumerates remote and local files, skipping excluded paths from `jsconfig.json` or defaults【F:extension.js†L289-L311】.
- Downloading uses `createFolder()` and `writeFile()` to mirror the remote structure locally, while uploads call `uploadFile()`【F:extension.js†L318-L355】【F:extension.js†L369-L392】.

## Configuration data
- `src/local-data.js` loads and saves `dsconfig.json` in the user’s home directory, tracking server IP and known local projects【F:src/local-data.js†L8-L38】.
- Per‑project settings come from `jsconfig.json`, read via `loadConfig()`; `excludeFile()` uses its glob patterns to filter sync operations【F:src/util.js†L19-L44】【F:src/util.js†L49-L60】.

## Providers and commands
- JavaScript language features are supplied by `completionItemProvider`, `hoverProvider`, `signatureHelpProvider`, and `codeActionProvider`【F:extension.js†L115-L126】.
- Completion, hover text, and signatures are generated from JSON scope data in `completions/` using provider logic in `src/providers/`【F:src/providers/completionItemProvider.js†L1-L30】【F:src/providers/hoverProvider.js†L1-L33】【F:src/providers/signatureHelperProvider.js†L1-L55】.
- Many editor and project management commands are registered in `activate()` and exposed via `package.json`’s `commands` contribution; users can bind additional shortcuts to these command IDs【F:extension.js†L73-L108】【F:package.json†L74-L118】.

## Keyboard shortcuts
- Default keybindings map `Alt+R` to run the current project and `Alt+S` to stop it【F:package.json†L21-L31】. Any command listed in `package.json` can accept custom shortcuts through VS Code’s Keyboard Shortcuts UI.

## Mouse‑over help
- The hover provider extracts the word under the cursor, determines its scope, and looks up matching documentation. It then constructs a Markdown block with signature and description for display in the tooltip【F:src/providers/hoverProvider.js†L6-L28】.
- Signature and completion providers follow similar parsing logic, feeding scope JSON data to VS Code’s APIs to show parameter hints and autocompletion lists【F:src/providers/signatureHelperProvider.js†L11-L55】【F:src/providers/completionItemProvider.js†L6-L30】.

