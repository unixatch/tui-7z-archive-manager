import { readFileSync } from "fs"
import { dirname } from "path"
import { fileURLToPath } from "url"
import inquirer from "inquirer"
import oldTreePrompt from "@willowmt/inquirer-tree-prompt"

const strLimit = 40;
function declareColors() {
  // Custom formatting
  global.normal= "\x1b[0m"
  global.bold= "\x1b[1m"
  global.italics= "\x1b[3m"
  global.underline= "\x1b[4m"
  // Actual colors
  global.yellow= "\x1b[33;1m"
  global.normalYellow= "\x1b[33m"
  global.green= "\x1b[32m"
  global.dimGreen= "\x1b[32;2m"
  global.normalRed= "\x1b[31m"
  global.red= "\x1b[31;1m"
  global.dimRed= "\x1b[31;2m"
  global.dimGray= "\x1b[37;2m"
  global.dimGrayBold= "\x1b[37;2;1m"
}
declareColors()
function escapeRegExp(string) {
  // ❗ . * + ? ^ $ { } ( ) | [ ] \ ❗
  // $& —→ the whole string being identified/matched
  return string
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // https://stackoverflow.com/a/6969486
}
const sleep = time => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), time);
  })
}
const onlyUserArgs = args => {
  // Removes the node's exec path and js file path
  args.shift(); args.shift()
  return args;
}

const addRemove_Keypress = (request, prompt) => {
  if (typeof request !== "string") throw new TypeError("Only strings are allowed");
  if (!prompt instanceof Promise) throw new TypeError("Only prompts are allowed");
  const completeEvent = (_, key) => {
    if (key.ctrl) {
      switch (key.name) {
        case "q":
          process.stdin.removeAllListeners("keypress")
          prompt.ui.close()
          process.exit();
          break;
        case "d":
          prompt.ui.close()
          global.command = "deleteCommand";
          break;
        case "c":
          prompt.ui.close()
          global.command = "cutCommand";
          break;
        case "a":
          prompt.ui.close()
          global.command = "addCommand";
          break;
      }
    }
  }
  const quitPress = (_, key) => {
    if (key.ctrl && key.name === "q") {
      process.stdin.removeAllListeners("keypress")
      prompt.ui.close()
      process.exit();
    }
  }
  
  switch (request) {
    case "quitOnly":
      process.stdin.on('keypress', quitPress)
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

let __filename2 = fileURLToPath(import.meta.url);
const getCurrentFileName = loc => fileURLToPath(loc);
const __dirname = dirname(__filename2);

class TreePrompt extends oldTreePrompt {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);
  }
  valueFor(node) {
		return typeof node?.value !=='undefined' ? node?.value : node?.name;
	}
  close(isCommand = false) {
    this.onSubmit();
  }
}

export { 
  getCurrentFileName,
  __dirname,
  declareColors,
  escapeRegExp,
  sleep,
  onlyUserArgs,
  strLimit,
  addRemove_Keypress,
  clearLastLines,
  TreePrompt
}