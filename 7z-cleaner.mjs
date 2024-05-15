#!/usr/bin/env node
import { tmpdir } from "os"
import { 
  lstatSync,
  readdirSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  renameSync,
  rmSync
} from "fs"
import { 
  sep,
  parse,
  basename,
  extname,
  dirname,
  resolve
} from "path"
import { platform } from "process"
import { execSync } from "child_process"

import {
  escapeRegExp,
  declareColors,
  clearLastLines,
  addRemove_Keypress,
  TreePrompt
} from "./utils.mjs"

import inquirer from "inquirer"
import PressToContinuePrompt from 'inquirer-press-to-continue';
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"
inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection)
inquirer.registerPrompt("tree", TreePrompt)
inquirer.registerPrompt('press-to-continue', PressToContinuePrompt);
const asyncImports = {
  select: "",
  input: "",
  confirm: "",
  editor: ""
}


const validateSelection = selected => {
  if (!lstatSync(selected).isFile()) {
    return "This isn't even a file";
  } 
  if (!/^\.(?:7z|zip|gz|gzip|tgz|bz2|bzip2|tbz2|tbz|tar)$/m.test(extname(selected))) {
    return "It's not a supported archive";
  }
  return true;
}
let archiveFile = await inquirer.prompt({
  type: "file-tree-selection",
  message: "Choose an archive:",
  name: "selected",
  pageSize: 20,
  enableGoUpperDirectory: true,
  validate: validateSelection
})

let listOfArchive;
if (platform === "android" || platform === "darwin" || platform === "linux") {
  listOfArchive = execSync(`
    7z l -slt "${archiveFile.selected}" |
    tail -n +18 |
    grep -Eo "Path.*|Attributes.*"
    `).toString();
} else if (platform === "win32") {
  listOfArchive = execSync(`
    7z l -slt "${archiveFile.selected}" |
    tail -n +18 |
    grep -Eo "Path.*|Attributes.*"
    `, {
      windowsHide: true
    }).toString();
} else {
  listOfArchive = execSync(`
    7z l -slt "${archiveFile.selected}" |
    tail -n +18 |
    grep -Eo "Path.*|Attributes.*"
    `).toString();
}

const regexes = [
  /Path = (.*)\nAttributes = D_/g,
  /Path = (.*)\nAttributes = A_/g
]
const mappedFSStructure = new Map();
const onlyDirectories = Array.from(
  listOfArchive.matchAll(regexes[0]),
  (matchArray) => matchArray[1]
);
const onlyFiles = Array.from(
  listOfArchive.matchAll(regexes[1]),
  (matchArray) => matchArray[1]
);


