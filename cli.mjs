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

import { lstatSync, readFileSync, writeFileSync } from "fs"
import { join, resolve, extname } from "path"
import { __dirname } from "./utils/cli_utils.mjs"
import JSONConfigPath from "./createConfigJSON.mjs"


const actUpOnPassedArgs = async (args) => {
  let lastParam;
  const newArguments = args.slice(2);
  if (newArguments.length !== 0) {
    for (const arg of newArguments) {
      switch (arg) {
        case /^(?:--path|\/path|-p|\/p)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "pathToArchive"
          break;
        }
        case /^(?:--pagesize|\/pagesize|-ps|\/ps)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "pageSize"
          break;
        }
        case /^(?:--create|\/create|-c|\/c)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "create"
          break;
        }
        case /^(?:--yes|\/yes|-y|\/y)$/.test(arg) && arg: {
          autoConfirmation()
          break;
        }
        case /^(?:--skip|\/skip|-s|\/s)$/.test(arg) && arg: {
          if (global.parameter === undefined) skipToNewlyCreatedArchive()
          break;
        }
        case /^(?:--back|\/b|-b|\/b)$/.test(arg) && arg: {
          if (global.parameter === undefined) backToMenuAfterCreatedArchive()
          break;
        }
        case /^(?:--help|\/help|-h|\/h|\/\?)$/.test(arg) && arg: {
          help()
          process.exit()
        }
        case /^(?:--help-shortcuts|\/help-shortcuts|-hs|\/hs)$/.test(arg) && arg: {
          helpShortcuts()
          process.exit()
        }
        case /^(?:--version|\/version|-v|\/v)$/.test(arg) && arg: {
          version()
          process.exit()
        }
        
        default:
          if (lastParam === "pathToArchive") {
            setArchiveFilePath(arg)
            break;
          }
          if (lastParam === "pageSize") {
            updatePageSize(arg)
            process.exit();
          }
          if (lastParam === "create") {
            skipToCreateArchive(arg)
            break;
          }
          // Invalid param
          console.log(red+`'${
            underline+dimRed +
            arg +
            normal+red
          }' is an invalid parameter`+normal)
          help()
          process.exit()
      }
    }
  }
}
const autoConfirmation = () => global.autoConfirm = true;
const skipToNewlyCreatedArchive = () => {
  global.parameter = "--skip"
  global.skipCreatedArchive = true;
  global.goBackInsteadOfSkippingForCreatedArchive = false;
}
const backToMenuAfterCreatedArchive = () => {
  global.parameter = "--back"
  global.goBackInsteadOfSkippingForCreatedArchive = true;
  global.skipCreatedArchive = false;
}

