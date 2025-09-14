# How It Works

## Extension activation and assets

- VS Code activates the extension when a workspace contains a `.dsproj` file, as declared in `package.json`【F:package.json】.  
  `"activationEvents": [ "workspaceContains:.dsproj" ]`
- `activate()` wires command registrations, file‑system watchers, and the Projects, Docs, and Samples tree views before extracting bundled assets if the local cache is missing or outdated【F:extension.js】.
- `extractAssets()` deletes existing `~/.droidscript` asset sub-folders then recreates `samples` and `definitions` from extension resources【F:extension.js】.

## Connecting to a device

- Command `droidscript-code.connect` launches `connect-to-droidscript.js`, which cycles through IP:port endpoints in `serverIPs[]` from `dsconfig.json` (history capped at 10), updating the status bar for each attempt.
- Clicking the status bar's `Trying` message cancels the loop and immediately invokes **DroidScript: Select Device**.
- If all endpoints fail, an error message appears and the picker opens.
- The picker lists past endpoints and accepts new entries with or without a port, defaulting to `:8088` or the current `PORT`.
- Successful connections move the working endpoint to the head of `serverIPs[]` and save it alongside `serverIP` and `PORT`【F:src/commands/connect-to-droidscript.js】.
- `dsclient.js` wraps Axios in an `axios` object. `axios.intercept()` logs the request URL and the first 256 bytes of the response when `CONSTANTS.DEBUG` is true (Extension Development Host)【F:src/dsclient.js†L18-L38】.
- `getServerInfo()` performs the first HTTP request to `${serverIP}/ide?cmd=getinfo` using that wrapper and applies the `droidscript-code.connectionTimeout` setting as the Axios timeout. The setting is not applied to later WebSocket connections【F:src/dsclient.js†L47-L70】.
- The helper `catchError()` returns `{status: undefined, data: {status: "bad", error}}`; functions such as `listFolder()` and `uploadFile()` propagate this object, and callers like `connect-to-droidscript.js` inspect `status` to detect failures【F:src/dsclient.js†L41-L45】【F:src/dsclient.js†L88-L97】【F:src/dsclient.js†L315-L327】.
- HTTP requests target endpoints including `/ide?cmd=` operations (`getinfo`, `login`, `list`, `add`, `rename`, `delete`, `run`, `stop`, `execute`, `exec`), `/upload` for file transfers, and direct file paths for reading or existence checks【F:src/dsclient.js†L49-L109】【F:src/dsclient.js†L118-L146】【F:src/dsclient.js†L315-L327】.
- `websocket.js` uses the `ws` package to open a socket to the device (converting the configured `http` URL to `ws`), sets `CONNECTED` true, writes messages to the **DroidScript Logs** output channel, highlights error lines, and starts a keep‑alive timer that sends `keepalive` every five seconds【F:src/websocket.js†L60-L107】.
- Closing the socket clears the timer, marks `CONNECTED` false, resets the socket, and invokes the stop callback. The exported `stop()` terminates the socket instead of performing the normal closing handshake to avoid the device's non‑standard `1005` status code【F:src/websocket.js†L28-L37】【F:src/websocket.js†L109-L118】.
- When the connection is established, `downloadDefinitions()` copies `.d.ts` files from the device into `~/.droidscript/definitions/ts` so UI metadata is cached locally【F:extension.js】.

## Disconnect behavior

- When the WebSocket closes, `onDebugServerStop()` hides status‑bar items, clears the current project name, refreshes tree views, and either automatically reconnects or prompts the user based on `droidscript-code.autoReconnect`【F:extension.js】.
- Manual disconnects call `terminate()` rather than a normal WebSocket close because the DroidScript server replies with the reserved status code `1005`, which `ws` treats as a `RangeError`.

## Opening a device project locally

- Selecting a project in the Projects view calls `openProject()`, which looks for an existing local copy or prompts for a target folder and records it in `dsconfig.json`【F:extension.js】.
- `openProjectFolder()` adds the folder to the workspace with `updateWorkspaceFolders`, writes a `.dsproj` marker if absent, opens the main file, and optionally syncs content from the device【F:extension.js】.

## Pulling project files from the device

- `loadFiles()` prompts for a sync action and calls `getAllFiles()` to download or upload project files【F:extension.js】.
- `indexFolder()` walks remote and local directories, honoring `exclude` globs from `jsconfig.json` or defaults【F:extension.js】.
- Downloads use `createFolder()` and `writeFile()` to mirror the device structure; uploads rely on `uploadFile()` to send local changes【F:extension.js】.
- File‑system watchers (`onDidSaveTextDocument`, `onCreateFile`, `onDeleteFile`, `onRenameFile`) propagate edits back to the device when connected【F:extension.js】.

## Configuration data

