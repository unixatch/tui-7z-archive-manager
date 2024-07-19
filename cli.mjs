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
        case /^(?:--yes|\/yes|-y|\/y)$/.test(arg) && arg: {
          autoConfirmation()
          break;
        }
        case /^(?:--help|\/help|-h|\/h|\/\?)$/.test(arg) && arg: {
          help()
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
  if (!/^\.(?:7z|zip|gz|gzip|tgz|bz2|bzip2|tbz2|tbz|tar|rar|cab|arj|z|taz|cpio|rpm|deb|lzh|lha|chm|chw|hxs|iso|msi|doc|xls|ppt|wim|swm|exe)$/m.test(extname(path))) {
    console.log(normalYellow+"The file given is not a supported archive"+normal);
    process.exit()
  }
  return global.userProvidedArchiveFilePath = resolve(path);
}
const help = () => {
  const helpText = `${underline}7zTuiManager${normal}
  ${dimGrayBold}A tui manager for organising archives${normal}
  
  Available parameters:
    ${green}--path${normal}, ${green}/path${normal}, ${green}-p${normal}, ${green}/p${normal}:
      ${dimGray+italics}Sets the archive file path${normal}
    
    ${green}--pagesize${normal}, ${green}/pagesize${normal}, ${green}-ps${normal}, ${green}/ps${normal}:
      ${dimGray+italics}Sets the amount of things that prompts can show at once${normal}
    
    ${green}--yes${normal}, ${green}/yes${normal}, ${green}-y${normal}, ${green}/y${normal}:
      ${dimGray+italics}Auto-confirm deletions${normal}
    
    ${green}--help${normal}, ${green}/help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
    
    ${green}--version${normal}, ${green}/version${normal}, ${green}-v${normal}, ${green}/v${normal}:
      ${dimGray+italics}Shows the installed version${normal}
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