# Project Notes

## Extension activation and installation
- Activation occurs when workspace contains `.dsproj` file (package.json activationEvents).
- `activate()` in extension.js registers commands and providers, initializes tree views, extracts assets to `~/.droidscript` if missing or version changed, and sets up status bar.
- Assets include definitions and samples copied from extension definitions folder to `~/.droidscript/definitions`.

## Connection flow
- Command `droidscript-code.connect` triggers `connect-to-droidscript.js`.
- If not connected, prompts for server IP and optional password.
- On successful server info retrieval and login, calls callback (debug server start).
- `src/websocket.js` handles WebSocket to remote device; sets `CONNECTED` flag, logs, keepalive, and triggers callbacks on open/close.

## Project sync and workspace
- `openProject()` and `openProjectFolder()` manage opening remote projects locally.
- On new project, prompts for local folder, records project in dsconfig, downloads all files (`loadFiles('dnlAll')`), and adds folder to workspace.
- `.dsproj` file created to mark DS project; status bar items displayed.
- `loadFiles()` obtains remote file list via `indexFolder()` and `ext.listFolder`, then downloads or uploads using `writeFile()`/`uploadFile()`.
- Config uses `jsconfig.json` for path exclusion; `excludeFile()` uses glob patterns from `jsconfig` or defaults.

## File watchers and sync
- onDidSaveTextDocument, onCreateFile, onDeleteFile, onRenameFile propagate changes to remote via dsclient functions.
- Uses `batchPromises` for concurrency.

## Providers and Intellisense
- `completionItemProvider`, `hoverProvider`, `signatureHelpProvider`, `codeActionProvider` registered for JavaScript.
- They rely on JSON data under `completions/` and `definitions/`.
- Hover provider parses word and scope to provide Markdown documentation.

## Commands and keybindings
- package.json declares commands (runApp, stop, create app, exec, refresh, etc.) and keybindings (`alt+r` run, `alt+s` stop).
- Additional commands available for rename, reveal in explorer, connect/disconnect, etc.

## Device UI and assets
- `extractAssets()` clears and recreates `~/.droidscript` subfolders (samples, definitions) and copies bundled definitions.
- On connection start, `downloadDefinitions()` fetches definitions from device into `.droidscript/definitions/ts`.

## Disconnect behavior
- WebSocket `wsOnClose` sets CONNECTED false, clears keepalive, triggers `onDebugServerStop()` which hides status bar, resets project name, refreshes tree views, and prompts to reconnect.

## Mouse-over help
- Hover provider uses `scopesJson` to look up methods; `provideHover` constructs Markdown with signature and documentation.
- Completion and signature providers similarly use `scopesJson` for suggestions and signatures.