- `.dsproj` — JSON marker file in each project folder. `openProjectFolder()` writes an empty `{}` file when a project is added so the `workspaceContains:.dsproj` activation event fires. The file isn't modified afterwards; deleting it prevents activation. Developers extending this file should update read/write logic to tolerate missing fields and keep the extension's activation event unchanged【F:extension.js】【F:package.json】.
- `dsconfig.json` — stored in the `.droidscript` folder under the user's home directory.
  - `src/local-data.js` defines its schema with keys such as `VERSION`, `serverIP`, `serverIPs[]`, `PORT`, `localProjects[]`, and `info{}`.
  - `serverIPs[]` holds up to 10 full `ip:port` device endpoints.
  - Each `localProjects` item records `path`, `PROJECT`, `reload`, and `created` timestamps.
  - The file is created on first run and saved whenever projects or settings change. The file was previously in the user's home folder. As of v0.3.6 it's transparently migrated by local-data.js migrateConfigFile().
  - During activation, if `VERSION` is older than the current extension, `activate()` calls `extractAssets()`, updates the version number, and writes the file back【F:src/local-data.js】【F:src/types.d.ts】【F:extension.js】.
  - To add new fields:
    - update the default object and `adjust()` in `src/local-data.js`,
    - expand `DSCONFIG_T` in `src/types.d.ts`,
    - bump the extension version so old configs are migrated or rewritten.
- `~/.droidscript` - folder under the home directory.
  - Contains `dsconfig.json` configuration file.
  - Contains an asset cache:
    - `extractAssets()` removes the folder and recreates `samples` and `definitions` subdirectories,
    - `downloadDefinitions()` populates `definitions/ts` with `.d.ts` files from the device【F:extension.js】【F:src/CONSTANTS.js】.
    - The sub-folders are created when missing and rebuilt when the extension version increases.
- `jsconfig.json` — optional per‑project file controlling TypeScript checks and file‑sync exclusions.
  - `addTypes` writes a default configuration file if one is missing,
  - `loadConfig()` reads it,
  - `excludeFile()` applies its `exclude` globs during sync;
  - In DS projects, config files cascade like CSS from least-specific to most-specific. In a multi-folder project, absent files fall back to a default at the workspace-level.
    - (Need to look into this: ) Workspace-level configs do not cascade to projects【F:extension.js】【F:src/util.js】.
- `package.json` - extension manifest located at the workspace root.
  - It defines activation events, commands, and keybindings, and is not read from individual project folders.
  - project-level `package.json` files are ignored,
    - (Need to look into this: ) so settings do not cascade from workspace to project【F:package.json】.

## Providers and commands

- JavaScript language features are supplied by `completionItemProvider`, `hoverProvider`, `signatureHelpProvider`, and `codeActionProvider`【F:extension.js】.
- Completion, hover text, and signatures are generated from JSON scope data in `completions/` using provider logic in `src/providers/`【F:src/providers/completionItemProvider.js】【F:src/providers/hoverProvider.js】【F:src/providers/signatureHelperProvider.js】.
- Many editor and project management commands are registered in `activate()` and exposed via `package.json`'s `commands` contribution; any command ID can be bound to custom shortcuts via VS Code's Keyboard Shortcuts UI【F:extension.js】【F:package.json】.

## Keyboard shortcuts

- Default keybindings map `Alt+R` to run the current project and `Alt+S` to stop it【F:package.json】. Any command listed in `package.json` can accept custom shortcuts through VS Code's Keyboard Shortcuts UI.

## Mouse‑over help

- The hover provider extracts the word under the cursor, determines its scope, and looks up matching documentation. It then constructs a Markdown block with signature and description for display in the tooltip【F:src/providers/hoverProvider.js】.
- Signature and completion providers follow similar parsing logic, feeding scope JSON data to VS Code's APIs to show parameter hints and autocompletion lists【F:src/providers/signatureHelperProvider.js】【F:src/providers/completionItemProvider.js】.

## SmartDeclare (see README)

### What this file tries to do (functionality & intent)

- **Intent:** automatically "declare the missing variables" in a JS file:

  1. On lines that look like `name = ...;` (and not already declared anywhere), insert `var ` before the `name`.
  2. Build a **globals declaration block** (e.g., `/** @type {...} */\nvar foo;`) inserted near the top (before the first `function`), for names it infers are shared across functions.
  3. Provide **best-effort JSDoc types** for those globals, inferred from the first assignment: literals (`"x"`, `[`, `{`, numbers, `true/false`) and DSL-ish calls like `app.CreateX()` → `DsX`.

- **Heuristic "global" detection:** splits text into "function bodies," collects LHS assignment names in each, and if a name is assigned in one block but merely referenced (word match) in another block, it's treated as a global and will get a top-of-file `var` declaration + JSDoc.

- **Insertion point:** "before the first function (after optional comment/blank line prelude)." If it can't find a function, it inserts at the start of the file.

### Faults, correctness concerns, and reliability risks

1. #### **Regex that won't work in JS engines (variable-length lookbehind)**

   - Patterns like `(?<=^|\n|^\s*for\s*\()` and `(?<!(var|let|const)\s*)` use **lookbehinds with `\s*`** (variable length). In V8/Node/VS Code's JS engine, **lookbehind must be fixed length**. These patterns are likely to throw `Invalid regular expression: look-behind pattern matches variable length`.
   - **Impact:** the edit pass may never run (exception thrown), or behavior differs by engine/version.

