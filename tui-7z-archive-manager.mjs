#!/usr/bin/env node
/*
  Copyright (C) 2024  unixatch

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with tui-7z-archive-manager.  If not, see <https://www.gnu.org/licenses/>.
*/

// Detects if 7zip is installed correctly
const { spawnSync } = await import("child_process");
try {
  spawnSync("7z")
} catch (e) {
  console.log("\x1b[31;1m"+"7zip is not installed or it's not visible globally"+"\x1b[0m");
  process.exit()
}
// In case the user passes some arguments
const userArgs = process.argv.slice(2);
if (userArgs.length > 0) {
  const { actUpOnPassedArgs } = await import("./cli.mjs");
  await actUpOnPassedArgs(process.argv)
}

const { tmpdir } = await import("os");
const { 
  lstatSync,
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  renameSync,
  rmSync
} = await import("fs");
const { 
  sep,
  parse,
  basename,
  extname,
  dirname,
  resolve
} = await import("path");
const { platform } = await import("process");

const {
  escapeRegExp,
  clearLastLines,
  addRemove_Keypress,
  getStringList,
  promptWithKeyPress,
  checkTypesFromConfig,
  execute7zCommand,
  getAmountOfLinesToClean
} = await import("./utils/utils.mjs");
const { default: JSONConfigPath } = await import("./createConfigJSON.mjs");

const { default: inquirer } = await import("inquirer");
class waitingMessagePrompt {
  constructor(message){
    this.message = message;
    this.prompt = inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: false,
      pressToContinueMessage: message
    });
  }
  close() {
    this.prompt.ui.activePrompt.close()
    return this.prompt;
  }
}
const asyncImports = {
  select: "",
  tree: "",
  treeSelection: "",
  pause: "",
  input: "",
  confirm: "",
  editor: ""
}
const supportedArchivesRegex = {
  // Limited support message for certain archives
  limited: /^\.(?:rar|cab|ar|a|dep|lib|arj|z|taz|cpio|rpm|deb|lzh|lha|chm|chi|chq|chw|hxs|hxi|hxr|hxq|hxw|iso|msi|msp|doc|xls|ppt|exe|apm|cramfs|dmg|elf|ext|ext2|ext3|ext4|fat|img|flv|gpt|mpr|hfs|hfsx|ihex|lzma|lzma86|macho|mslz|mub|nsis|dll|sys|te|pmd|qcow|qcow2|qcow2c|squashfs|udf|scap|uefif|vdi|vhd|vmdk|xar|pkg|xip|lz|tlz)$/m,
  /*
    It's all the supported extension listed in
    7zip's "i" command, that is: "7z i"
  */
  complete: /^\.(?:7z|zip|zipx|jar|xpi|odt|ods|docx|xlsx|epu|ipa|appx|gz|gzip|tgz|tpz|apk|bz2|bzip2|tbz2|tbz|tar|rar|cab|ar|a|dep|lib|arj|z|taz|cpio|rpm|deb|lzh|lha|chm|chi|chq|chw|hxs|hxi|hxr|hxq|hxw|iso|msi|msp|doc|xls|ppt|wim|swm|esd|ppkg|exe|apm|cramfs|dmg|elf|ext|ext2|ext3|ext4|fat|img|flv|gpt|mpr|hfs|hfsx|ihex|lzma|lzma86|macho|mslz|mub|nsis|dll|sys|te|pmd|qcow|qcow2|qcow2c|squashfs|swf|ova|udf|scap|uefif|vdi|vhd|vmdk|xar|pkg|xip|xz|txz|liz|tliz|lz|tlz|lz4|tlz4|lz5|tlz5|zst|tzstd)$/m,
  // Creation of archives is limited to only file types below
  creation: /^\.(?:7z|bz2|bzip2|tbz2|tbz|gz|gzip|tgz|tpz|apk|tar|ova|zip|zipx|jar|xpi|odt|ods|docx|xlsx|epub|ipa|appx|liz|tliz|lz4|tlz4|lz5|tlz5|zst|tzstd|wim|swm|esd|ppkg|xz|txz)$/m
}
let onlyDirectories, 
    onlyFiles,
    mappedFSStructure,
    surfaceCount,
    firstTime;
// Windows compatibility
const typeOfSlash = (platform === "win32") ? "\\\\" : "\\/";


// User's configurations
let fileJson = JSON.parse(readFileSync(JSONConfigPath).toString());
let { 
  inquirerPagePromptsSize,
  skipToNewlyCreatedArchive,
  backToMenuAfterCreatedArchive,
  recursiveSearch
} = fileJson;
checkTypesFromConfig(fileJson)

// Replacements if the user used 1 of the available parameters
if (global.parameter === "--skip") {
  delete global.parameter;
  // True
  skipToNewlyCreatedArchive = global.skipCreatedArchive;
  // False
  backToMenuAfterCreatedArchive = global.goBackInsteadOfSkippingForCreatedArchive;
}
if (global.parameter === "--back") {
  delete global.parameter;
  // True
  backToMenuAfterCreatedArchive = global.goBackInsteadOfSkippingForCreatedArchive;
  // False
  skipToNewlyCreatedArchive = global.skipCreatedArchive;
}
if (global.parameter === "--recursive") {
  delete global.parameter;
  recursiveSearch = true;
}
if (global.parameter === "--no-recursive") {
  delete global.parameter;
  recursiveSearch = false;
}
// --create
if (global.skipToCreateArchive) {
  surfaceCount = 0;
  firstTime = false;
  // Needed because otherwise it clears unwanted lines
  console.log(`${dimGray}--- ${normal+dimGreen}Create parameter mode${normal+dimGray} ---${normal}`)
  const newlyCreatedArchive = await createCommand();
  if (global.command === "backToMainMenu") {
    const archiveFile = await getArchivePath();
    await mainMenu(true, archiveFile)
  } else {
    // Needed because otherwise it clears unwanted lines
    console.log()
    await mainMenu(true, newlyCreatedArchive)
  }
}

async function getArchivePath() {
  // In case the user gave the path already
  if (global.userProvidedArchiveFilePath !== undefined) {
    const archiveFileString = global.userProvidedArchiveFilePath;
    delete global.userProvidedArchiveFilePath;
    return {
      selected: archiveFileString
    };
  }
  
  if (asyncImports.treeSelection === "") {
    const { default: treeSelection } = await import("./utils/prompts/file-tree-modified.mjs");
    inquirer.registerPrompt("file-tree-selection", treeSelection)
    delete asyncImports.treeSelection
  }
  const message = "Choose an archive:";
  const archiveFile = await promptWithKeyPress("quitOnly", () => {
    return inquirer.prompt({
      type: "file-tree-selection",
      message: message,
      name: "selected",
      pageSize: inquirerPagePromptsSize,
      enableGoUpperDirectory: true,
      validate: selected => {
        if (!lstatSync(selected).isFile()) {
          return "This isn't even a file";
        }
        /*
          It's all the supported extension listed in
          7zip's "i" command, that is: "7z i"
        */
        if (!supportedArchivesRegex.complete.test(extname(selected))) {
          return "It's not a supported archive";
        }
        return true;
      }
    })
  });
  addRemove_Keypress("close")
  clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
  return archiveFile;
}
async function createMap(archiveFilePassed) {
  let archiveFile;
  if (archiveFilePassed === undefined) {
    archiveFile = await getArchivePath();
  } else if (!archiveFilePassed instanceof Object) {
    throw new TypeError("Gave something that it's not an object")
  } else archiveFile = archiveFilePassed;
  
  console.log(gray+"Loading list..."+normal)
  let listOfArchive = await getStringList(archiveFile.selected);
  // Gets only Paths and the Attributes
  // or Paths and Folder in case it's not 7z
  listOfArchive = listOfArchive
    .replaceAll(
      (extname(archiveFile.selected) === ".7z")
        ? /^(?!Path.*|Attributes.*).*\n?/gm
        : /^(?!Path.*|Folder.*).*\n?/gm, "");

  const regexes = [
    (extname(archiveFile.selected) === ".7z") 
      ? /Path = (.*)\nAttributes = D/g // 7zip
      : /Path = (.*)\nFolder = \+/g, // Others
    (extname(archiveFile.selected) === ".7z") 
      ? /Path = (.*)\nAttributes = A/g // 7zip
      : /Path = (.*)\nFolder = -/g // Others
  ]
  mappedFSStructure = new Map();
  onlyDirectories = Array.from(
    listOfArchive.matchAll(regexes[0]),
    (matchArray) => matchArray[1]
  );
  // For cases where there's a slash at the end that should not be there
  if (onlyDirectories[0]?.endsWith(
        (platform === "win32")
          ? "\\"
          : "/")
      ) {
    onlyDirectories = onlyDirectories.map(
      dir => dir.replace(new RegExp(`${typeOfSlash}$`, "m"), "")
    );
  }
  onlyFiles = Array.from(
    listOfArchive.matchAll(regexes[1]),
    (matchArray) => matchArray[1]
  );
  
  const pattern = new RegExp(`^[^${typeOfSlash}]*$`, "m");
  const surface = [
    // Folders 📂 
    onlyDirectories.filter((path) => pattern.test(path)),
    // Files 📄
    onlyFiles.filter((path) => pattern.test(path))
  ];
  
  surface[0].forEach((path) => {
    mappedFSStructure.set(path, {
      name: path,
      path: path,
      children: []
    })
  })
  mappedFSStructure.set("surface", [...surface[0]])
  recursivelyMappingSubdirectories(surface[0])
  mappingFiles()
  
  clearLastLines([0, await getAmountOfLinesToClean(gray+"Loading list..."+normal)*-1])
  return archiveFile;
}


