# How It Works

## Extension activation and assets
- VS Code activates the extension when a workspace contains a `.dsproj` file, as declared in `package.json`【F:package.json†L16-L18】.
- `activate()` wires command registrations, file‑system watchers, and the Projects, Docs, and Samples tree views before extracting bundled assets if the local cache is missing or outdated【F:extension.js†L64-L166】.
- `extractAssets()` deletes any existing `~/.droidscript` folder then recreates `samples` and `definitions` from extension resources【F:extension.js†L152-L160】【F:extension.js†L174-L189】.

## Connecting to a device
- Command `droidscript-code.connect` launches `connect-to-droidscript.js`, which prompts for the device IP, retrieves server info, and requests a password if required【F:src/commands/connect-to-droidscript.js†L13-L74】.
- Failed lookups display an error with `Retry` and `Re-enter IP Address` options; successful logins call back to start the WebSocket server【F:src/commands/connect-to-droidscript.js†L52-L60】【F:src/commands/connect-to-droidscript.js†L92-L110】.
- `websocket.js` opens the WebSocket, sets `CONNECTED` true, logs output, and starts a keep‑alive timer; on close it clears the timer, marks `CONNECTED` false, and invokes the stop callback【F:src/websocket.js†L19-L85】【F:src/websocket.js†L98-L107】.
- When the connection comes up, `downloadDefinitions()` copies `.d.ts` files from the device into `~/.droidscript/definitions/ts` so UI metadata is cached locally【F:extension.js†L777-L795】.

## Disconnect behavior
- When the WebSocket closes, `onDebugServerStop()` hides status‑bar items, clears the current project name, refreshes tree views, and prompts the user to reconnect【F:extension.js†L832-L840】.

## Opening a device project locally
- Selecting a project in the Projects view calls `openProject()`, which looks for an existing local copy or prompts for a target folder and records it in `dsconfig.json`【F:extension.js†L876-L930】.
- `openProjectFolder()` adds the folder to the workspace with `updateWorkspaceFolders`, writes a `.dsproj` marker if absent, opens the main file, and optionally syncs content from the device【F:extension.js†L936-L979】.

## Pulling project files from the device
- `loadFiles()` prompts for a sync action and calls `getAllFiles()` to download or upload project files【F:extension.js†L247-L282】.
- `indexFolder()` walks remote and local directories, honoring `exclude` globs from `jsconfig.json` or defaults【F:extension.js†L289-L311】.
- Downloads use `createFolder()` and `writeFile()` to mirror the device structure; uploads rely on `uploadFile()` to send local changes【F:extension.js†L318-L355】【F:extension.js†L369-L392】.
- File‑system watchers (`onDidSaveTextDocument`, `onCreateFile`, `onDeleteFile`, `onRenameFile`) propagate edits back to the device when connected【F:extension.js†L110-L113】【F:extension.js†L416-L455】【F:extension.js†L464-L480】.

## Configuration data
- `src/local-data.js` loads and saves `dsconfig.json` in the user’s home directory, tracking server IP and known local projects【F:src/local-data.js†L8-L38】.
- Per‑project settings come from `jsconfig.json`, read via `loadConfig()`; `excludeFile()` uses its glob patterns to filter sync operations【F:src/util.js†L19-L44】【F:src/util.js†L49-L60】.

## Providers and commands
- JavaScript language features are supplied by `completionItemProvider`, `hoverProvider`, `signatureHelpProvider`, and `codeActionProvider`【F:extension.js†L115-L126】.
- Completion, hover text, and signatures are generated from JSON scope data in `completions/` using provider logic in `src/providers/`【F:src/providers/completionItemProvider.js†L1-L30】【F:src/providers/hoverProvider.js†L1-L33】【F:src/providers/signatureHelperProvider.js†L1-L55】.
- Many editor and project management commands are registered in `activate()` and exposed via `package.json`’s `commands` contribution; any command ID can be bound to custom shortcuts via VS Code’s Keyboard Shortcuts UI【F:extension.js†L73-L108】【F:package.json†L74-L152】.

## Keyboard shortcuts
- Default keybindings map `Alt+R` to run the current project and `Alt+S` to stop it【F:package.json†L21-L31】. Any command listed in `package.json` can accept custom shortcuts through VS Code’s Keyboard Shortcuts UI.

## Mouse‑over help
- The hover provider extracts the word under the cursor, determines its scope, and looks up matching documentation. It then constructs a Markdown block with signature and description for display in the tooltip【F:src/providers/hoverProvider.js†L6-L28】.
- Signature and completion providers follow similar parsing logic, feeding scope JSON data to VS Code’s APIs to show parameter hints and autocompletion lists【F:src/providers/signatureHelperProvider.js†L11-L55】【F:src/providers/completionItemProvider.js†L6-L30】.

