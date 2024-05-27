# TUI 7zip Archive Manager

This is a manager that uses 7zip for managing archives.

_**NOTE**: 7z must be globally available on your terminal for it to work, more on that [here](#how-7zip-should-be-installed)._

## Why does it exist?

7zip is surely nice on the terminal but sometimes you want it a bit easier.
Maybe you want to extract or deleting specific files and typing/copy-pasting can be time consuming, with this tool you can see what's inside and quickly do different things without creating a mess of a terminal.

## Installation

To install it you'll need installed:
- NodeJS;
- 7zip globally installed (more on that [here](#how-7zip-should-be-installed));
- A terminal (Termux or whatever);

then type:
```bash
npm install -g tui-7z-archive-manager
```

## How 7zip should be installed?

7zip needs to be visible globally for this tool to work,
that is:

- **On Windows**:
Put your 7z.exe's folder path inside _%path%_ variable and if that isn't enough try putting it inside the system's _%path%_ one. You can view and modify variables by going `Control Panel > User Accounts > Change my environment variables`;
- **On Unix**:
Just install it with a package manager (or App Store/Software Manager) and it should be already available globally, if that's not enough go find the _7z_ binary file path and add it to the **$PATH** variable permanently;

### How to use it?

You'll need to either type `tui7zArchiveM` in the terminal or `node tui-7z-archive-manager.mjs` in the same folder of where the package is installed

Read [COMMAND LINE PARAMETERS](COMMAND-LINE-PARAMETERS.md) for more information about the available parameters

## What changes have been made?

Check out the [CHANGELOG](CHANGELOG.md) file for more information.

It will include all changes being made in each version.

## Credits

[Inquirer.js](https://github.com/SBoudrias/Inquirer.js) for the library of prompts

anc95's [inquirer-file-tree-selection-prompt](https://github.com/anc95/inquirer-file-tree-selection) for the file selector

leonsilicon's [inquirer-press-to-continue](https://github.com/leonzalion/inquirer-press-to-continue) for the pause prompt

insightfuls' [inquirer-tree-prompt](https://github.com/insightfuls/inquirer-tree-prompt) for generating the list prompt of the archive