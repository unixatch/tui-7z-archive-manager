# TUI 7zip Archive Manager

This is a manager that uses 7zip for managing archives.

_**NOTE**: 7z must be globally available on your terminal for it to work, more on that [here](#how-7zip-should-be-installed)._

## Why does it exist?

7zip is surely nice on the terminal but sometimes you want it a bit easier.
Maybe you want to extract or deleting specific files and typing/copy-pasting can be time consuming, with this tool you can see what's inside and quickly do different things without creating a mess of a terminal.

## Installation

To install it you'll need installed:
- NodeJS;
- 7zip and it being globally visible (more on that [here](#how-7zip-should-be-installed));
- A terminal (Termux or whatever);

then type:
```bash
npm install -g tui-7z-archive-manager
```

### How 7zip should be installed?

7zip needs to be visible globally for this tool to work,
that is:

- **On Windows**:
Put your 7z.exe's folder path inside _%path%_ variable and if that isn't enough try putting it inside the system's _%path%_ one. You can view and modify variables by going `Control Panel > User Accounts > Change my environment variables` or you can do it through the commandline (CMD) in 2 ways like:
  1. **_user only_**: `setx PATH "%PATH%;_your_7z_folder_"`;
  2. **_system wide_**: `setx /m PATH "%PATH%;_your_7z_folder_"`;
- **On Unix**:
Just install it with a package manager (or App Store/Software Manager) and it should be already available globally, if that's not enough go find the _7z_ binary file path and add it to the **$PATH** variable permanently like:
  - `echo "export PATH=\"$PATH:_your_7z_folder_\"" >> ~/.bashrc`;

## How to use it?

You'll need to either type `tui7zArchiveM` in the terminal or `node tui-7z-archive-manager.mjs` in the same folder of where the package is installed

Read [COMMAND LINE PARAMETERS](COMMAND-LINE-PARAMETERS.md) for more information about the available parameters

## What changes have been made?

Check out the [CHANGELOG](CHANGELOG.md) file for more information.

It will include all changes being made in each version.

## Keyboard shortcuts

Pressing enter will show all the available commands

- `d` → delete command;
- `c` → move command;
- `a` → add command;
  - `Ctrl + a` → skips to the selector for adding 📂/📄s;
  - `Meta (alt key) + a` → skips to the file creation;
  - `Shift + a` → skips to the folder creation;
- `e` → extract command;
  - `Ctrl + e` → skips to the "same place of archive" extraction;
  - `Shift + e` → skips to the "different location" extraction;
- `r` → rename command;
- `n` → change archive command;
- `Shift + n` → create an archive command;
- `i` → information command;
  - `Shift + i` → shows only information about the archive;
- `h` → help command;

When using the info command:

- `Ctrl + arrow up` → Goes to the first item in the list
- `Ctrl + arrow down` → Goes to the last item in the list
- `Page up` → Goes 3 items forwards normally but if the amount of items is less or equal to 3, it's like using w or up arrow
- `Page down` → Goes 3 items backwards normally but if the amount of items is less or equal to 3, it's like using s or down arrow

## Options

1. **inquirerPagePrompsSize** → the amount of things that prompts can show at once (e.g the list of the archive) (_default: 20_);
2. **skipToNewlyCreatedArchive** → goes directly to the newly created archive (_default: true_);
3. **backToMenuAfterCreatedArchive** → goes back to the current archive and not the new one just created (_default: false_);

## Credits

[Inquirer.js](https://github.com/SBoudrias/Inquirer.js) for the library of prompts

anc95's [inquirer-file-tree-selection-prompt](https://github.com/anc95/inquirer-file-tree-selection) for the file selector

leonsilicon's [inquirer-press-to-continue](https://github.com/leonzalion/inquirer-press-to-continue) for the pause prompt

insightfuls' [inquirer-tree-prompt](https://github.com/insightfuls/inquirer-tree-prompt) for generating the list prompt of the archive