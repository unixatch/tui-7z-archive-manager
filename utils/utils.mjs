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
import { platform } from "process"
import { spawn } from "child_process"
import oldTreePrompt from "@willowmt/inquirer-tree-prompt"
import chalk from 'chalk'
import figures from 'figures'
import { fromEvent } from 'rxjs'
import { 
  filter, 
  share, 
  map, 
  takeUntil 
} from 'rxjs/operators/index.js'
import observe from 'inquirer/lib/utils/events.js'


import oldInquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"
import oldPressToContinuePrompt from "inquirer-press-to-continue"

const typeOfSlash = (platform === "win32") ? "\\" : "/";
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
      // Search command
      // ctrl + f
      case "\x06":
        process.stdin.removeListener("keypress", completeEvent)
        global.searchMode = true;
        process.stdin.on('keypress', searchMode)
        prompt.ui.activePrompt.render()
        break;
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
      case "o":
        (isCustomPrompt) 
          ? prompt.ui.close()
          : prompt.cancel()
        global.command = "openCommand";
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
    switch (key.sequence) {
      // Pageup
      case "\x1B[5~":
        global.infoNavDirection = "upwardPU";
        break;
      // Pagedown
      case "\x1B[6~":
        global.infoNavDirection = "downwardPD";
        break;
      // Ctrl + arrow up
      case "\x1B[1;5A":
        global.infoNavDirection = "firstInList";
        break;
      // Ctrl + arrow down
      case "\x1B[1;5B":
        global.infoNavDirection = "lastInList";
        break;
      // ———————————————————————————————————————————
      case "w":
      // Arrow up
      case "\x1B[A":
        global.infoNavDirection = "upward";
        break;
      case "s":
      // Arrow down
      case "\x1B[B":
        global.infoNavDirection = "downward";
        break;
    }
    prompt.ui.activePrompt.close()
    process.stdin.removeListener("keypress", infoNavigation)
  }
  const searchMode = (_, key) => {
    if (key.ctrl && key.name === "q") {
      prompt.ui.close()
      process.stdin.removeListener('keypress', searchMode)
      process.exit()
    }
    if (key.name === "escape") {
      process.stdin.removeListener('keypress', searchMode)
      global.searchMode = false;
      prompt.ui.activePrompt.render()
      process.stdin.on('keypress', completeEvent)
    }
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
  
  async function recursiveSearch(lineLength, lineCount = 1, numberForMultiple = 2) {
    if (!Number.isInteger(lineLength)) {
      throw new TypeError("The line length must be an integer")
    }
    // Above limit but below the limit's multiple
    // Finish the search then
    if (lineLength < (lineLimit * numberForMultiple)) {
      return lineCount+1;
    }
    // Above limit AND above the limit's multiple
    // Search more then
    if (lineLength > (lineLimit * numberForMultiple)) {
      return recursiveSearch(lineLength, lineCount+1, numberForMultiple+1);
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
      const remainingLines = await recursiveSearch(line.length);
      
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
		this.value = "";
  }
  valueFor(node) {
		return typeof node?.value !== 'undefined' ? node?.value : node?.name;
	}
  _installKeyHandlers() {
		const events = observe(this.rl);

		const validation = this.handleSubmitEvents(
				events.line.pipe(map(() => this.valueFor(
				this.opt.multiple ? this.selectedList[0] : this.active))));
		validation.success.forEach(this.onSubmit.bind(this))
		validation.error.forEach(this.onError.bind(this))

    // Up arrow
		events.normalizedUpKey
		.pipe(takeUntil(validation.success))
		.forEach(this.onUpKey.bind(this))

    // Down arrow
		events.normalizedDownKey
		.pipe(takeUntil(validation.success))
		.forEach(this.onDownKey.bind(this))

    // Right arrow
		events.keypress.pipe(
			filter(({ key }) => key.name === 'right'),
			share()
		)
		.pipe(takeUntil(validation.success))
		.forEach(this.onRightKey.bind(this))

    // Left arrow
		events.keypress.pipe(
			filter(({ key }) => key.name === 'left'),
			share()
		)
		.pipe(takeUntil(validation.success))
		.forEach(this.onLeftKey.bind(this))
		
    // Any key presses
    events.keypress
    .pipe(
      filter(({ key }) => {
        return key.name !== 'left' && key.name !== 'right'
      }),
			share()
    )
    .pipe(takeUntil(validation.success))
    .forEach(this.onKeypress.bind(this))

    // Space key
		events.spaceKey
		.pipe(takeUntil(validation.success))
		.forEach(this.onSpaceKey.bind(this))

    // Tab key
		function normalizeKeypressEvents(value, key) {
			return { value: value, key: key || {} };
		}
		fromEvent(this.rl.input, 'keypress', normalizeKeypressEvents)
		.pipe(filter(({ key }) => key && key.name === 'tab'), share())
		.pipe(takeUntil(validation.success))
		.forEach(this.onTabKey.bind(this))
	}

  render(error) {
    // Getting rid of the blue answers
	  // for cleaning purposes only if answered
    if (this.status === 'answered') {
      let message = this.getQuestion();
      return this.screen.render(message);
    }
		let message = (global.searchMode) 
		  ? this.getQuestion()+this.rl.line
		  : this.getQuestion();

		if (this.firstRender) {
			let hint = "Use arrow keys,";
			if (this.opt.multiple) {
				hint += " space to select,";
			}
			hint += " enter to confirm.";
			message += chalk.dim(`(${hint})`);
		}

		if (this.status === 'answered') {
			let answer;
			if (this.opt.multiple) {
				answer = this.selectedList.map((item) => this.shortFor(item, true)).join(', ');
			} else {
				answer = this.shortFor(this.active, true);
			}
			message += chalk.cyan(answer);
		} else {
			this.shownList = [];
			let treeContent = this.createTreeContent();
			if (this.opt.loop !== false) {
				treeContent += '----------------';
			}
			message += '\n' + this.paginator.paginate(treeContent,
					this.shownList.indexOf(this.active), this.opt.pageSize);
		}

		let bottomContent;

		if (error) {
			bottomContent = '\n' + chalk.red('>> ') + error;
		}
		this.firstRender = false;
		this.screen.render(message, bottomContent);
	}
	printTree(node, family, output = "", indent) {
	  if (!(node instanceof Object)) {
	    throw new TypeError("A node must be provided")
	  }
	  if (!(family instanceof Array)) {
	    throw new TypeError("The family list must be an array")
	  }
	  if (!Number.isInteger(indent)) {
	    throw new TypeError("Indent must be an integer")
	  }
	  const isFinal = this.status === 'answered';
	  
	  this.shownList.push(node)
		if (!this.active) {
			this.active = node;
		}
		let prefix = node.children
			? node.open
				? figures.arrowDown + ' '
				: figures.arrowRight + ' '
			: node === this.active
				? figures.pointer + ' '
				: '  '

		if (this.opt.multiple) {
			prefix += this.selectedList.includes(node) ? figures.radioOn : figures.radioOff;
			prefix += ' ';
		}
		const showValue = ' '.repeat(indent) + prefix + this.nameFor(node, isFinal) + '\n';

		if (node === this.active) {
			if (node.isValid === true) {
				output += chalk.cyan(showValue)
			} else {
				output += chalk.red(showValue)
			}
		}
		else {
			output += showValue
		}
		// if (global.searchMode) {
// 		  const indexOfParent = family.indexOf(node.name);
// 		  if (indexOfParent > -1 && node?.children !== null) {
// 		    indent += 2;
// 		  }
// 	  }
		return output;
	}
	createTreeContent(node = this.tree, indent = 2, family = []) {
	  const thisClass = this;
		const children = node.children || [];
		let output = '';

    let searchRegex;
    if (global.searchMode && this.rl.line.length > 0) {
      searchRegex = new RegExp(`${escapeRegExp(this.rl.line)}`, "i");
    }
		children.forEach(async child => {
		  if (global.searchMode && this.rl.line.length > 0) {
		    if (!child.name.match(searchRegex)) {
          if (child?.children !== null && child.open) {
            // Per quando devo mettere l'opzione di recursività ↓
            if (typeof child?.children === "function") {
              await this.prepareChildren(child)
            }
            family.push(child.name+typeOfSlash)
            output += this.createTreeContent(child, indent, family);
          }
          return;
		    } else if (family.indexOf(child?.parent.name+typeOfSlash) >= 0) {
		      if (!new RegExp(`(◯|◉) ${child?.parent.name}`).test(output)) {
	          function searchUp(current, objs, surface = false) {
		          if (Object.keys(current.parent).length < 3) surface = true;
	            const decrescent = (surface) ? objs.reverse() : objs;
	            
  		        for (const folder of decrescent) {
  		          if (surface) {
      		        output += thisClass.printTree(folder, family, "", indent);
      		        indent += 2;
      		        continue;
  		          }
  		          if (Object.hasOwn(current.parent, "name")) {
  	              objs.push(current.parent)
  	              return searchUp(current.parent, objs);
  		          }
  		        }
	          }
	          searchUp(child.parent, [child.parent])
		      }
		      family.push(child.name)
		    }
      }
			output += this.printTree(child, family, "", indent);

			if (child.open && !this.rl.line.length > 0) {
				output += this.createTreeContent(child, indent + 2)
			}
		})
		return output
	}
	onRightKey() {
	  if (this.shownList.length === 0) return;
	  super.onRightKey()
	}
	onLeftKey() {
	  if (this.shownList.length === 0) return;
	  super.onLeftKey()
	}
	onKeypress() {
	  if (global.searchMode) this.render();
	}
	onSpaceKey() {
	  // Doesn't select unshown 📄/📂s
	  if (!this.shownList.includes(this.active)) return;
	  super.onSpaceKey()
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