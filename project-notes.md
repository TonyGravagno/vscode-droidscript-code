# Project Notes

## Overview
- VSCode extension allowing remote development with DroidScript.
- Entry point: `extension.js`.
- Uses WebSocket for device communication and HTTP requests for file operations.

## Activation & Initialization
- `activate()` registers commands and providers, sets up tree views, prepares workspace, extracts assets when version or folder changes.
- Tree views implemented by `ProjectsTreeView.js`, `DocsTreeView.js`, and `SamplesTreeView.js` create sidebar panels.
- Activation event in `package.json` triggers when workspace contains `.dsproj` file.

## Commands
- Commands registered via `subscribe` helper in `activate()`.
- Command implementations live in `src/commands/` (e.g., `connect-to-droidscript.js`, `load-files.js`).
- Key commands: connect, disconnect, loadFiles (sync), extractAssets, run/stop app, open project, open docs, and more.
- Commands defined in `package.json` to allow user keybindings.

## Connection Flow
- `connectToDroidScript()` prompts for IP and password, retrieves server info via `dsclient`.
- On success, invokes callback (`dbgServ.start`) to open WebSocket.
- `websocket.js` handles connection, sets `CONNECTED`, logs messages, maintain keep-alive, and calls back to extension.

## After Connection
- `onDebugServerStart()` downloads type definition files, refreshes tree views, checks unsaved changes, shows status bar items, and opens current project if set.
- Type definitions stored under `~/.droidscript/definitions`.

## Disconnect
- `wsOnClose()` marks `CONNECTED` false and triggers `onDebugServerStop()`.
- `onDebugServerStop()` hides status bar items, clears project name, refreshes views, and prompts user to reconnect.

## Device UI & Assets
- `extractAssets()` clears and recreates local `.droidscript` folders, copying bundled definitions.
- `downloadDefinitions()` fetches `.d.ts` files from device or remote docs into `~/.droidscript/definitions/ts`.
- Sample programs fetched from the device are stored under `~/.droidscript/samples`.

## Local Projects
- `openProject()` decides project location, updates config, and calls `openProjectFolder()`.
- `openProjectFolder()` adds folder to workspace, creates `.dsproj`, opens main file, and optionally syncs files.
- `loadFiles()` / `getAllFiles()` manage syncing between device and local project based on selected action (download/upload/update). Uses `indexFolder()` to list remote/local files, `writeFile()` and `createFolder()` to write locally, and `uploadFile()` to push changes.

## File Watching
- Workspace file events (`onDidSaveTextDocument`, `onCreateFile`, `onDeleteFile`, `onRenameFile`) queue operations to sync with device when connected.

## Configuration
- `src/local-data.js` reads/writes `dsconfig.json` in user home. Stores server IP, port, and list of local projects.

## Providers
- Completion, hover, signature help, and code action providers registered for JavaScript.
- Implemented in `src/providers/` (`completionItemProvider.js`, `hoverProvider.js`, `signatureProvider.js`, `codeActionProvider.js`).
- Providers read data from `completions/*.json` for API docs and suggestions.

## Keyboard Shortcuts
- Default keybindings: `Alt+R` for run (`runApp`) and `Alt+S` for stop (`stop`). Others can be assigned to any `droidscript-code.*` command via user settings.
- Declared in `package.json` under `contributes.keybindings`; users may bind other commands.

## Mouse-over Help
- `hoverProvider` (in `src/providers/hoverProvider.js`) receives VSCode hover events, inspects the word and scope, matches entries in `scopesJson`, and returns Markdown from `completions/*.json`.

## Potential Issues
- Handling of undefined or failed responses may need more granular error messages.
- `extractAssets` removes entire `.droidscript` folder, which could delete user data if misconfigured.

