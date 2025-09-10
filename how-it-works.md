# How It Works

## Extension activation and assets
- VS Code activates the extension when a workspace contains a `.dsproj` file, as declared in `package.json`【F:package.json†L16-L18】.
- `activate()` wires command registrations, file‑system watchers, and the Projects, Docs, and Samples tree views before extracting bundled assets if the local cache is missing or outdated【F:extension.js†L64-L166】.
- `extractAssets()` deletes any existing `~/.droidscript` folder then recreates `samples` and `definitions` from extension resources【F:extension.js†L152-L160】【F:extension.js†L174-L189】.

## Connecting to a device
- Command `droidscript-code.connect` launches `connect-to-droidscript.js`, which cycles through `serverIPs[]` and `PORTs[]` from `dsconfig.json`, updating the status bar for each attempt and prompting only after all stored pairs fail【F:src/commands/connect-to-droidscript.js†L16-L41】.
- Successful connections move the working IP and port to the head of those arrays and save them alongside `serverIP` and `PORT`【F:src/commands/connect-to-droidscript.js†L69-L107】.
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
- `.dsproj` — JSON marker file in each project folder. `openProjectFolder()` writes an empty `{}` file when a project is added so the `workspaceContains:.dsproj` activation event fires. The file isn't modified afterwards; deleting it prevents activation. Developers extending this file should update read/write logic to tolerate missing fields and keep the extension's activation event unchanged【F:extension.js†L936-L965】【F:package.json†L16-L18】.
- `dsconfig.json` — stored in the user's home directory. `src/local-data.js` defines its schema with keys such as `VERSION`, `serverIP`, `serverIPs[]`, `PORT`, `PORTs[]`, `localProjects[]`, and `info{}`; each `localProjects` item records `path`, `PROJECT`, `reload`, and `created` timestamps. The file is created on first run and saved whenever projects or settings change. During activation, if `VERSION` is older than the current extension, `activate()` calls `extractAssets()`, updates the version number, and writes the file back【F:src/local-data.js†L8-L38】【F:src/types.d.ts†L20-L29】【F:src/types.d.ts†L62-L78】【F:extension.js†L152-L160】. To add new fields, update the default object and `adjust()` in `src/local-data.js`, expand `DSCONFIG_T` in `src/types.d.ts`, and bump the extension version so old configs are migrated or rewritten.
- `~/.droidscript` — asset cache under the home directory. `extractAssets()` removes the folder and recreates `samples` and `definitions` subdirectories, while `downloadDefinitions()` populates `definitions/ts` with `.d.ts` files from the device【F:extension.js†L174-L185】【F:extension.js†L777-L795】【F:src/CONSTANTS.js†L7-L12】. The folder is rebuilt when missing or when the extension version increases.
- `jsconfig.json` — optional per‑project file controlling TypeScript checks and file‑sync exclusions. `addTypes` writes a default configuration if one is missing, `loadConfig()` reads it, and `excludeFile()` applies its `exclude` globs during sync; absent files fall back to a bundled default, and workspace-level configs do not cascade to projects【F:extension.js†L725-L739】【F:src/util.js†L33-L47】.
- `package.json` — extension manifest located at the workspace root. It defines activation events, commands, and keybindings, and is not read from individual project folders; project-level `package.json` files are ignored, so settings do not cascade from workspace to project【F:package.json†L16-L152】.

## Providers and commands
- JavaScript language features are supplied by `completionItemProvider`, `hoverProvider`, `signatureHelpProvider`, and `codeActionProvider`【F:extension.js†L115-L126】.
- Completion, hover text, and signatures are generated from JSON scope data in `completions/` using provider logic in `src/providers/`【F:src/providers/completionItemProvider.js†L1-L30】【F:src/providers/hoverProvider.js†L1-L33】【F:src/providers/signatureHelperProvider.js†L1-L55】.
- Many editor and project management commands are registered in `activate()` and exposed via `package.json`’s `commands` contribution; any command ID can be bound to custom shortcuts via VS Code’s Keyboard Shortcuts UI【F:extension.js†L73-L108】【F:package.json†L74-L152】.

## Keyboard shortcuts
- Default keybindings map `Alt+R` to run the current project and `Alt+S` to stop it【F:package.json†L21-L31】. Any command listed in `package.json` can accept custom shortcuts through VS Code’s Keyboard Shortcuts UI.

## Mouse‑over help
- The hover provider extracts the word under the cursor, determines its scope, and looks up matching documentation. It then constructs a Markdown block with signature and description for display in the tooltip【F:src/providers/hoverProvider.js†L6-L28】.
- Signature and completion providers follow similar parsing logic, feeding scope JSON data to VS Code’s APIs to show parameter hints and autocompletion lists【F:src/providers/signatureHelperProvider.js†L11-L55】【F:src/providers/completionItemProvider.js†L6-L30】.