function recursivelyMappingSubdirectories(arrayOfFolderPaths, wantToSearchInFiles = false) {
  if (typeof arrayOfFolderPaths === "undefined" || !(arrayOfFolderPaths instanceof Array)) return;
  if (arrayOfFolderPaths.length === 0) return;


  const ogArrayList = (wantToSearchInFiles) ? onlyFiles : onlyDirectories;
  let subDirectories = [];
  const regexOfEndName = new RegExp(`^.*${typeOfSlash}`, "m");
  const regexOfSurfacePath = new RegExp(`^[^${typeOfSlash}]*$`, "m");

  arrayOfFolderPaths.forEach((path) => {
    const name = path.replace(regexOfEndName, "");
    const pattern = (wantToSearchInFiles) 
      // This regex checks for subdirectories, 
      // capturing the folder that the file is in without the slash at the end
      ? new RegExp(`^(${escapeRegExp(path) + typeOfSlash}[^${typeOfSlash}]*)${typeOfSlash}[^${typeOfSlash}]*$`, "m") 
      // This regex checks for subdirectories
      : new RegExp(`^${escapeRegExp(path) + typeOfSlash}[^${typeOfSlash}]*$`, "m");

    // The .filter() method is required, 🚫 DO NOT CHANGE 🚫
    let subDirectoriesIn = ogArrayList.filter((path) => {
      if (pattern.test(path)) {
        if (wantToSearchInFiles) {
          // Prevents duplicates
          path = path.match(pattern)[1];
          if (subDirectories.find(p => p === path)) return false;
        }
        subDirectories.push(path)
        return true;
      }
      return false;
    })

    if (wantToSearchInFiles
        && path.match(regexOfSurfacePath) !== null) {
      const surface = mappedFSStructure.get("surface");
      const newSurface = [...surface, path];
      mappedFSStructure.set("surface", newSurface);
    }
    if (subDirectoriesIn.length === 0) {
      mappedFSStructure.set(
        (!wantToSearchInFiles) 
          ? path 
          : path.match(pattern)[1], {
        name: name,
        path: path,
        children: []
      })
      return;
    }

    if (wantToSearchInFiles) {
      // Strips out the filename, 
      // leaving the subdirectory path
      subDirectoriesIn = subDirectoriesIn.map((path) => {
        const subDir = path.match(pattern);
        if (subDir !== null) return subDir[1];
      })
    }
    mappedFSStructure.set(
      (!wantToSearchInFiles) 
        ? path 
        : path.match(pattern)[1], {
      name: name,
      path: path,
      children: subDirectoriesIn
    })
  })
  return recursivelyMappingSubdirectories(subDirectories, wantToSearchInFiles);
}
function mappingFiles() {
  const regexOfEndName = new RegExp(`^.*${typeOfSlash}`, "m");
  onlyFiles.forEach((path) => {
    const subFileName = path.replace(regexOfEndName, "");
    const pattern = new RegExp(
      `(.*)${typeOfSlash + escapeRegExp(subFileName)}$`, "m"
    );
    const isInside = path.match(pattern);

    // Makes sure that it's not inside a directory
    if (isInside === null || isInside[1] === "") {
      const newSurfaceArray = [...mappedFSStructure.get("surface"), path];
      mappedFSStructure.set("surface", newSurfaceArray)
      return;
    }

    /*
      Tries to add the file inside the correct subfolder name in the Map(),
      but if it fails, it goes out to create the missing directory then tries again
      (this doesn't trigger if the error isn't 
      what's expected to be and it's a different error)
    */
    try {
      const entryObject = mappedFSStructure.get(isInside[1]);
      const newSubDirChildren = [...entryObject.children, subFileName];
      mappedFSStructure.set(isInside[1], {
        name: entryObject.name,
        path: entryObject.path,
        children: newSubDirChildren
      })
    } catch(err) {
      const {name, message, stack} = err;
      if (name === "TypeError" 
          && message === "Cannot read properties of undefined (reading 'children')") {
        const surfaceFolderName = new RegExp(`([^${typeOfSlash}]*)(?:${typeOfSlash}[^${typeOfSlash}]*)*$`, "m");
        const missingSurfaceFolder = path.match(surfaceFolderName)[1];
        recursivelyMappingSubdirectories([missingSurfaceFolder], true);

        const entryObject = mappedFSStructure.get(isInside[1]);
        const newSubDirChildren = [...entryObject.children, subFileName];
        return mappedFSStructure.set(isInside[1], {
          name: entryObject.name,
          path: entryObject.path,
          children: newSubDirChildren
        })
      }
      console.log(`${red+name+normal}${normalRed}:${bold+message+normal}\n${normalRed+stack+normal}`);
      process.exit();
    }
  })
}

// Needed because at the end mainMenu() is asynchronous
(global.skipToCreateArchive) ? Function.prototype() : surfaceCount = 0;
function createDirectoryLister(dir) {
	return () => {
	  const currentDir = mappedFSStructure.get(dir);
	  let returnValue;
	  if (surfaceCount === 0) {
	    surfaceCount += 1;
	    returnValue = currentDir;
	  } else {
	    returnValue = currentDir.children;
	  }
    
		return returnValue
		.map((item) => {
		  const contents = mappedFSStructure.get(item);
			const isDirectory = (contents) ? true : false;
			let resolved = item+sep;
			
			if (!isDirectory) {
			  resolved = (currentDir instanceof Array) ? item : currentDir.path+sep+item;
			  return {
			    name: item,
			    value: resolved,
			    children: null
			  }
			}
			return {
				name: contents.name,
				value: resolved,
				children: createDirectoryLister(contents.path)
			}
		})
	}
}

