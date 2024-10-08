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

import { platform, env, argv } from "process"
import { join, basename } from "path"

let configFolder, pathOfCompletion;
switch (platform) {
  case "win32":
    configFolder = env.APPDATA;
    break;
  case "darwin": // MacOS
    configFolder = env.HOME + "/Library/Preferences";
    pathOfCompletion = {
      bash: null,
      zsh: "/usr/local/share/zsh/site-functions"
    };
    break;
  case "android":
    configFolder = env.HOME + "/.local/share";
    pathOfCompletion = {
      bash: env.PREFIX + "/etc/bash_completion.d",
      zsh: env.PREFIX + "/usr/share/zsh/site-functions"
    };
    break;
  
  default:
    configFolder = env.HOME + "/.local/share";
    pathOfCompletion = {
      bash: "/etc/bash_completion.d",
      zsh: "/usr/local/share/zsh/site-functions"
    };
}

const configFileFolder = join(configFolder, "tui-7z-archive-manager");
const completePath = join(configFileFolder, "config.json");


// If it's trying to import,
// do not run whatever it's inside this code block
if (basename(argv[1]).includes("postinstall.mjs")) {
  const {
    existsSync,
    mkdirSync,
    copyFileSync,
    readFileSync,
    writeFileSync
  } = await import("fs");
  
  // Bash completion for UNIX
  if (platform !== "win32") {
    pathOfCompletion = (env.SHELL.includes("bash") && platform !== "darwin") ? pathOfCompletion.bash : pathOfCompletion.zsh;
    const fileCompleter = (env.SHELL.includes("bash") && platform !== "darwin") ? "tui7zArchiveM" : "_tui7zArchiveM";
    const fileCompleterPath = join(pathOfCompletion, fileCompleter);
    // First time creating it
    if (!existsSync(fileCompleterPath)) {
      const { default: confirm } = await import("@inquirer/confirm");
      const answer = await confirm({
        message: "Do you want to install auto-completion?",
        default: true
      });
      if (answer) {
        if (platform === "android") {
          // Just in case there's none
          if (!existsSync(pathOfCompletion)) mkdirSync(pathOfCompletion)
          copyFileSync(`auto-completers/${fileCompleter}`, fileCompleterPath)
        } else {
          const { execSync } = await import("child_process");
          // Just in case there's none
          if (!existsSync(pathOfCompletion)) execSync(`sudo mkdir ${pathOfCompletion}`)
          execSync(`sudo cp auto-completers/${fileCompleter} ${fileCompleterPath}`)
        }
        console.log("\x1b[32mAdded the auto-completer successfully\x1b[0m")
      }
    // Checks the buffer if the files is different and needs an update
    } else if (!readFileSync(fileCompleterPath).equals(readFileSync(`auto-completers/${fileCompleter}`))) {
      const { default: confirm } = await import("@inquirer/confirm");
      const answer = await confirm({
        message: "Do you want to update auto-completion?",
        default: true
      });
      if (answer) {
        if (platform === "android") {
          copyFileSync(`auto-completers/${fileCompleter}`, fileCompleterPath)
        } else {
          const { execSync } = await import("child_process");
          execSync(`sudo cp auto-completers/${fileCompleter} ${fileCompleterPath}`)
        }
        console.log("\x1b[32mUpdated the auto-completer successfully\x1b[0m")
      }
    }
  }


  // In case there's no config folder
  if (!existsSync(configFileFolder)) mkdirSync(configFileFolder);

  // In case there's no matching file inside the location
  if (!existsSync(completePath)) {
    copyFileSync("config_default.json", completePath);
    console.log("Added the default config file")
  } else {
    const oldUserConfig = JSON.parse(readFileSync(completePath).toString());
    const defaultConfigFile = JSON.parse(readFileSync("config_default.json").toString());
    
    let newOptions = false;
    for (const key of Object.keys(defaultConfigFile)) {
      const valueOfKey = defaultConfigFile[key];
      if (!oldUserConfig.hasOwnProperty(key)) {
        newOptions = true;
        oldUserConfig[key] = valueOfKey;
      }
    }
    if (newOptions) {
      const { default: confirm } = await import("@inquirer/confirm");
      const answer = await confirm({
        message: "Do you want to update the config file?",
        default: true
      });
      if (answer) {
        const stringified = JSON.stringify(oldUserConfig);
        writeFileSync(completePath, stringified);
        console.log("\x1b[32mUpdated the config file successfully\x1b[0m")
      }
    }
  }
}


export default completePath
