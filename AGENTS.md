# AGENTS

This repository contains a VSCode extension for remote development with DroidScript. See [how-it-works.md](./how-it-works.md) for full architectural details. [project-notes.md](./project-notes.md) contains raw notes used to create the other document, and may contain additional insight. README.md is an introduction to the user/developer expectations of the software - it should help to understand this while working on the software.

## Terminology

- All references to the Output window are specifically related to the "DroidScript Log" VSCode Output window unless stated otherwise.

## Coding Conventions

### All code
- Ensure code is modular, well-structured, and well-commented.
- Ensure existing how-it-works and project-notes docs are accurate. Add inline comments to code wherever it seems to help add clarity - document why code exists, not just how it does it.

### JavaScript / TypeScript
- Use ESM, ES2022+ for NodeJS v22+ with JSDoc and TSDoc.
- When diagnosing issues, search for possible issues with NodeJS, TypeScript, or NPM packages which are relevant to the problematic functionality.

## README.md
- The README.md file is not a changelog. README.md describes the project.
- Do not look in README.md for guidance on how to proceed with your task. Do look to the file to understand the user/developer understanding of the project and user expectations from your efforts.
- Update README.md as required with new information about the existence of new features and how to use them.

## Git
- When creating a new branch always use a meaningful branch name that describes the task. Don't use any text like "suggested-change" as part of the branch name or pull request text.
- Use short and meaningful text for commit messages, not (for example) hyphen-delimited-task-identifiers.

## Development Workspace/Environment Tips
- If a network connection fails, report the exact URL clearly in your task summary.
- When using grep or other commands to find an option that begins with dashes, wrap the text in single quotes : `'\--option'`
- Use 'sed' or perl for file changes - there are no other editors. Be aware of potential issues with quotes.

## When debugging an issue, diagnosing a problem, proposing a fix
- Refer to lines of code rather than reproducing code blocks.

Do not run a test script or attempt to lint; there are no valid tests in this package.
