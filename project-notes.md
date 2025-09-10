# Project Notes

## Extension activation and installation
- Activation occurs when a workspace contains a `.dsproj` marker file as declared in `package.json` activation events.
- `activate()` registers all command handlers and language providers, creates the Projects, Docs, and Samples tree views, and wires file‑system watchers for saves, deletes, creates, and renames.
- On first run or version change, `extractAssets()` removes any existing `~/.droidscript` folder before recreating `samples` and `definitions` subdirectories from bundled assets.

## Connection flow
- Command `droidscript-code.connect` invokes `connect-to-droidscript.js` which iterates through `serverIPs` and `PORTs` from `dsconfig.json`, updating the status bar for each attempt and only prompting for a new address when all stored pairs fail.
- Connection failures display an error with `Retry` or `Re-enter IP Address` options; success stores server details, moves the working pair to the front of the history, and starts the WebSocket debug server.
- `websocket.js` opens the WebSocket, marks `CONNECTED` true, logs activity, starts a keep‑alive timer, and on close clears the timer, marks `CONNECTED` false, and calls the stop callback.
- On connection start, `downloadDefinitions()` fetches `.d.ts` files from the device into `~/.droidscript/definitions/ts` for offline use.

## Project sync and workspace
- `openProject()` looks up an existing local copy; if none, it prompts for a destination folder and records the project in `dsconfig.json`.
- `openProjectFolder()` adds the folder to the workspace, ensures a `.dsproj` marker exists, opens the main source file, and optionally downloads files from the device.
- `loadFiles()` uses `indexFolder()` to list remote and local files, then mirrors content: `createFolder()` makes directories, `writeFile()` saves downloaded data, and `uploadFile()` sends local changes.

## File watchers and sync
- `onDidSaveTextDocument`, `onCreateFile`, `onDeleteFile`, and `onRenameFile` queue changed paths and push updates to the device when connected, using `batchPromises` to control concurrency.

## Providers and Intellisense
- `completionItemProvider`, `hoverProvider`, `signatureHelpProvider`, `codeActionProvider` registered for JavaScript.
- They rely on JSON data under `completions/` and `definitions/`.
- Hover provider parses word and scope to provide Markdown documentation.

## Commands and keybindings
- `package.json` exposes run, stop, project management, and utility commands; default keybindings map `alt+r` to run and `alt+s` to stop.
- Any command ID listed in `package.json` can be assigned a custom shortcut through VS Code’s Keyboard Shortcuts settings.

## Device UI and assets
- `extractAssets()` clears and recreates `~/.droidscript` subfolders (`samples` and `definitions`) from extension resources.
- `downloadDefinitions()` retrieves `.d.ts` files from the device into `~/.droidscript/definitions/ts` so documentation and UI metadata are cached locally.

## Disconnect behavior
- `wsOnClose` marks `CONNECTED` false, stops the keep‑alive timer, and triggers `onDebugServerStop()` to hide status bar items, clear the current project, refresh tree views, and prompt for reconnection.

## Mouse-over help
- The hover provider resolves the word and scope under the cursor, looks up matching entries in `scopesJson`, and returns Markdown with the signature and description.
- Completion and signature providers parse the surrounding text to feed matching data from `scopesJson` into VS Code APIs.

## Configuration files
- `dsconfig.json` in the user’s home directory stores server IP/port history (`serverIPs`, `PORTs`), known local projects, and per‑version metadata.
- Each project may provide a `jsconfig.json` whose `exclude` globs guide sync operations; a default configuration is bundled for projects lacking one.

## Possible Problems
- `extractAssets()` deletes the entire `~/.droidscript` folder before copying assets, which may remove user customizations.
- Directory creation on the device is not implemented in `onCreateFile()`, so new local folders are not mirrored remotely.