const updatePageSize = arg => {
  if (!Number.isInteger(parseInt(arg))
      || !/^\d*$/m.test(arg)) {
    console.log(yellow+"A number is needed"+normal);
    process.exit()
  }
  const oldConfigFile = JSON.parse(readFileSync(JSONConfigPath).toString());
  oldConfigFile.inquirerPagePromptsSize = parseInt(arg);
  
  return writeFileSync(
    JSONConfigPath, 
    JSON.stringify(oldConfigFile)
  );
}
const skipToCreateArchive = filename => {
  if (extname(filename) === "." || extname(filename) === "") {
    console.log(red+"An extension is required"+normal);
    process.exit()
  }
  // Creation of archives is limited to only file types below
  if (!/^\.(?:7z|bz2|bzip2|tbz2|tbz|gz|gzip|tgz|tpz|apk|tar|ova|zip|zipx|jar|xpi|odt|ods|docx|xlsx|epub|ipa|appx|liz|tliz|lz4|tlz4|lz5|tlz5|zst|tzstd|wim|swm|esd|ppkg|xz|txz)$/m.test(extname(filename))) {
    console.log(red+"The filename isn't a valid file type"+normal);
    process.exit()
  }
  global.skipToCreateArchive = filename;
}
const setArchiveFilePath = path => {
  try {
    if (!lstatSync(path).isFile()) {
      console.log(yellow+"Not a file"+normal);
      process.exit()
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      console.log(red+"The path given doesn't exist"+normal);
      process.exit()
    }
    throw new Error(e);
  }
  if (!/^\.(?:7z|zip|zipx|jar|xpi|odt|ods|docx|xlsx|epu|ipa|appx|gz|gzip|tgz|tpz|apk|bz2|bzip2|tbz2|tbz|tar|rar|cab|ar|a|dep|lib|arj|z|taz|cpio|rpm|deb|lzh|lha|chm|chi|chq|chw|hxs|hxi|hxr|hxq|hxw|iso|msi|msp|doc|xls|ppt|wim|swm|esd|ppkg|exe|apm|cramfs|dmg|elf|ext|ext2|ext3|ext4|fat|img|flv|gpt|mpr|hfs|hfsx|ihex|lzma|lzma86|macho|mslz|mub|nsis|dll|sys|te|pmd|qcow|qcow2|qcow2c|squashfs|swf|ova|udf|scap|uefif|vdi|vhd|vmdk|xar|pkg|xip|xz|txz|liz|tliz|lz|tlz|lz4|tlz4|lz5|tlz5|zst|tzstd)$/m.test(extname(path))) {
    console.log(normalYellow+"The file given is not a supported archive"+normal);
    process.exit()
  }
  return global.userProvidedArchiveFilePath = resolve(path);
}
const help = () => {
  const helpText = `${underline}7zTuiManager${normal}
  ${dimGrayBold}A tui manager for organising archives${normal}
  
  Available parameters:
    ${green}--path${normal}, ${green}/path${normal}, ${green}-p${normal}, ${green}/p${normal} [an existing path]:
      ${dimGray+italics}Sets the archive file path${normal}
    
    ${green}--pagesize${normal}, ${green}/pagesize${normal}, ${green}-ps${normal}, ${green}/ps${normal} [Integer]:
      ${dimGray+italics}Sets the amount of things that prompts can show at once${normal}
      
    ${green}--create${normal}, ${green}/create${normal}, ${green}-c${normal}, ${green}/c${normal} [a valid filename]:
      ${dimGray+italics}Goes directly to the creation section of the program${normal}
    
    ${green}--yes${normal}, ${green}/yes${normal}, ${green}-y${normal}, ${green}/y${normal}:
      ${dimGray+italics}Auto-confirm deletions${normal}
      
    ${green}--skip${normal}, ${green}/skip${normal}, ${green}-s${normal}, ${green}/s${normal}:
      ${dimGray+italics}Skips to the newly created archive at the main menu${normal}
    
    ${green}--back${normal}, ${green}/back${normal}, ${green}-b${normal}, ${green}/b${normal}:
      ${dimGray+italics}Goes back to the current archive at the main menu${normal}
    
    ${green}--help${normal}, ${green}/help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
    
    ${green}--help-shortcuts${normal}, ${green}/help-shortcuts${normal}, ${green}-hs${normal}, ${green}/hs${normal}:
      ${dimGray+italics}Shows the available shortcuts${normal}
    
    ${green}--version${normal}, ${green}/version${normal}, ${green}-v${normal}, ${green}/v${normal}:
      ${dimGray+italics}Shows the installed version${normal}
  `
  console.log(helpText)
}
const helpShortcuts = () => {
  const helpText = `${underline}7zTuiManager${normal}
  ${dimGrayBold}A tui manager for organising archives${normal}
  
  Available shortcuts:
    ${bold+underline}d${normal} —→ ${dimGray}delete command${normal}
    ${bold+underline}c${normal} —→ ${dimGray}move command${normal}
    ${bold+underline}a${normal} —→ ${dimGray}add command${normal}
      ${bold+underline}Ctrl + a${normal} —→ ${dimGray}skips to the selector for adding 📂/📄s${normal}
      ${bold+underline}Meta (alt key) + a${normal} —→ ${dimGray}skips to the file creation${normal}
      ${bold+underline}Shift + a${normal} —→ ${dimGray}skips to the folder creation\n${normal}
    ${bold+underline}e${normal} —→ ${dimGray}extract command${normal}
      ${bold+underline}Ctrl + e${normal} —→ ${dimGray}skips to the "same place of archive" extraction${normal}
      ${bold+underline}Shift + e${normal} —→ ${dimGray}skips to the "different location" extraction\n${normal}
    ${bold+underline}r${normal} —→ ${dimGray}rename command${normal}
    ${bold+underline}n${normal} —→ ${dimGray}change archive command${normal}
    ${bold+underline}Shift + n${normal} —→ ${dimGray}create an archive command${normal}
    ${bold+underline}i${normal} —→ ${dimGray}information command${normal}
      ${bold+underline}Shift + i${normal} —→ ${dimGray}shows only information about the archive\n${normal}
    ${bold+underline}o${normal} —→ ${dimGray}open command${normal}
    ${bold+underline}h${normal} —→ ${dimGray}help command, that is this prompt${normal}\n
  When using the info command:
    ${bold+underline}Ctrl + arrow up${normal} —→ ${dimGray}Goes to the first item in the list${normal}
    ${bold+underline}Ctrl + arrow down${normal} —→ ${dimGray}Goes to the last item in the list${normal}
    ${bold+underline}Page up${normal} —→ ${dimGray}Goes 3 items forwards normally but if the amount of items is less or equal to 3, it's like using w or up arrow${normal}
    ${bold+underline}Page down${normal} —→ ${dimGray}Goes 3 items backwards normally but if the amount of items is less or equal to 3, it's like using s or down arrow${normal}
  `
  console.log(helpText)
}
const version = () => {
  const packageJSONPath = join(__dirname, "package.json");
  const { version } = JSON.parse(readFileSync(packageJSONPath).toString());
  
  console.log(`${green + version + normal}`)
}

export {
  actUpOnPassedArgs
}