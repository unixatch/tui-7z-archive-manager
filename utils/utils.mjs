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

import { readFileSync } from "fs"
import { spawn } from "child_process"
import oldTreePrompt from "@willowmt/inquirer-tree-prompt"
import oldInquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"
import oldPressToContinuePrompt from "inquirer-press-to-continue"

function declareColors() {
  // Custom formatting
  global.normal= "\x1b[0m"
  global.bold= "\x1b[1m"
  global.italics= "\x1b[3m"
  global.underline= "\x1b[4m"
  // Actual colors
  global.yellow= "\x1b[33;1m"
  global.normalYellow= "\x1b[33m"
  global.dimYellow = "\x1b[2;33m"
  global.green= "\x1b[32m"
  global.dimGreen= "\x1b[32;2m"
  global.normalRed= "\x1b[31m"
  global.red= "\x1b[31;1m"
  global.dimRed= "\x1b[31;2m"
  global.gray= "\x1b[90;1m"
  global.dimGray= "\x1b[37;2m"
  global.dimGrayBold= "\x1b[37;2;1m"
}
declareColors()
function escapeRegExp(string) {
  // ❗ . * + ? ^ $ { } ( ) | [ ] \ ❗
  // $& —→ the whole string being identified/matched
  return string
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const addRemove_Keypress = (request, prompt, isCustomPrompt = true) => {
  if (typeof request !== "string") throw new TypeError("Only strings are allowed");
  if (!prompt instanceof Promise) throw new TypeError("Only prompts are allowed");
  if (typeof isCustomPrompt !== "boolean") throw new TypeError("Only true or false are permitted")
  
  const completeEvent = (_, key) => {
    switch (key.sequence) {
      // ctrl + q
      case "\x11":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        process.stdin.removeListener("keypress", completeEvent)
        process.exit();
      // file-selection
      // ctrl + a
      case "\x01":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "add_FileSelection";
      // create-file
      // meta/alt + a
      case "\x1Ba":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "add_CreateFile";
      // create-folder
      // shift + a
      case "A":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "add_CreateFolder";
      // Extract in the same place as archive
      // ctrl + e
      case "\x05":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "extract_here";
      // Extract elsewhere
      // shift + e
      case "E":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "extract_elsewhere";
      // Only archive info
      // shift + i
      case "I":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "info_on_archive";
      // Create command
      // shift + n
      case "N":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        return global.command = "createCommand";
      // ———————————————————————————————————————————
      case "d":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "deleteCommand";
        break;
      case "c":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "cutCommand";
        break;
      case "a":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "addCommand";
        break;
      case "r":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "renameCommand";
        break;
      case "e":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "extractCommand";
        break;
      case "n":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "changeCommand";
        break;
      case "i":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "infoCommand";
        break;
      case "h":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "helpCommand";
        break;
    }
  }
  const quitPress = (_, key) => {
    if (key.ctrl && key.name === "q") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      process.stdin.removeListener("keypress", quitPress)
      process.exit();
    }
  }
  const quitPress_plusEsc = (_, key) => {
    if (key.ctrl && key.name === "q") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      if (global.isSelectPrompt) {
        delete global.isSelectPrompt
        return global.command = "selectPromptQuit";
      }
      process.stdin.removeListener("keypress", quitPress_plusEsc)
      process.exit();
    }
    if (key.name === "escape") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      process.stdin.removeListener("keypress", quitPress_plusEsc)
      global.command = "backToMainMenu";
    }
  }
  const infoNavigation = (_, key) => {
    switch (key.name) {
      case "w":
      case "up":
      case "pageup":
        global.infoNavDirection = "upward";
        break;
      case "s":
      case "down":
      case "pagedown":
        global.infoNavDirection = "downward";
        break;
    }
    prompt.ui.activePrompt.close()
    process.stdin.removeListener("keypress", infoNavigation)
  }
  
  switch (request) {
    case "quitOnly":
      process.stdin.on('keypress', quitPress)
      break;
    case "quitPlusEsc":
      process.stdin.on('keypress', quitPress_plusEsc)
      break;
    case "infoNavigation":
      process.stdin.on('keypress', infoNavigation)
      break;
    case "complete":
      process.stdin.on('keypress', completeEvent)
      break;
    case "close":
      process.stdin.removeAllListeners("keypress")
      break;
    
    default:
      throw new Error("Don't know what you're saying")
  }
}
const clearLastLines = lines => {
  if (!Array.isArray(lines)) throw new TypeError("Didn't give an array");
  let lineX, lineY;
  lines
    .forEach((line, i) => {
      if (typeof line === "string") throw new TypeError(`Gave string "${line}", numbers only allowed`)
      const int = parseInt(line);
      if (isNaN(int)) throw new TypeError("Didn't give a number")
      if (i === 0) {
        lineX = line;
      } else lineY = line;
    })
  process.stdout
    .moveCursor(lineX, lineY);
  process.stdout
    .clearScreenDown();
}
async function getAmountOfLinesToClean(string) {
  if (string === undefined) {
    return new Error("A string is required")
  }
  if (typeof string !== "string") {
    return new TypeError("Only a string can be passed")
  }
  
  async function recursiveSearch(lineLength, lineCount, numberForMultiple) {
    // Above limit but below the limit's multiple
    // Finish the search then
    if (lineLength > lineLimit
       && lineLength < lineLimit * numberForMultiple) {
      return lineCount;
    }
    // Above limit AND above the limit's multiple
    // Search more then
    if (lineLength > lineLimit
       && lineLength > lineLimit * numberForMultiple) {
      return recursiveSearch(line, lineCount+1, numberForMultiple+1);
    }
  }
  
  const lineLimit = process.stdout.columns;
  let lineCount = 0;
  const arrayOfLines = (string.includes("\n")) ? string.split("\n") : [string];
  
  for (let line of arrayOfLines) {
    // Removes any kind of escape sequences so that it's clean for the search
    if (line.includes("\x1B")) {
      line = line.replace(/\x1B\[(?:\d;?)*m/g, "");
    }
    if (line.length > lineLimit) {
      if (lineCount === 0) lineCount += 1;
      const remainingLines = await recursiveSearch(line.length, lineCount, 2);
      
      lineCount += remainingLines;
    } else lineCount += 1;
  }
  return lineCount;
}

function getStringList(archiveFilePath, specificItems = [""]) {
  if (archiveFilePath === undefined) {
    return new Error("A file path is required")
  }
  if (!specificItems instanceof Array) {
    return new TypeError("Only arrays can be passed")
  }
  return new Promise((resolve, reject) => {
    let dataStdout, dataStderr;
    const stream = spawn("7z", ["l", "-slt", archiveFilePath, ...specificItems], { windowsHide: true });
    
    // When goes good
    stream.stdout.on("data", data => {
      dataStdout += data.toString();
    })
    stream.on("close", returnCode => {
      return (returnCode > 0)
        // Or bad after it started
        ? reject(new Error(returnCode, dataStderr)) 
        : resolve(dataStdout);
    })
    
    // When goes bad
    stream.stderr.on("data", err => {
      dataStderr += err.toString();
    })
    stream.on("error", err => {
      reject(err)
    })
  })
}
function execute7zCommand(argumentsFor7z) {
  if (argumentsFor7z === undefined) {
    return new Error("Arguments are needed for 7z")
  }
  if (!argumentsFor7z instanceof Array) {
    return new TypeError("An array of arguments are needed")
  }
  return new Promise((resolve, reject) => {
    const process = spawn("7z", argumentsFor7z);
    process.on("close", exitCode => {
      if (exitCode !== 0) {
        reject("7z stopped with error code "+exitCode)
      }
      resolve()
    })
  })
}
function promptWithKeyPress(typeOfKeyEvent, promptFunc, isCustomPrompt = true) {
  if (!promptFunc instanceof Function) throw new TypeError("First argument is not a function");
  if (typeof typeOfKeyEvent !== "string") throw new TypeError("A string can only be used");
  if (typeof isCustomPrompt !== "boolean") throw new TypeError("Only true or false are permitted");
  
  // Detects if it's the select prompt
  if (/return asyncImports\.select\(/m.test(promptFunc.toString())) global.isSelectPrompt = true;
  return new Promise((resolve, reject) => {
    const prompt = promptFunc();
    if (isCustomPrompt) {
      prompt
        .then(a => resolve(a))
        .catch(e => reject(red+e+normal))
      addRemove_Keypress(typeOfKeyEvent, prompt)
    } else {
      prompt
        .then(a => resolve(a))
        .catch(e => {
          if (e.message === "Prompt was canceled") {
            return resolve();
          }
          reject(red+e+normal)
        })
      addRemove_Keypress(typeOfKeyEvent, prompt, false)
    }
  });
}

class TreePrompt extends oldTreePrompt {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);
		this.value = ""
  }
  valueFor(node) {
		return typeof node?.value !== 'undefined' ? node?.value : node?.name;
	}
	render(error) {
	  // Getting rid of the blue answers
	  // for cleaning purposes only if answered
    if (this.status === 'answered') {
      let message = this.getQuestion();
      return this.screen.render(message);
    }
    super.render(error);
  }
  close() {
    this.onSubmit(this);
  }
}
class inquirerFileTreeSelection extends oldInquirerFileTreeSelection {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);
		this.value = ""
  }
  render(error) {
	  // Getting rid of the blue answers
	  // for cleaning purposes only if answered
    if (this.status === 'answered') {
      let message = this.getQuestion();
      return this.screen.render(message);
    }
    super.render(error);
  }
  close() {
    this.onSubmit(this);
  }
}
class PressToContinuePrompt extends oldPressToContinuePrompt {
  constructor(questions, rl, answers) {
    super(questions, rl, answers)
  }
  close() {
    this._done()
  }
}

export { 
  declareColors,
  escapeRegExp,
  addRemove_Keypress,
  clearLastLines,
  getStringList,
  promptWithKeyPress,
  TreePrompt,
  inquirerFileTreeSelection,
  PressToContinuePrompt,
  execute7zCommand,
  getAmountOfLinesToClean
}