// Needed because at the end mainMenu() is asynchronous
(global.skipToCreateArchive) ? Function.prototype() : firstTime = true;
let mainMessage = "";
async function mainMenu(refresh, archiveFilePassed) {
  if (archiveFilePassed !== undefined 
      && !archiveFilePassed instanceof Object) {
    throw new TypeError("The 2nd argument is not an object");
  }
  let archiveFile;
  if (firstTime) {
    archiveFile = await createMap();
    firstTime = false;
    // Limited support message for certain archives
    if (supportedArchivesRegex.limited.test(extname(archiveFile.selected))) {
      global.hasLimitedSupport = true;
      console.log(dimYellow+`The archive ${italics+basename(archiveFile.selected)+normal+dimYellow} has limited support from 7zip`+normal);
    }
  }
  // Recreates the entire Map()
  if (refresh
      && archiveFilePassed instanceof Object) {
    if (global.command === "changeCommand" && global.hasLimitedSupport) {
      delete global.hasLimitedSupport
      // Cleans the \n
      clearLastLines([0, -1])
    } else {
      clearLastLines([0, await getAmountOfLinesToClean(mainMessage)*-1])
    }
    surfaceCount = 0;
    archiveFile = await createMap(archiveFilePassed);
  }
  // Uses the already available Map()
  if (!refresh
      && archiveFilePassed instanceof Object) {
    clearLastLines([0, await getAmountOfLinesToClean(mainMessage)*-1])
    surfaceCount = 0;
    archiveFile = archiveFilePassed;
  }
  if (global.command === "changeCommand") {
    // Limited support message for certain archives
    if (supportedArchivesRegex.limited.test(extname(archiveFile.selected))) {
      console.log(dimYellow+`The archive ${italics+basename(archiveFile.selected)+normal+dimYellow} has limited support from 7zip`+normal);
      global.hasLimitedSupport = true;
    }
    delete global.command
  }
  
  if (asyncImports.tree === "") {
    const { default: TreePrompt } = await import("./utils/prompts/tree-prompt-modified.mjs");
    inquirer.registerPrompt("tree", TreePrompt)
    delete asyncImports.tree
  }
  const thingsToClean = inquirer.prompt({
    type: "tree",
    message: "Archive: "+basename(archiveFile.selected),
    name: "selected",
    multiple: true,
    pageSize: inquirerPagePromptsSize,
    tree: createDirectoryLister("surface"),
    mapOfTree: mappedFSStructure,
    recursiveSearch: recursiveSearch
  })
  addRemove_Keypress("complete", thingsToClean);
  
  mainMessage = "Archive: "+basename(archiveFile.selected);
  thingsToClean.then(async (list) => {
    addRemove_Keypress("close")
    // Shortcuts
    switch (global.command) {
      case "deleteCommand": 
        await deleteCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "cutCommand":
        await cutCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "addCommand":
        await addCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      // Ctrl + a
      case "add_FileSelection":
        await addCommand(list, archiveFile, "file-selection")
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      // Meta + a
      case "add_CreateFile":
        await addCommand(list, archiveFile, "create-file")
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      // Shift + a
      case "add_CreateFolder":
        await addCommand(list, archiveFile, "create-folder")
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "extractCommand":
        await extractCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      // Ctrl + e
      case "extract_here":
        await extractCommand(list, archiveFile, "here")
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      // Shift + e
      case "extract_elsewhere":
        await extractCommand(list, archiveFile, "elsewhere")
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "renameCommand":
        await renameCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "changeCommand":
        const newArchiveFile = await changeArchive(archiveFile);
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, newArchiveFile)
        return;
      case "infoCommand":
        await infoCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      // shift + i
      case "info_on_archive":
        await infoCommand(list, archiveFile, true)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "createCommand":
        const newlyCreatedArchive = await createCommand();
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, newlyCreatedArchive)
        return;
      case "openCommand":
        await openCommand(list, archiveFile)
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, archiveFile)
        return;
      case "renameArchiveCommand":
        const newName = await renameCommand(list, archiveFile, true);
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        mainMenu(true, { selected: newName })
        return;
      case "helpCommand":
        await helpCommand()
        mainMenu(false, archiveFile)
        return;
      
      default:
        // Just in case it still exists
        delete global.command
        if (asyncImports.select === "") {
          const { default: select } = await import("./utils/prompts/inquirer-select.mjs");
          inquirer.registerPrompt("select", select)
          delete asyncImports.select
        }
        
        const message = "Choose what to do:";
        const choices = [
          {
            name: "Help",
            value: "help-command"
          },
          {
            name: "Change archive",
            value: "change-command"
          },
          {
            name: "Rename archive",
            value: "rename-archive-command",
            description: "Renames the active archive with the new name"
          },
          {
            name: "Creation command",
            value: "create-command",
            description: "Create an entirely new archive"
          },
          {
            name: "Open command",
            value: "open-command",
            description: "Opens the selected 📄/📂 inside the archive"
          },
          {
            name: "Add command",
            value: "add-command",
            description: "Add something to the archive"
          },
          {
            name: "Move command",
            value: "cut-command",
            description: "Move the selected 📄/📂 to another location inside the archive"
          },
          {
            name: "Rename command",
            value: "rename-command",
            description: "Rename the selected 📄/📂 inside the archive"
          },
          {
            name: "Delete command",
            value: "delete-command",
            description: "Delete the selected 📄/📂 from the archive"
          },
          {
            name: "Extract command",
            value: "extract-command",
            description: "Extract the selected 📄/📂 from the archive"
          },
          {
            name: "Information command",
            value: "info-command",
            description: "Get information about the selected 📄/📂 inside the archive"
          }
        ]
        let selectedCommand = await promptWithKeyPress("quitPlusEsc", () => {
          return inquirer.prompt({
            type: "select",
            name: "selected",
            message: message,
            choices: choices,
            pageSize: inquirerPagePromptsSize
          })
        });
        addRemove_Keypress("close")
        selectedCommand = selectedCommand.selected;
        // Cleans the select prompt
        clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
        if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
        
        switch (selectedCommand) {
          case 'help-command':
            await helpCommand();
            mainMenu(false, archiveFile)
            break;
          case 'change-command':
            const newArchiveFile = await changeArchive(archiveFile);
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, newArchiveFile)
            break;
          case 'rename-archive-command':
            const newName = await renameCommand(list, archiveFile, true);
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, { selected: newName })
            break;
          case "create-command":
            const newlyCreatedArchive = await createCommand();
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, newlyCreatedArchive)
            break;
          case 'open-command':
            await openCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
          case 'add-command':
            await addCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
          case 'cut-command':
            await cutCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
          case 'delete-command':
            await deleteCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
          case 'extract-command':
            await extractCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
          case 'rename-command':
            await renameCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
          case "info-command":
            await infoCommand(list, archiveFile)
            if (global.command === "backToMainMenu") return mainMenu(false, archiveFile);
            mainMenu(true, archiveFile)
            break;
        }
    }
  })
}
async function deleteCommand(list, archiveFile) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  delete global.command;
  // Limited support message for certain archives
  if (supportedArchivesRegex.limited.test(extname(archiveFile.selected))) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Cannot delete because of limited 7zip support for this archive format\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  if (list.selected.length < 1) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Nothing was selected, cannot delete anything\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  if (global.autoConfirm === undefined) {
    if (asyncImports.confirm === "") {
      const { default: confirm } = await import("@inquirer/confirm");
      asyncImports.confirm = confirm;
    }
    
    const terminalColumns = process.stdout.columns;
    process.stdout.write("\n")
    list.selected.forEach((selected) => {
      console.log(
        green,
        (selected.length > terminalColumns)
            // Truncates the start so that 
            // it fits the screen if necessary
          ? selected.replace(/^.{5}/m, "...")
          : selected,
        normal
      );
    })
    const message = 'Confirm deletion of selected 📄/📂?';
    const answer = await promptWithKeyPress("quitPlusEsc", () => {
      return asyncImports.confirm({ 
        message: message,
        default: false
      })
    }, false)
    addRemove_Keypress("close")
    clearLastLines([0, await getAmountOfLinesToClean("\n"+list.selected.join("\n")+"\n"+message)*-1])
    if (global.command === "backToMainMenu") return;
    if (!answer) return;
  }
  
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  const waitingMessage = new waitingMessagePrompt(gray+"Deleting the selected 📄/📂, might take a while..."+normal+"\n");
  await execute7zCommand(["d", archiveFile.selected, ...list.selected])
  await waitingMessage.close()
  return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
}
async function cutCommand(list, archiveFile) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  delete global.command;
  // Limited support message for certain archives
  if (supportedArchivesRegex.limited.test(extname(archiveFile.selected))) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Cannot move because of limited 7zip support for this archive format\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  if (list.selected.length < 1) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Nothing was selected, cannot move anything\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  surfaceCount = 0;
  const surface = mappedFSStructure.get("surface");
  const temporaryNewSurface = [".", ...surface];
  mappedFSStructure.set("surface", temporaryNewSurface)
  
  const message = `Select the new location to move to:\n${gray}(selecting . = top-level of the archive)`;
  const newLocation = await promptWithKeyPress("quitPlusEsc", () => {
    return inquirer.prompt({
      type: "tree",
      message: message,
      name: "selected",
      pageSize: inquirerPagePromptsSize,
      multiple: false,
      tree: createDirectoryLister("surface"),
      validate: (str) => {
        if (str.endsWith(sep) || str === ".") return true;
        return "Only directories are allowed"
      },
      onlyShowValid: true
    })
  })
  addRemove_Keypress("close")
  if (global.command === "backToMainMenu") {
    mappedFSStructure.set("surface", surface)
    return clearLastLines([0, await getAmountOfLinesToClean(message)*-1]);
  }
  
  clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
  mappedFSStructure.set("surface", surface)
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  const waitingMessage = new waitingMessagePrompt(gray+"Moving the selected 📄/📂, might take a while..."+normal+"\n")
  // Moving part
  for (const path of list.selected) {
    if (newLocation.selected === ".") {
      await execute7zCommand([
        "rn", 
        archiveFile.selected,
        path,
        basename(path)
      ])
      continue;
    }
    await execute7zCommand([
      "rn",
      archiveFile.selected,
      path,
      newLocation.selected+basename(path)
    ])
  }
  await waitingMessage.close()
  return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
}
async function addCommand(list, archiveFile, skipToSection) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  addRemove_Keypress("close");
  delete global.command;
  // Limited support message for certain archives
  if (supportedArchivesRegex.limited.test(extname(archiveFile.selected))) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Cannot add because of limited 7zip support for this archive format\n"+normal
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  
  // In case the user did a specific shortcut,
  // skip ahead to the part interested
  let action, messageOfAddModeSelection;
  if (skipToSection === "file-selection"
      || skipToSection === "create-file"
      || skipToSection === "create-folder") {
    action = skipToSection;
    skipToSection = true;
  } else skipToSection = false;
  if (!skipToSection) {
    if (asyncImports.select === "") {
      const { default: select } = await import("./utils/prompts/inquirer-select.mjs");
      inquirer.registerPrompt("select", select)
      delete asyncImports.select
    }
    messageOfAddModeSelection = "Choose how do you want to add:";
    const choices = [
      {
        name: "File selector",
        value: "file-selection",
        description: "Select a file from the file system to be put inside the archive"
      },
      {
        name: "New file",
        value: "create-file",
        description: "Create a brand new file and inserts it inside the archive"
      },
      {
        name: "New folder/s",
        value: "create-folder",
        description: "Create brand-new folder/s inside the archive"
      }
    ]
    action = await promptWithKeyPress("quitPlusEsc", () => {
      return inquirer.prompt({
        type: "select",
        name: "selected",
        message: messageOfAddModeSelection,
        choices: choices,
        pageSize: inquirerPagePromptsSize
      })
    });
    addRemove_Keypress("close")
    action = action.selected;
    
    if (global.command === "backToMainMenu") return clearLastLines([0, await getAmountOfLinesToClean(messageOfAddModeSelection)*-1]);
  }
  
  if (action === "file-selection") {
    if (asyncImports.treeSelection === "") {
      const { default: treeSelection } = await import("./utils/prompts/file-tree-modified.mjs");
      inquirer.registerPrompt("file-tree-selection", treeSelection)
      delete asyncImports.treeSelection
    }
    // Recursive function to prevent an empty selection
    async function getFromFs() {
      const messageOfPicker = "Pick the file or folder:";
      const fromFs = await promptWithKeyPress("quitPlusEsc", () => {
        return inquirer.prompt({
          type: "file-tree-selection",
          message: messageOfPicker,
          name: "selection",
          pageSize: inquirerPagePromptsSize,
          enableGoUpperDirectory: true,
          multiple: true
        })
      });
      addRemove_Keypress("close")
      if (global.command === "backToMainMenu") {
        return clearLastLines([
          0, 
          (skipToSection)
            ? await getAmountOfLinesToClean(messageOfPicker)*-1
            : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfPicker)*-1
        ]);
      }
      
      if (fromFs.selection.length === 0) {
        clearLastLines([0, await getAmountOfLinesToClean(messageOfPicker)*-1]);
        if (asyncImports.pause === "") {
          const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
          inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
          delete asyncImports.pause
        }
        const message = yellow+"You have to select something...\n"+normal;
        await promptWithKeyPress("quitPlusEsc", () => {
          return inquirer.prompt({
            name: "key",
            type: "press-to-continue",
            anyKey: true,
            pressToContinueMessage: message
          })
        })
        addRemove_Keypress("close")
        if (global.command === "backToMainMenu") {
          return clearLastLines([
            0, 
            (skipToSection)
              ? await getAmountOfLinesToClean(message.replace("\n", ""))*-1
              : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+message.replace("\n", ""))*-1
          ]);
        }
        clearLastLines([0, await getAmountOfLinesToClean(message.replace("\n", ""))*-1]);
        return getFromFs();
      }
      clearLastLines([
        0, 
        (skipToSection) 
          ? await getAmountOfLinesToClean(messageOfPicker)*-1
          : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfPicker)*-1
      ])
      return fromFs;
    }
    const fromFs = await getFromFs();
    if (global.command === "backToMainMenu") return addCommand(list, archiveFile);
    
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const waitingMessage = new waitingMessagePrompt(gray+"Adding the selected 📄/📂, might take a while..."+normal+"\n")
    await execute7zCommand(["a", archiveFile.selected, ...fromFs.selection])
    await waitingMessage.close()
    return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
  }
  if (action === "create-file") {
    if (asyncImports.editor === "") {
      const { default: editor } = await import("@inquirer/editor");
      asyncImports.editor = editor;
    }
    if (asyncImports.input === "") {
      const { default: input } = await import("@inquirer/input");
      asyncImports.input = input;
    }
    const forbiddenChars_Win = /^<|>|:|"|\/|\\|\||\?|\*$/m;
    const forbiddenNames_Win = /CON|PRN|AUX|NUL|COM1|COM2|COM3|COM4|COM5|COM6|COM7|COM8|COM9|LPT1|LPT2|LPT3|LPT4|LPT5|LPT6|LPT7|LPT8|LPT9/;
    const messageOfFilename = "Insert the filename that you want to create:";
    const filename = await promptWithKeyPress("quitPlusEsc", () => {
      return asyncImports.input({
        message: messageOfFilename,
        validate: (str) => {
          if (/^\s*$/m.test(str)) return "Write down something at least"
          if (dirname(str) === "/") return "Cannot use a single / as directory name"
          if (platform === "win32") {
            if (forbiddenChars_Win.test(str)) {
              return "One of the characters is forbidden on Windows"
            }
            if (forbiddenNames_Win.test(parse(str).name)
                || forbiddenNames_Win.test(parse(str).ext)) {
              return "Cannot use that name because on Windows it's reserved"
            }
            if (str.endsWith(".") || str.endsWith(" ")) {
              return "Cannot end with a . or space on Windows"
            }
          }
  
          if (extname(str) && extname(str) !== ".") return true;
          return "Input given is not valid"
        },
        theme: {
          style: {
            // Removes the blue answer on the right of the message 
            // for easier cleaning of the line
            answer: (str) => ""
          }
        }
      })
    }, false)
    addRemove_Keypress("close")
    if (global.command === "backToMainMenu") {
      clearLastLines([
        0, 
        (skipToSection)
          ? await getAmountOfLinesToClean(messageOfFilename)*-1
          : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfFilename)*-1
      ])
      return addCommand(list, archiveFile);
    }
    const messageOfFileContent = "Creating a new file";
    const fileContent = await asyncImports.editor({
      message: messageOfFileContent,
      postfix: `${extname(filename)}`,
      default: '\nType "back()" on the first line in this file to go back to the 3 add modes\nOr type "quit()" on the first line to cleanly quit the program',
      waitForUseInput: false
    })
    if (/^back\(\)$/m.test(fileContent)) {
      clearLastLines([
        0, 
        (skipToSection)
          ? await getAmountOfLinesToClean(messageOfFilename+"\n"+messageOfFileContent)*-1
          : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfFilename+"\n"+messageOfFileContent)*-1
      ])
      return addCommand(list, archiveFile);
    }
    if (/^quit\(\)$/m.test(fileContent)) {
      clearLastLines([
        0, 
        (skipToSection)
          ? await getAmountOfLinesToClean(messageOfFilename+"\n"+messageOfFileContent)*-1
          : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfFilename+"\n"+messageOfFileContent)*-1
      ])
      return process.exit();
    }
    
    clearLastLines([
      0, 
      (skipToSection)
        ? await getAmountOfLinesToClean(messageOfFilename+"\n"+messageOfFileContent)*-1
        : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfFilename+"\n"+messageOfFileContent)*-1
    ])
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const waitingMessage = new waitingMessagePrompt(gray+"Adding the new 📄, might take a while..."+normal+"\n")
    // Creation part
    let dedicatedTmpDir = resolve(tmpdir(), "7z-archive-manager");
    if (dirname(filename) !== ".") {
      mkdirSync(
        resolve(dedicatedTmpDir, dirname(filename)), 
        { recursive: true }
      )
      writeFileSync(
        resolve(dedicatedTmpDir, filename), 
        fileContent
      );
    } else {
      if (!existsSync(dedicatedTmpDir)) mkdirSync(dedicatedTmpDir);
      writeFileSync(
        resolve(dedicatedTmpDir, filename),
        fileContent
      )
    }
    await execute7zCommand(["a", archiveFile.selected, dedicatedTmpDir+"/*"])
    
    const filenamePathToRemove = (dirname(filename) !== ".") ? filename.match(new RegExp(`^[^${typeOfSlash}]*`, "m"))[0] : filename;
    rmSync(
      resolve(dedicatedTmpDir, filenamePathToRemove),
      { recursive: true }
    );
    await waitingMessage.close()
    return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
  }
  if (action === "create-folder") {
    if (asyncImports.input === "") {
      const { default: input } = await import("@inquirer/input");
      asyncImports.input = input;
    }
    const messageOfFolderName = "Name of the 📂/:";
    const answer = await promptWithKeyPress("quitPlusEsc", () => {
      return asyncImports.input({ 
        message: messageOfFolderName,
        validate: (str) => {
          if (/^\s*$/m.test(str)) return "Write down something at least"
  
          if (str.endsWith(sep)) return true;
          return "Input given is not valid"
        },
        transformer: (str, {isFinal}) => {
          if (isFinal 
              && str.endsWith("/") 
              && platform === "win32") {
            return str.replaceAll("/", sep);
          }
          return str;
        },
        theme: {
          style: {
            // Removes the blue answer on the right of the message 
            // for easier cleaning of the line
            answer: (str) => ""
          }
        }
      })
    }, false);
    addRemove_Keypress("close")
    clearLastLines([
      0, 
      (skipToSection)
        ? await getAmountOfLinesToClean(messageOfFolderName)*-1
        : await getAmountOfLinesToClean(messageOfAddModeSelection+"\n"+messageOfFolderName)*-1
    ])
    if (global.command === "backToMainMenu") return addCommand(list, archiveFile);
    
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const waitingMessage = new waitingMessagePrompt(gray+"Adding the new 📂, might take a while..."+normal+"\n")
    const dedicatedTmpDir = resolve(tmpdir(), "7z-archive-manager");
    mkdirSync(
      resolve(dedicatedTmpDir, answer), 
      { recursive: true }
    )
    await execute7zCommand(["a", archiveFile.selected, dedicatedTmpDir+"/*"])
    // Deletes only the user-requested directories,
    // not "dedicatedTmpDir"
    rmSync(
      resolve(dedicatedTmpDir, answer.match(new RegExp(`^[^${typeOfSlash}]*`, "m"))[0]),
      { recursive: true }
    );
    await waitingMessage.close()
    return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
  }
}
async function extractCommand(list, archiveFile, skipToSection) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  
  // In case the user did a specific shortcut,
  // skip ahead to the part interested
  let answer;
  if (skipToSection === "here" || skipToSection === "elsewhere") {
    answer = (skipToSection === "here") ? true : false;
    skipToSection = true;
  } else skipToSection = false;
  if (!skipToSection) {
    if (asyncImports.confirm === "") {
      const { default: confirm } = await import("@inquirer/confirm");
      asyncImports.confirm = confirm;
    }
    const message = 'Extract alongside the archive (y) or elsewhere (n)?';
    answer = await promptWithKeyPress("quitPlusEsc", () => {
      return asyncImports.confirm({ 
        message: message,
        default: true
      })
    }, false)
    addRemove_Keypress("close")
    clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
    if (global.command === "backToMainMenu") return;
  }
  
  const specificThings = (list.selected.length > 0) ? list.selected : [""];
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  let waitingMessage;
  if (answer) {
    waitingMessage = new waitingMessagePrompt(gray+"Extracting the selected 📄/📂, might take a while..."+normal+"\n");
    await execute7zCommand([
      "x",
      archiveFile.selected,
      ...specificThings,
      "-o" + resolve(
        dirname(archiveFile.selected), 
        "extracted_"+parse(archiveFile.selected).name+"_"+Math.floor(Math.random() * 1000000)
      )
    ])
  } else {
    if (asyncImports.treeSelection === "") {
      const { default: treeSelection } = await import("./utils/prompts/file-tree-modified.mjs");
      inquirer.registerPrompt("file-tree-selection", treeSelection)
      delete asyncImports.treeSelection
    }
    const message = "Pick the extraction destination:";
    const extractLocation = await promptWithKeyPress("quitPlusEsc", () => {
      return inquirer.prompt({
        type: "file-tree-selection",
        message: message,
        name: "selected",
        pageSize: inquirerPagePromptsSize,
        enableGoUpperDirectory: true,
        onlyShowDir: true
      })
    })
    addRemove_Keypress("close")
    if (global.command === "backToMainMenu") return clearLastLines([0, await getAmountOfLinesToClean(message)*-1]);
    clearLastLines([0, await getAmountOfLinesToClean(message)*-1]);
    
    waitingMessage = new waitingMessagePrompt(gray+"Extracting the selected 📄/📂, might take a while..."+normal+"\n");
    await execute7zCommand([
      "x",
      archiveFile.selected,
      ...specificThings,
      "-o" + resolve(
        extractLocation.selected, 
        "extracted_"+parse(archiveFile.selected).name+"_"+Math.floor(Math.random() * 1000000)
      )
    ])
  }
  await waitingMessage.close()
  return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
}
async function renameCommand(list, archiveFile, onlyArchiveName = false) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  addRemove_Keypress("close");
  delete global.command;
  if (onlyArchiveName) {
    if (asyncImports.input === "") {
      const { default: input } = await import("@inquirer/input");
      asyncImports.input = input;
    }
    const forbiddenNames_Win = /CON|PRN|AUX|NUL|COM1|COM2|COM3|COM4|COM5|COM6|COM7|COM8|COM9|LPT1|LPT2|LPT3|LPT4|LPT5|LPT6|LPT7|LPT8|LPT9/;
    const message = "Insert the new filename that you want to use:";
    const newFileName = await promptWithKeyPress("quitPlusEsc", () => {
      return asyncImports.input({
        message: message,
        validate: (str) => {
          if (/^\s*$/m.test(str)) return "Write down something at least"
          if (existsSync(str)) return "Can't use that name since it already exists"
          if (platform === "win32") {
            if (forbiddenChars_Win.test(str)) {
              return "One of the characters is forbidden on Windows"
            }
            if (forbiddenNames_Win.test(parse(str).name)
                || forbiddenNames_Win.test(parse(str).ext)) {
              return "Cannot use that name because on Windows it's reserved"
            }
            if (str.endsWith(".") || str.endsWith(" ")) {
              return "Cannot end with a . or space on Windows"
            }
          }

          if (extname(str) && extname(str) !== ".") return true;
          return "Input given is not valid"
        },
        theme: {
          style: {
            // Removes the blue answer on the right of the message 
            // for easier cleaning of the line
            answer: (str) => ""
          }
        }
      })
    }, false);
    addRemove_Keypress("close")
    if (global.command === "backToMainMenu") {
      return clearLastLines([0, await getAmountOfLinesToClean(message+" "+newFileName)*-1])
    }
    
    clearLastLines([0, await getAmountOfLinesToClean(message+" "+newFileName)*-1])
    renameSync(archiveFile.selected, newFileName);
    return newFileName;
  }
  
  // Limited support message for certain archives
  if (supportedArchivesRegex.limited.test(extname(archiveFile.selected))) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Cannot rename because of limited 7zip support for this archive format\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  if (list.selected.length < 1) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Nothing was selected, cannot rename anything\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  if (asyncImports.input === "") {
    const { default: input } = await import("@inquirer/input");
    asyncImports.input = input;
  }
  const forbiddenChars_Win = /^<|>|:|"|\/|\\|\||\?|\*$/m;
  const forbiddenNames_Win = /CON|PRN|AUX|NUL|COM1|COM2|COM3|COM4|COM5|COM6|COM7|COM8|COM9|LPT1|LPT2|LPT3|LPT4|LPT5|LPT6|LPT7|LPT8|LPT9/;
  const message = "Write the new name:";
  let newName = await promptWithKeyPress("quitPlusEsc", () => {
    return asyncImports.input({
      message: message,
      validate: (str) => {
        if (/^\s*$/m.test(str)) return "Write down something at least"
        if (str.includes("/")) {
          return "Can't use that character in the name"
        }
        if (platform === "win32") {
          if (forbiddenChars_Win.test(str)) {
            return "One of the characters is forbidden on Windows"
          }
          if (forbiddenNames_Win.test(parse(str).name)
              || forbiddenNames_Win.test(parse(str).ext)) {
            return "Cannot use that name because on Windows it's reserved"
          }
          if (str.endsWith(".") || str.endsWith(" ")) {
            return "Cannot end with a . or space on Windows"
          }
        }
        return true;
      },
      theme: {
        style: {
          // Removes the blue answer on the right of the message 
          // for easier cleaning of the line
          answer: (str) => ""
        }
      }
    })
  }, false);
  addRemove_Keypress("close")
  clearLastLines([0, await getAmountOfLinesToClean(message+" "+newName)*-1])
  if (global.command === "backToMainMenu") return;
  // Single rename
  if (list.selected.length === 1) {
    const selected = list.selected[0];
    // In case it has the same name, do nothing
    if (basename(selected) === newName) return;
    
    const isInsideDir = (dirname(selected) !== ".") ? true : false;
    const isDir = (selected.endsWith(sep)) ? true : false;
    const location = mappedFSStructure.get(
      (isInsideDir)
        ? dirname(selected)
        : "surface"
    );
    // Checks if there are identical names same as the new name 
    // and modifies the new name so that it's unique
    const locChildren = (isInsideDir) ? location.children : location;
    for (const path of locChildren) {
      // Same name directories
      if (isDir) {
        if (basename(path) === newName
            && mappedFSStructure.has(path)) {
          newName = newName+"(1)";
          break;
        }
        continue;
      }
      // Same name files
      if (basename(path) === newName
          && !mappedFSStructure.has(path)) {
        newName = parse(newName).name+"(1)"+parse(newName).ext;
        break;
      }
    }
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const waitingMessage = new waitingMessagePrompt(gray+"Renaming the selected 📄/📂, might take a while..."+normal+"\n")
    await execute7zCommand([
      "rn",
      archiveFile.selected,
      selected,
      (isInsideDir)
        ? dirname(selected)+sep+newName
        : newName
    ])
    await waitingMessage.close()
    return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
  }
  
  // Multiple renames
  let renameArray = [];
  let sameNameCount = 1;
  list.selected.reduce((oldPath, selected, index) => {
    // In case it has the same name, do nothing
    if (basename(selected) === newName) return "";
    
    const isInsideDir = (dirname(selected) === ".") ? false : true;
    const isDir = (selected.endsWith(sep)) ? true : false;
    const location = mappedFSStructure.get(
      (isInsideDir) ? dirname(selected) : "surface"
    );
    
    // Checks if there are identical names same as the new name 
    // and modifies the new name so that it's unique
    const ogNewName = newName;
    let foundDuplicate = false;
    const locChildren = (isInsideDir) ? location.children : location;
    for (const path of locChildren) {
      // Same name directories
      if (isDir) {
        if (basename(path) === newName
            && mappedFSStructure.has(path)) {
          foundDuplicate = true;
          // Same location
          if (dirname(oldPath) === dirname(selected)) {
            if (index !== 0) sameNameCount += 1;
          } else sameNameCount = 1;
          newName = newName+`(${sameNameCount})`;
          break;
        }
        continue;
      }
      // Same name files
      if (basename(path) === newName
          && !mappedFSStructure.has(path)) {
        foundDuplicate = true;
        // Same location
        if (dirname(oldPath) === dirname(selected)) {
          if (index !== 0) sameNameCount += 1;
        } else sameNameCount = 1;
        newName = parse(newName).name+`(${sameNameCount})`+parse(newName).ext;
        break;
      }
    }
    // In case no duplicates have been found 
    // but it has several 📂/📄s in the same place
    if (!foundDuplicate) {
      // Same location
      if (dirname(oldPath) === dirname(selected)) {
        if (index !== 0) sameNameCount += 1;
        if (isDir) {
          newName = newName+`(${sameNameCount})`;
        } else {
          newName = parse(newName).name+`(${sameNameCount})`+parse(newName).ext;
        }
      } else sameNameCount = 1;
    }
    renameArray.push(
      selected,
      (isInsideDir)
        ? dirname(selected)+sep+newName
        : newName
    )
    // Resets to the user provided name before continuing
    newName = ogNewName;
    return selected;
  }, "")
  // In case it skipped all of the selected 📂/📄s
  if (renameArray.length === 0) return;
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  const waitingMessage = new waitingMessagePrompt(gray+"Renaming the selected 📄/📂, might take a while..."+normal+"\n");
  await execute7zCommand(["rn", archiveFile.selected, ...renameArray])
  await waitingMessage.close()
  return clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
}
async function changeArchive(archiveFile) {
  if (asyncImports.treeSelection === "") {
    const { default: treeSelection } = await import("./utils/prompts/file-tree-modified.mjs");
    inquirer.registerPrompt("file-tree-selection", treeSelection)
    delete asyncImports.treeSelection
  }
  const message = "Choose the new archive:";
  const newArchiveFile = await promptWithKeyPress("quitPlusEsc", () => {
    return inquirer.prompt({
      type: "file-tree-selection",
      message: message,
      name: "selected",
      pageSize: inquirerPagePromptsSize,
      enableGoUpperDirectory: true,
      validate: selected => {
        if (!lstatSync(selected).isFile()) {
          return "This isn't even a file";
        }
        /*
          It's all the supported extension listed in
          7zip's "i" command, that is: "7z i"
        */
        if (!supportedArchivesRegex.complete.test(extname(selected))) {
          return "It's not a supported archive";
        }
        return true;
      }
    })
  });
  addRemove_Keypress("close")
  if (global.command === "backToMainMenu") {
    clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
    return;
  }
  global.command = "changeCommand";
  clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
  if (global.hasLimitedSupport) {
    // Cleans the old message since we're changing archive
    clearLastLines([0, await getAmountOfLinesToClean(dimYellow+`The archive ${italics+basename(archiveFile.selected)+normal+dimYellow} has limited support from 7zip`+normal+"\n"+mainMessage)*-1])
    // Necessary
    console.log()
  }
  return newArchiveFile;
}
async function infoCommand(list, archiveFile, infoOnArchive = false) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  if (typeof infoOnArchive !== "boolean") {
    throw new TypeError("Only a boolean is accepted")
  }
  addRemove_Keypress("close");
  delete global.command;
  if (list.selected.length < 1 && !infoOnArchive) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Nothing was selected, cannot show info about anything\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  
  if (infoOnArchive) {
    const archiveInfoString = await getStringList(archiveFile.selected, [" "]);
    const onlyArchiveInfo = "\n"+archiveInfoString
      .replace(/.*Listing archive: .*\n--\n/s, "")
      .replace(/\n-{10}\n/, "");
    
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    console.log(onlyArchiveInfo)
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      enter: true
    })
    console.log() // Required
    return clearLastLines([
      0, (await getAmountOfLinesToClean(onlyArchiveInfo)+1)*-1
    ]);
  }
  
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  async function infoNavigation(itemsList, itemNumber = 0) {
    if (!itemsList instanceof Array) {
      throw new TypeError("itemsList must be an array")
    }
    if (!Number.isInteger(itemNumber)) {
      throw new TypeError("itemNumber must be an integer")
    }
    console.log("\n"+`${dimGray}--- ${normal+gray}[${normal+(itemNumber+1)+gray}/${normal+itemsList.length+gray}] ${dimGray}---${normal}\n`+itemsList[itemNumber]);
    const navPrompt = await promptWithKeyPress("infoNavigation", () => {
      return inquirer.prompt({
        name: "key",
        type: "press-to-continue",
        pressToContinueMessage: "(↑/w/P↑) Go upwards, (↓/s/P↓) go downwards and q for quitting\n",
        key: "q",
        oraOptions: {
          spinner: "arrow3"
        }
      })
    });
    clearLastLines([
      0, (await getAmountOfLinesToClean(itemsList[itemNumber])+3)*-1
    ])
    addRemove_Keypress("close")
    // Controls part
    if (navPrompt?.key?.value === "q") return;
    if (global.infoNavDirection === "firstInList") return infoNavigation(itemsList, 0);
    if (global.infoNavDirection === "lastInList") return infoNavigation(itemsList, itemsList.length-1);
    if (global.infoNavDirection === "upward") {
      // Loops downwards from 1st item
      if (itemNumber === 0) return infoNavigation(itemsList, itemsList.length-1);
      return infoNavigation(itemsList, itemNumber-1);
    }
    if (global.infoNavDirection === "downward") {
      // Loops upwards from last item
      if (itemNumber === itemsList.length-1) return infoNavigation(itemsList, 0);
      return infoNavigation(itemsList, itemNumber+1);
    }
    if (global.infoNavDirection === "upwardPU") {
      // Loops downwards from 1st item
      if (itemsList.length <= 3) {
        if (itemNumber === 0) return infoNavigation(itemsList, itemsList.length-1);
        return infoNavigation(itemsList, itemNumber-1);
      }
      if ((itemNumber-3) < 0) {
        return infoNavigation(
          itemsList,
          (itemsList.length-1)-((itemNumber-3)*-1)
        );
      }
      return infoNavigation(itemsList, itemNumber-3);
    }
    if (global.infoNavDirection === "downwardPD") {
      // Loops upwards from last item
      if (itemsList.length <= 3) {
        if (itemNumber === itemsList.length-1) return infoNavigation(itemsList, 0);
        return infoNavigation(itemsList, itemNumber+1);
      }
      if ((itemNumber+3) > itemsList.length-1) {
        return infoNavigation(
          itemsList,
          0+((itemNumber+3)-(itemsList.length-1))
        );
      }
      return infoNavigation(itemsList, itemNumber+3);
    }
  }
  
  const archiveInfoString = await getStringList(archiveFile.selected, [...list.selected]);
  const archiveItemsInfo = archiveInfoString
    // Removes the start that talks about 7z and the archive's infos
    .replace(/.*-{10}\n/s, "")
    .slice(0, -1);
  const listOfItemsInfo = archiveItemsInfo.split(/^\n/gm);
  return await infoNavigation(listOfItemsInfo);
}
async function createCommand() {
  addRemove_Keypress("close");
  delete global.command;
  
  let nameOfArchive;
  const messageForArchiveName = "Insert the name of archive:";
  if (!global.skipToCreateArchive) {
    if (asyncImports.input === "") {
      const { default: input } = await import("@inquirer/input");
      asyncImports.input = input;
    }
    nameOfArchive = await promptWithKeyPress("quitPlusEsc", () => {
      return asyncImports.input({
        message: messageForArchiveName,
        validate: (str) => {
          if (extname(str) === "." || extname(str) === "") {
            return "An extension is needed"
          }
          // Creation of archives is limited to only file types below
          if (!supportedArchivesRegex.creation.test(extname(str))) {
            return "Not a valid file type"
          }
          return true;
        },
        theme: {
          style: {
            // Removes the blue answer on the right of the message 
            // for easier cleaning of the line
            answer: (str) => ""
          }
        }
      })
    }, false);
    addRemove_Keypress("close")
    if (global.command === "backToMainMenu") {
      return clearLastLines([0, await getAmountOfLinesToClean(messageForArchiveName)*-1])
    }
  } else nameOfArchive = global.skipToCreateArchive;
  
  if (asyncImports.treeSelection === "") {
    const { default: treeSelection } = await import("./utils/prompts/file-tree-modified.mjs");
    inquirer.registerPrompt("file-tree-selection", treeSelection)
    delete asyncImports.treeSelection
  }
  // Recursive function to prevent an empty selection
  async function getFromFs() {
    const messageOfPicker = "Pick the file/s or folder/s:";
    const fromFs = await promptWithKeyPress("quitPlusEsc", () => {
      return inquirer.prompt({
        type: "file-tree-selection",
        message: messageOfPicker,
        name: "selection",
        pageSize: inquirerPagePromptsSize,
        enableGoUpperDirectory: true,
        multiple: true
      })
    });
    addRemove_Keypress("close")
    if (global.command === "backToMainMenu") {
      return clearLastLines([0, await getAmountOfLinesToClean(messageForArchiveName+"\n"+messageOfPicker)*-1]);
    }
    
    if (fromFs.selection.length === 0) {
      clearLastLines([0, await getAmountOfLinesToClean(messageOfPicker)*-1]);
      if (asyncImports.pause === "") {
        const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
        inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
        delete asyncImports.pause
      }
      const message = yellow+"You have to select something...\n"+normal;
      await promptWithKeyPress("quitPlusEsc", () => {
        return inquirer.prompt({
          name: "key",
          type: "press-to-continue",
          anyKey: true,
          pressToContinueMessage: message
        })
      })
      addRemove_Keypress("close")
      if (global.command === "backToMainMenu") {
        return clearLastLines([0, await getAmountOfLinesToClean(messageForArchiveName+"\n"+message.replace("\n", ""))*-1]);
      }
      clearLastLines([0, await getAmountOfLinesToClean(message.replace("\n", ""))*-1]);
      return getFromFs();
    }
    clearLastLines([0, await getAmountOfLinesToClean(messageOfPicker)*-1]);
    return fromFs;
  }
  const itemsToInsertInArchive = await getFromFs();
  
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  const waitingMessage = new waitingMessagePrompt(gray+`Creating "${nameOfArchive}", might take a while...`+normal+"\n")
  await execute7zCommand(["a", nameOfArchive, ...itemsToInsertInArchive.selection])
  await waitingMessage.close()
  clearLastLines([0, await getAmountOfLinesToClean(waitingMessage.message)*-1]);
  
  if (!skipToNewlyCreatedArchive && backToMenuAfterCreatedArchive) {
    return global.command = "backToMainMenu";
  }
  if (skipToNewlyCreatedArchive && !backToMenuAfterCreatedArchive) {
    return {
      selected: resolve(nameOfArchive)
    }
  }
  if ((skipToNewlyCreatedArchive && backToMenuAfterCreatedArchive) 
     || (!skipToNewlyCreatedArchive && !backToMenuAfterCreatedArchive)) {
    if (asyncImports.confirm === "") {
      const { default: confirm } = await import("@inquirer/confirm");
      asyncImports.confirm = confirm;
    }
    const message = 'Do you want to change archive (y) or go back to menu (n)?';
    const answer = await promptWithKeyPress("quitOnly", () => {
      return asyncImports.confirm({ 
        message: message,
        default: true
      })
    }, false);
    addRemove_Keypress("close")
    clearLastLines([0, await getAmountOfLinesToClean(message)*-1])
    if (answer) {
      return {
        selected: resolve(nameOfArchive)
      }
    } else return global.command = "backToMainMenu";
  }
}
async function openCommand(list, archiveFile) {
  if (archiveFile === undefined) {
    throw new Error("The archive file path is required");
  }
  addRemove_Keypress("close");
  delete global.command;
  
  if (list.selected.length < 1) {
    if (asyncImports.pause === "") {
      const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
      inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
      delete asyncImports.pause
    }
    const message = normalYellow+"Nothing was selected, cannot open anything\n"+normal;
    await inquirer.prompt({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: message
    })
    return clearLastLines([0, (await getAmountOfLinesToClean(message)-1)*-1]);
  }
  // Directory detection
  const regexSlash = new RegExp(`${typeOfSlash}$`, "m");
  for (const selected of list.selected) {
    const isDir = (selected.match(regexSlash)) ? true : false;
    
    if (isDir) {
      if (asyncImports.pause === "") {
        const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
        inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
        delete asyncImports.pause
      }
      const msg = `${normalYellow}"${selected}" is a directory, thus it doesn't make sense to open\n${normal}`;
      await inquirer.prompt({
        name: "key",
        type: "press-to-continue",
        anyKey: true,
        pressToContinueMessage: msg
      })
      return clearLastLines([
        0, 
        (await getAmountOfLinesToClean(msg)-1)*-1
      ]);
    }
  }
  const commandToUse = (() => {
    switch (platform) {
      case "win64":
      case "win32": return 'start';
      
      case "darwin": return "open";
      case "linux": return "xdg-open";
      case "android": return "termux-open";
    }
  })();
  const dedicatedTmpDir = resolve(tmpdir(), "7z-archive-manager");
  const tmpArchiveDirectory = resolve(
    dedicatedTmpDir, 
    parse(archiveFile.selected).name+"_"+extname(archiveFile.selected).slice(1)
  );
  // Creates a directory with the same name of the archive inside the manager's temp directory
  // Only if it doesn't exist already
  if (!existsSync(tmpArchiveDirectory)) {
    mkdirSync(tmpArchiveDirectory, { recursive: true })
  }
  const arrayOfFiles = [];
  for (const selected of list.selected) {
    // Extract only if not done at least once
    if (!existsSync(resolve(tmpArchiveDirectory, selected))) {
      if (asyncImports.pause === "") {
        const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
        inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
        delete asyncImports.pause
      }
      const waitingMessage = new waitingMessagePrompt(gray+"Extracting the selected 📄/📂, might take a while..."+normal+"\n");
      await execute7zCommand([
        "x",
        archiveFile.selected,
        selected,
        "-o"+tmpArchiveDirectory
      ])
      await waitingMessage.close()
      clearLastLines([0, (await getAmountOfLinesToClean(waitingMessage.message)-1)*-1]);
    }
    if (platform === "darwin") arrayOfFiles.push(resolve(tmpArchiveDirectory, selected))
  }
  if (platform === "android"
     || platform === "linux"
     || platform === "win32") {
    const isWin = (platform === "win32") ? true : false;
    return list.selected.forEach((selected) => {
      if (isWin) {
        return spawnSync(
          commandToUse,
          ["", resolve(tmpArchiveDirectory, selected)]
        );
      }
      return spawnSync(
        commandToUse,
        [resolve(tmpArchiveDirectory, selected)]
      );
    });
  }
  // Opens the temp file/s
  return spawnSync(commandToUse, arrayOfFiles);
}
async function helpCommand() {
  addRemove_Keypress("close");
  delete global.command;
  
  const allShortcuts = [
    `  ${bold+underline}d${normal} —→ ${dimGray}delete command${normal}`,
    `  ${bold+underline}c${normal} —→ ${dimGray}move command${normal}`,
    `  ${bold+underline}a${normal} —→ ${dimGray}add command${normal}`,
    `    ${bold+underline}Ctrl + a${normal} —→ ${dimGray}skips to the selector for adding 📂/📄s${normal}`,
    `    ${bold+underline}Meta (alt key) + a${normal} —→ ${dimGray}skips to the file creation${normal}`,
    `    ${bold+underline}Shift + a${normal} —→ ${dimGray}skips to the folder creation${normal}\n`,
    `  ${bold+underline}e${normal} —→ ${dimGray}extract command${normal}`,
    `    ${bold+underline}Ctrl + e${normal} —→ ${dimGray}skips to the "same place of archive" extraction${normal}`,
    `    ${bold+underline}Shift + e${normal} —→ ${dimGray}skips to the "different location" extraction${normal}\n`,
    `  ${bold+underline}r${normal} —→ ${dimGray}rename command${normal}`,
    `  ${bold+underline}Shift + r${normal} —→ ${dimGray}rename archive command${normal}`,
    `  ${bold+underline}n${normal} —→ ${dimGray}change archive command${normal}`,
    `  ${bold+underline}Shift + n${normal} —→ ${dimGray}create an archive command${normal}`,
    `  ${bold+underline}i${normal} —→ ${dimGray}information command${normal}`,
    `    ${bold+underline}Shift + i${normal} —→ ${dimGray}shows only information about the archive${normal}\n`,
    `  ${bold+underline}o${normal} —→ ${dimGray}open command${normal}`,
    `  ${bold+underline}Ctrl + f${normal} —→ ${dimGray}Search command${normal}`,
    `  ${bold+underline}h${normal} —→ ${dimGray}help command, that is this prompt${normal}`,
    "",
    `  ${dimGrayBold}When using the info command:${normal}\n`,
    `    ${bold+underline}Ctrl + arrow up${normal} —→ ${dimGray}Goes to the first item in the list${normal}`,
    `    ${bold+underline}Ctrl + arrow down${normal} —→ ${dimGray}Goes to the last item in the list${normal}`,
    `    ${bold+underline}Page up${normal} —→ ${dimGray}Goes 3 items forwards normally but if the amount of items is less or equal to 3, it's like using w or up arrow${normal}`,
    `    ${bold+underline}Page down${normal} —→ ${dimGray}Goes 3 items backwards normally but if the amount of items is less or equal to 3, it's like using s or down arrow${normal}`
  ]
  const stringToClean =
    `\n${underline}7zTuiManager${normal}\n  ${dimGrayBold}A tui manager for organising archives${normal}\n\n` +
    allShortcuts.join("\n")+"\n";
  
  if (asyncImports.pause === "") {
    const { default: PressToContinuePrompt } = await import("./utils/prompts/press-to-continue-modified.mjs");
    inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
    delete asyncImports.pause
  }
  console.log(stringToClean);
  const message = "Press enter to go back to main menu...\n";
  await inquirer.prompt({
    name: "key",
    type: "press-to-continue",
    pressToContinueMessage: message,
    enter: true
  })
  return clearLastLines([
    0, await getAmountOfLinesToClean(stringToClean+message)*-1
  ]);
}

// Needed because at the end mainMenu() is asynchronous
(global.skipToCreateArchive) ? Function.prototype() : mainMenu()