#!/usr/bin/env node
import { tmpdir } from "os"
import { 
  lstatSync, 
  existsSync, 
  mkdirSync,
  mkdtempSync,
  rmSync
} from "fs"
import { sep, extname, resolve } from "path"
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
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"
inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection)
inquirer.registerPrompt("tree", TreePrompt)
const asyncImports = {
  select: "",
  input: "",
  confirm: ""
}


const validateSelection = selected => {
  if (!lstatSync(selected).isFile()) {
    return "This isn't even a file";
  } else if (extname(selected) !== ".7z") {
    return "It's not a 7z archive";
  }
  return true;
}
let archiveFile = await inquirer.prompt({
  type: "file-tree-selection",
  message: "Pick the archive destination:",
  name: "selected",
  pageSize: 20,
  enableGoUpperDirectory: true,
  validate: validateSelection
})

let listOfArchive;
if (platform === "android" || platform === "darwin" || platform === "linux") {
  listOfArchive = execSync(`
    7z l -slt ${archiveFile.selected} |
    tail -n +18 |
    grep -Eo "Path.*|Attributes.*"
    `).toString();
} else if (platform === "win32") {
  listOfArchive = execSync(`
    7z l -slt ${archiveFile.selected} |
    tail -n +18 |
    grep -Eo "Path.*|Attributes.*"
    `, {
      windowsHide: true
    }).toString();
} else {
  listOfArchive = execSync(`
    7z l -slt ${archiveFile.selected} |
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
    const pattern = (wantToSearchInFiles) ? new RegExp(`^(${escapeRegExp(path)}\\/[^\\/]*)\\/[^\\/]*$`, "m") : new RegExp(`^${escapeRegExp(path)}\\/[^\\/]*$`, "m");

    let subDirectoriesIn = ogArrayList.filter((path) => {
      if (pattern.test(path)) {
        if (wantToSearchInFiles) {
          path = path.match(pattern)[1];
          if (subDirectories.find(p => p === path)) return false;
        }
        subDirectories.push(path)
        return true;
      }
      return false;
    })

    if (subDirectoriesIn.length === 0) {
      mappedFSStructure.set(name, {
        name: name,
        path: path,
        children: []
      })
      return;
    }

    if (wantToSearchInFiles) {
      if (path.match(/^[^\/]*$/m) !== null) {
        const surface = mappedFSStructure.get("surface");
        const newSurface = [...surface, path];
        mappedFSStructure.set("surface", newSurface);
      }
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
      `([^\\/]*)\\/?${escapeRegExp(subFileName)}$`, "m"
    );
    const isInside = path.match(pattern);

    if (isInside === null || isInside[1] === "") {
      const newSurfaceArray = [...mappedFSStructure.get("surface"), path];
      mappedFSStructure.set("surface", newSurfaceArray)
      return;
    }

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
  const subFileName = path.replace(/^.*\//, "");
  mappedFSStructure.set(subFileName, {
    name: subFileName,
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
			let resolved = item;
			
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
  message: "Which ones to clean?",
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
      if (!answer) {
        // Quando è falso
        return "<loopa lista>";
      }
      process.exit()
      
      const deletion = execSync(`
        7z d ${archiveFile.selected} ${
          list.selected
            .map(str => `"${str}"`) // Because of spaces
            .join(" ") // Because of defaults
        }
      `).toString();
      return "<loopa lista>";
    }
    case "cutCommand": {
      addRemove_Keypress("close");
      console.log("\nMove command", list.selected)
      return;
    }
    case "addCommand": {
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
        let fromFs = await inquirer.prompt({
          type: "file-tree-selection",
          message: "Pick the file or folder:",
          name: "selection",
          pageSize: 20,
          enableGoUpperDirectory: true,
          multiple: true
        })
        execSync(`
          7z a ${archiveFile.selected} ${
            fromFs.selection
              .map(str => `"${str}"`) // Because of spaces
              .join(" ") // Because of defaults
          }
        `)
      }
      if (action === "create-file") {
        
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
        console.log(answer); process.exit()
        let dedicatedTmpDir;
        if (!existsSync(dedicatedTmpDir)) {
          dedicatedTmpDir = mkdtempSync(
            resolve(tmpdir(), "7z-cleaner-")
          );
        }
        mkdirSync(
          resolve(dedicatedTmpDir, answer), 
          { recursive: true }
        )
        execSync(`
          7z a ${archiveFile.selected} ${dedicatedTmpDir}/*
        `)
        rmSync(
          resolve(dedicatedTmpDir, answer.match(/^[^\\/]*/m)[0]),
          { recursive: true }
        );
      }
        /* 
          magari mostrare una scelta tra:
            - https://github.com/SBoudrias/Inquirer.js/tree/main/packages/editor#installation;
            - Select a file from file-tree-selection;
            - Crea una nuova cartella con @nquirer/input;
        */
      return;
    }
    
    default:
      addRemove_Keypress("close");
      // Because prompt line gets repeated once
      clearLastLines([0, -1]);
      // In case the user selected nothing 
      // and pressed enter
      if (list.selected.length < 1) {
        return console.log(normalYellow+"Empty list was selected, exiting..."+normal)
        /*
            Magari invece che di ritornare subito,
            in automatico si presume che si vuole aggiungere❓
        */
      }
      
      if (asyncImports.select === "") {
        const { default: select } = await import("@inquirer/select");
        asyncImports.select = select;
      }
      const command = await asyncImports.select({
        message: "Choose how do you want to add:",
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
      }
  }
})