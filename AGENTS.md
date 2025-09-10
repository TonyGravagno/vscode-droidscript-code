# AGENTS

This repository contains a VSCode extension for remote development with DroidScript. See [how-it-works.md](./how-it-works.md) for full architectural details.

## User-provided custom instructions
- Follow any additional instructions provided directly by the user in task messages.

## Codex Task Management

### Vocabulary

#### All code
- The term "funcName()" is intended to disambiguate a function name from common terms. For example, "init()" or "the init() function" is used rather than "the init function", as the latter might be interpreted as any initialization function while the former is explicit about the function name.

#### PHP
- Various terms are used in instructions and in code comments, which are not found in code itself:
- A reference to "SomeName::functionName" requires a lookup of `class SomeName` and `function functionName`. In many cases `class SomeName` will be found in a "somename.php" or "some-name.php" file, in WordPress\wp-content\plugins\nevenuti\src or a related subfolder.

### Coding Conventions

#### All code
- Ensure code is modular, well-structured, and well-commented.
- Ensure existing function docs are accurate. Add inline comments to code wherever it seems to help add clarity - document why code exists, not just how it does it.

#### JavaScript / TypeScript
- Use ESM, ES2022+ for NodeJS v22+ with JSDoc and TSDoc.
- When diagnosing issues, search for possible issues with NodeJS, TypeScript, or NPM packages which are relevant to the problematic functionality.

#### PHP
- Use modern PHP 8.4 with PHPDoc, integrating with the WordPress 6.8+ API.
- Use classes or traits to keep files and functions small and modular.
- When diagnosing issues, search for related notes and nuances in the WordPress Codex, the WordPress core tracker, and the WordPress Gutenberg tracker.

### README.md
- The README.md file is not a changelog. README.md describes the project.
- Do not look in README.md for guidance on how to proceed with your task.
- Update README.md as required with new information about the existence of new features and how to use them.

### Git
- When creating a new branch always use a meaningful branch name that describes the task - don't use any text like "suggested-change" as part of the branch name or pull request text.

### Special Task Instructions
- If the user task message requests processing of a suggested change, open `SuggestedChanges.md` if it exists, process an Open item, and on successful completion move it to the Completed section.

### Development Workspace/Environment Tips
- Unless specified otherwise, do NOT attempt to run any command which requires open network communication. Your Dev environment is sandboxed. No harm will come from trying but you will waste your effort. If a network connection fails, report the exact URL clearly in your task summary.
- When using grep or other commands to find an option that begins with dashes, wrap the text in single quotes : `'\--option'`
- Use 'sed' or perl for file changes - there are no other editors. Be aware of potential issues with quotes.

### When debugging an issue, diagnosing a problem, proposing a fix
- Keep explanations of issues to a minimium.
- Refer to lines of code rather than reproducing code blocks.

Do not run a test script; there are no valid tests in this package.
