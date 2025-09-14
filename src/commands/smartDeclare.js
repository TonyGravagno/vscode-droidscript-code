const vscode = require('vscode');

/** Main entry: invoked by a VS Code command with a URI to a JS file.
 *  - Opens the document, shows it in an editor.
 *  - Heuristically finds "global" variables (assigned in one function and referenced in others).
 *  - Inserts missing `var` keywords before simple assignments on lines.
 *  - Prepends a block of `var <name>;` declarations with JSDoc `@type` hints,
 *    trying to infer types from first assignments.
 *
 *  @param {vscode.Uri} uri
 */
module.exports = async function (uri) {
    // Open the target file and show it.
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);

    // Raw file text and a per-line split for line-wise edits.
    const text = doc.getText();
    const globals = findGlobalVars(text); // Set<string> of names guessed to be global.
    const lines = text.split("\n");

    // Compute an insertion point for the global declarations block:
    // first match of: (optional full-line // comments) + a blank line + "function"
    // If not found, fall back to 0 (top of file).
    const funcPos = text.match(/(\/\/.*\n)*\n\s*function/)?.index || 0;
    const globPos = doc.positionAt(funcPos);

    // Heuristic: map constructor-ish prefixes to type names when inferring types.
    // e.g., app.CreateDialog()  -> type "DsDialog"
    const regConPrefix = /^(Create|Open|Add|show)(?=\w+)/i;
    /** @type {{[x:string]: string}} */
    const objPfx = { app: "Ds", ui: "UI", MUI: "Mui", gfx: "Gfx" };

    // Heuristic: literal leading char -> type
    //  '`"\'   => string
    //  '['     => any[]
    //  '{'     => object map
    /** @type {{[x:string]: string}} */
    const typeObj = {
        '`': 'string', '"': 'string', "'": 'string',
        '[': 'any[]', '{': '{[x:string]: any}'
    }

    // Perform edits in a single VS Code edit batch.
    editor.edit(edt => {
        // Pass 1: for each line, insert "var " before simple assignments to bare identifiers
        // that are *not* already declared via var/let/const anywhere in the file.
        for (let i = 0; i < lines.length; i++) {
            // Attempt to match: start of line (or "for(" init), whitespace, NOT preceded by var/let/const,
            // then a bare identifier, then "=", but not "==" or "+=" etc.
            const match = lines[i].match(/(?<=^|\n|^\s+for\s*\()\s*(?<!(var\s+|let\s+|const\s+))\b(\w+)\s*=[^=]/);

            // Skip if no match, or if the name is in the "globals" Set, or if the file already
            // contains a declaration for that name (var/let/const).
            if (!match || globals.has(match[2]) || text.match(`(var|let|const)\\b[^\n(]+\\b${match[2]}\\s*[=,;\\n]`)) continue;

            // Insert "var " right before the LHS identifier on that line.
            const m = lines[i].match(`\\b${match[2]}\\s*=[^=]`);
            if (m?.index !== undefined) edt.insert(new vscode.Position(i, m.index), "var ");
        }

        // If we didn't find any globals, we're done.
        if (!globals.size) return;

        // Pass 2: synthesize a "globals" declaration block with JSDoc types (best-effort).
        let globDefs = "";
        for (const v of globals) {
            // Skip if already declared anywhere in the file.
            if (text.match(`\\b(var|let|const)\\b[^\n(]+${v}\\s*[=,;\\n]`)) continue;

            // Try to infer a type from first assignment to v.
            // Captures either:    app|gfx|ui|mui.<Word>   OR   a non-operator expression
            let type = "";
            const typeMatch = text.match(`${v}\\s*=\\s*((app|gfx|ui|mui)\\.(\\w+)|([^=;()]+))`);
            if (typeMatch && typeMatch[3]) {
                // app.ui.gfx.mui.<CtorLike>
                if (typeMatch[3].match(regConPrefix))
                    type = objPfx[typeMatch[2]] + typeMatch[3].replace(regConPrefix, '');
                else if (typeMatch[3].match(/^(is|has)/i))
                    type = "boolean";
            } else if (typeMatch && typeMatch[4]) {
                // Literal/expr based guess
                if (typeObj[typeMatch[4][0]]) type = typeObj[typeMatch[4][0]];
                else if (typeMatch[4].match(/^(true|false)$/)) type = "boolean";
                else if (typeMatch[4].match(/^.?[0-9]/)) type = "number";
            }

            // Add a JSDoc + var decl for this name.
            globDefs += `/** @type {${type}} */\nvar ${v};\n`;
        }

        // Insert the global declarations block right before the first function (or at top).
        edt.insert(globPos, `\n${globDefs}\n`);
    });
}

/** Heuristic global-detector: finds names assigned without var/let/const inside a function,
 *  and seen (by word match) in other function bodies. Those become "globals".
 *
 *  @param {string} code
 *  @returns {Set<string>}
 */
function findGlobalVars(code) {
    // Split the file into pseudo-"function blocks" at places that look like: newline + (spaces/tabs) + "function "
    // The delimiter is retained at the start of the next block because we use a lookbehind/lookahead split.
    const defs = code.split(/(?<=\n[ \t]*)(?=function )/);

    // For each block, collect names of LHS assignments that are *not* immediately preceded by var/let/const.
    // (Goal: "things we assigned to that look like undeclared locals.")
    const vars = defs.map(def => def.match(/(?<!(var|let|const)\s*)\b\w+(?=\s*=[^=])/g));

    /** @type {Set<string>} */
    const globalSet = new Set();

    // Compare blocks pairwise: if a name is assigned in block i but merely referenced (word match) in block j,
    // mark it as a "global" (shared across functions).
    for (let i = 0; i < defs.length; i++) {
        if (!vars[i]) continue;

        for (let j = 0; j < defs.length; j++) {
            if (i == j) continue;
            /** @type {string[]} */
            for (const v of vars[i] || []) {
                // If block j does *not* also assign it, but does contain the bare word, treat it as global.
                // eslint-disable-next-line max-depth
                if (!vars[j]?.includes(v) && defs[j].match(RegExp(`\\b${v}\\b`)))
                    globalSet.add(v);
            }
        }
        // Debug example kept commented:
        // console.log(defs[i].split("\n", 1)[0], vars1, [...globalSet]);
    }
    return globalSet;
}