function recursivelyMappingSubdirectories(arrayOfFolderPaths, wantToSearchInFiles = false) {
  if (typeof arrayOfFolderPaths === "undefined" || !(arrayOfFolderPaths instanceof Array)) return;
  if (arrayOfFolderPaths.length === 0) return;


  const ogArrayList = (wantToSearchInFiles) ? onlyFiles : onlyDirectories;
  let subDirectories = [];

  arrayOfFolderPaths.forEach((path) => {
    const name = path.replace(/^.*\//, "");
    // This regex checks for subdirectories
    const pattern = (wantToSearchInFiles) ? new RegExp(`^(${escapeRegExp(path)}\\/[^\\/]*)\\/[^\\/]*$`, "m") : new RegExp(`^${escapeRegExp(path)}\\/[^\\/]*$`, "m");

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
        && path.match(/^[^\/]*$/m) !== null) {
      const surface = mappedFSStructure.get("surface");
      const newSurface = [...surface, path];
      mappedFSStructure.set("surface", newSurface);
    }
    if (subDirectoriesIn.length === 0) {
      mappedFSStructure.set(name, {
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
    mappedFSStructure.set(name, {
      name: name,
      path: path,
      children: subDirectoriesIn
    })
  })
  return recursivelyMappingSubdirectories(subDirectories, wantToSearchInFiles);
}
function mappingFiles() {
  onlyFiles.forEach((path) => {
    const subFileName = path.replace(/^.*\//, "");
    const pattern = new RegExp(
      `([^\\/]*)\\/${escapeRegExp(subFileName)}$`, "m"
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
        const surfaceFolderName = /([^\/]*)(?:\/[^\/]*)*$/m;
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

const pattern = /^[^\/]*$/m;
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

let surfaceCount = 0;
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
		  const contents = mappedFSStructure.get(item.replace(/^.*\//m, ""));
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
				children: createDirectoryLister(contents.name)
			}
		})
	}
}

const thingsToClean = inquirer.prompt({
  type: "tree",
  message: "Archive: "+archiveFile.selected,
  name: "selected",
  multiple: true,
  pageSize: 20,
  tree: createDirectoryLister("surface")
})
addRemove_Keypress("complete", thingsToClean);


thingsToClean.then(async (list) => {
  // Shortcuts
  switch (global.command) {
    case "deleteCommand": {
      addRemove_Keypress("close");
      delete global.command;
      if (list.selected.length < 1) {
        console.log(normalYellow+"Empty list was selected, exiting..."+normal)
        return;
      }
      if (asyncImports.confirm === "") {
        const { default: confirm } = await import("@inquirer/confirm");
        asyncImports.confirm = confirm;
      }
      console.log("\n", list.selected);
      const answer = await asyncImports.confirm({ 
        message: 'Confirm deletion of selected 📄/📂?',
        default: false
      });
      if (!answer) return;
      
      return execSync(`
        7z d "${archiveFile.selected}" ${
          list.selected
            .map(str => `"${str}"`) // Because of spaces
            .join(" ") // Because of defaults
        }
      `);
    }
    case "cutCommand": {
      addRemove_Keypress("close");
      delete global.command
      surfaceCount = 0;
      const surface = mappedFSStructure.get("surface");
      const temporaryNewSurface = [".", ...surface];
      mappedFSStructure.set("surface", temporaryNewSurface)
      
      const newLocation = await inquirer.prompt({
        type: "tree",
        message: `Select the new location to move to:\n${gray}(selecting . = top-level of the archive)`,
        name: "selected",
        pageSize: 20,
        multiple: false,
        tree: createDirectoryLister("surface"),
        validate: (str) => {
          if (str.endsWith(sep) || str === ".") return true;
          return "Only directories are allowed"
        },
        onlyShowValid: true
      })
      // Cleans the gray text and message duplicate
      clearLastLines([0, -3])
      mappedFSStructure.set("surface", surface)
      // Moving part
      list.selected.forEach((path) => {
        if (newLocation.selected === ".") {
          return execSync(`
            7z rn "${archiveFile.selected}" "${path}" "${basename(path)}"
          `)
        }
        execSync(`
          7z rn "${archiveFile.selected}" ${path} ${newLocation.selected+basename(path)}
        `)
      })
      return
    }
    case "addCommand": {
      delete global.command
      if (asyncImports.select === "") {
        const { default: select } = await import("@inquirer/select");
        asyncImports.select = select;
      }
      const action = await asyncImports.select({
        message: "Choose how do you want to add:",
        choices: [
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
      })
      if (action === "file-selection") {
        // Recursive function to prevent an empty selection
        async function getFromFs() {
          let fromFs = await inquirer.prompt({
            type: "file-tree-selection",
            message: "Pick the file or folder:",
            name: "selection",
            pageSize: 20,
            enableGoUpperDirectory: true,
            multiple: true
          })
          if (fromFs.selection.length === 0) {
            // Removes empty array line
            clearLastLines([0, -1]);
            await inquirer.prompt({
              name: "key",
              type: "press-to-continue",
              anyKey: true,
              pressToContinueMessage: yellow+"You have to select something..."+normal
            })
            clearLastLines([0, -1]);
            return getFromFs();
          }
          return fromFs;
        }
        let fromFs = await getFromFs();
        return execSync(`
          7z a "${archiveFile.selected}" ${
            fromFs.selection
              .map(str => `"${str}"`) // Because of spaces
              .join(" ") // Because of defaults
          }
        `);
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
        const filename = await asyncImports.input({
          message: "Insert the filename that you want to create: ",
          validate: (str) => {
            if (/^\s*$/m.test(str)) return "Write down something at least"
            if (dirname(str) === "/") return "Cannot use a single / as directory name"

            if (extname(str) && extname(str) !== ".") return true;
            return "Input given is not valid"
          }
        })
        const fileContent = await asyncImports.editor({
          message: "Creating a new file",
          postfix: `${extname(filename)}`,
          waitForUseInput: false
        })
        
        // Creation part
        const dedicatedTmpDir = resolve(tmpdir(), "7z-cleaner");
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
          if (!existsSync(dedicatedTmpDir)) {
            dedicatedTmpDir = mkdirSync(dedicatedTmpDir);
          }
          writeFileSync(
            resolve(dedicatedTmpDir, filename),
            fileContent
          )
        }
        execSync(`
          7z a "${archiveFile.selected}" ${dedicatedTmpDir}/*
        `)
        
        const filenamePathToRemove = (dirname(filename) !== ".") ? filename.match(/^[^\\/]*/m)[0] : filename;
        return rmSync(
          resolve(dedicatedTmpDir, filenamePathToRemove),
          { recursive: true }
        );
      }
      if (action === "create-folder") {
        if (asyncImports.input === "") {
          const { default: input } = await import("@inquirer/input");
          asyncImports.input = input;
        }
        const answer = await asyncImports.input({ 
          message: "Name of the 📂/: ",
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
          }
        });
        
        const dedicatedTmpDir = resolve(tmpdir(), "7z-cleaner");
        mkdirSync(
          resolve(dedicatedTmpDir, answer), 
          { recursive: true }
        )
        execSync(`
          7z a "${archiveFile.selected}" ${dedicatedTmpDir}/*
        `)
        // Deletes only the user-requested directories,
        // not "dedicatedTmpDir"
        return rmSync(
          resolve(dedicatedTmpDir, answer.match(/^[^\\/]*/m)[0]),
          { recursive: true }
        );
      }
    }
    case "extractCommand": {
      if (asyncImports.confirm === "") {
        const { default: confirm } = await import("@inquirer/confirm");
        asyncImports.confirm = confirm;
      }
      const answer = await asyncImports.confirm({ 
        message: 'Extract alongside the archive (y) or elsewhere (n)?',
        default: true
      });
      
      const specificThings = (list.selected.length > 0) ? list.selected.map(str => `"${str}"`).join(" ") : "";
      if (answer) {
        execSync(`7z x "${archiveFile.selected}" ${specificThings} -o${
          resolve(
            dirname(archiveFile.selected), 
            "extracted_"+parse(archiveFile.selected).name+"_"+Math.floor(Math.random() * 1000000)
          )
        }`)
      } else {
        const extractLocation = await inquirer.prompt({
          type: "file-tree-selection",
          message: "Pick the extraction destination:",
          name: "selected",
          pageSize: 20,
          enableGoUpperDirectory: true,
          onlyShowDir: true
        })
        execSync(`
          7z x "${archiveFile.selected}" ${specificThings} -o"${
            resolve(
              extractLocation.selected, 
              "extracted_"+parse(archiveFile.selected).name+"_"+Math.floor(Math.random() * 1000000)
            )
          }"
        `)
      }
      return;
    }
    
    default:
      addRemove_Keypress("close");
      // Because prompt line gets repeated once
      clearLastLines([0, -1]);
      if (asyncImports.select === "") {
        const { default: select } = await import("@inquirer/select");
        asyncImports.select = select;
      }
      
      const command = await asyncImports.select({
        message: "Choose what to do:",
        choices: [
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
            name: "Delete command",
            value: "delete-command",
            description: "Delete the selected 📄/📂 from the archive"
          },
          {
            name: "Extract command",
            value: "extract-command",
            description: "Extract the selected 📄/📂 from the archive"
          }
        ]
      })
      switch (command) {
        case 'add-command':
          console.log("Funzione add-command");
          break;
        case 'cut-command':
          console.log("Funzione cut-command");
          break;
        case 'delete-command':
          console.log("Funzione delete-command");
          break;
        case 'extract-command':
          console.log("Funzione extract-command");
          break;
      }
  }
})