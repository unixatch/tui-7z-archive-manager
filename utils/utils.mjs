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
    if (key.ctrl && key.name === "q") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      process.stdin.removeListener("keypress", completeEvent)
      process.exit();
    }
    // file-selection
    if (key.ctrl && key.name === "a") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      return global.command = "add_FileSelection";
    }
    // create-file
    if (key.meta && key.name === "a") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      return global.command = "add_CreateFile";
    }
    // create-folder
    if (key.shift && key.name === "a") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      return global.command = "add_CreateFolder";
    }
    // Extract in the same place as archive
    if (key.ctrl && key.name === "e") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      return global.command = "extract_here";
    }
    // Extract elsewhere
    if (key.shift && key.name === "e") {
      (isCustomPrompt) 
        ? prompt.ui.close()
        : prompt.cancel()
      return global.command = "extract_elsewhere";
    }
    switch (key.name) {
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
  
  switch (request) {
    case "quitOnly":
      process.stdin.on('keypress', quitPress)
      break;
    case "quitPlusEsc":
      process.stdin.on('keypress', quitPress_plusEsc)
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

function getStringList(archiveFilePath) {
  if (archiveFilePath === undefined) {
    return new Error("A file path is required")
  }
  return new Promise((resolve, reject) => {
    let dataStdout, dataStderr;
    const stream = spawn("7z", ["l", "-slt", archiveFilePath], { windowsHide: true });
    
    // When goes good
    stream.stdout.on("data", data => {
      dataStdout += data.toString();
    })
    stream.on("close", returnCode => {
      return (returnCode > 0)
        // Or bad after it started
        ? reject(new Error(dataStderr)) 
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
  PressToContinuePrompt
}