2. #### **`String.prototype.match()` given a _string_ instead of a `RegExp`**

   - Many calls do `text.match("...")` with backslashes, expecting a regex. With a string, `.match()` does a **literal substring search**, not a regex. Examples:
   <hr>
   <noformat>
     text.match(`(var|let|const)\\b[^\n(]+\\b${match[2]}\\s*[=,;\\n]`))
     lines[i].match(`\\b${match[2]}\\s*=[^=]`);
   </noformat>
   <hr>

   - **Impact:** these checks are far more permissive or simply wrong; they can easily miss real declarations or mis-detect false ones.
   - **Fix:** always build `new RegExp(pattern, flags)` and **escape** interpolated identifiers.

3. #### **Scope semantics: inserting `var`**

   - `var` is **function-scoped** and hoisted; at top level in a script it becomes a global property; inside ESM it's module-scoped (not global). This tool does not distinguish those cases.
   - Inserting `var` can **silence bugs** by creating globals you didn't intend, or **change temporal semantics** compared to `let/const` (TDZ vs hoist), causing subtle runtime differences.

4. #### **False positives/negatives**

   - Regex cannot parse JS. Cases likely broken or skipped:

     - Augmented assignments (`+=`, `-=`, etc.), destructuring (`[a,b]=...`, `{x}=...`), assignments embedded in larger expressions, multi-line constructs, ternaries, `for` with comma in init, class fields, optional chaining, TS syntax in JS, etc.
     - Member assignments (`obj.x =`), `this.x =`, `globalThis.x =` should not get declarations but may be caught by naive patterns.
     - Names inside strings/comments can trigger word matches for "globals".

   - The global detector assumes "functions only"; it ignores arrow functions, class methods, top-level `await`, etc.

5. #### **Type inference is very brittle**

   - The "type" inference relies on the same string-as-regex issue (#2), plus very narrow heuristics. Empty type becomes `/** @type {} */`, which is often misleading; it would be better to omit the JSDoc than assert `{}`.

6. #### **Edit positioning**

   - Declarations are inserted before the first `function`. Files without `function` get a block at the very top, which can split shebangs (`#!`), license headers, Flow pragmas, `/* eslint-env */` comments, or `'use strict'`.

7. #### **Performance & UX**

   - Multiple `text.match(...)` scans over the whole document inside loops can be O(n²).
   - No diagnostics or preview—edits just happen, making it risky in large files.

### Safer ways to achieve the goal (recommended alternatives)

- **ESLint in VS Code** with `no-undef`, `no-redeclare`, `no-implicit-globals`. It flags exactly where declarations are missing, without guessing. Configure auto-fix on save for safe rules; manually add declarations where needed.

- **TypeScript or `// @ts-check`** on JS to surface "cannot find name" diagnostics via VS Code's TS server.

- **AST-based codemod** using the TypeScript compiler API, Babel, or jscodeshift:

  - Parse to AST, compute scope, find `AssignmentExpression` whose LHS is an `Identifier` **unbound** in any enclosing scope.
  - For `for`-init like `for (i = 0; ...)`, safely convert to `for (let i = 0; ...)`.
  - Skip member expressions (`obj.x =`), `this.x =`, and allow a whitelist of intentional globals.
  - Insert `let`/`const` at the correct block, not blindly `var`.
  - (This can then be packaged as a VS Code **CodeAction** / Quick Fix tied to diagnostics.)

### Possible Enhancements / Fixes

This is a incremental hardening checklist:

1. **Replace all string-based `.match("...")` uses with real `RegExp` objects**, fully escaping identifiers:

   ```js
   const id = match[2];
   const declRe = new RegExp(`\\b(?:var|let|const)\\b[^\\n(]*\\b${escapeRe(id)}\\s*[=,;\\n]`, 'm');
   if (declRe.test(text)) continue;
   ```

2. **Eliminate variable-length lookbehinds.** Rework patterns to use capturing groups instead of lookbehind, or anchor to line start `^` with the `m` flag.

3. **Guard against member/`this`/globalThis assignments** (negative checks before the identifier), and skip lines with `==`, `+=`, etc.

4. **Switch to `let`** for newly introduced declarations in block scopes; only use `var` if you truly want function-scoped globals in non-module scripts.

5. **Only add JSDoc if you have a confident inference**; otherwise omit it rather than `{}`.

6. **Respect file preamble** (shebangs, `'use strict'`, pragma comments) by inserting after them.

7. **Dry-run mode**: show a diff/preview or use VS Code `CodeAction` so a user accepts per-edit.

---

### Bottom Line on SmartDeclare

This file clearly aims to be a "SmartDeclare" pass for legacy JS, but it's **fragile** as written (regex issues, scope semantics, string-match mistakes). For production use, wire ESLint/TS for diagnostics and, if you want one-click fixes, implement an **AST-aware** CodeAction instead.

(Review by GPT5)
