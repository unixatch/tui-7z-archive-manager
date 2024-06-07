import { platform, env } from "process"
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs"
import { join, basename } from "path"

let configFolder;
switch (platform) {
  case "win32":
    configFolder = env.APPDATA;
    break;
  case "darwin": // MacOS
    configFolder = env.HOME + "/Library/Preferences";
    break;
  
  default:
    configFolder = env.HOME + "/.local/share";
}

const configFileFolder = join(configFolder, "tui-7z-archive-manager");
const completePath = join(configFileFolder, "config.json");


// If it's trying to import,
// do not run whatever it's inside the condition
if (basename(process.argv[1]).includes("createConfigJSON.mjs")) {
  // In case there's no config folder
  if (!existsSync(configFileFolder)) mkdirSync(configFileFolder);
  
  // In case there's no matching file inside the location
  if (!existsSync(completePath)) {
    copyFileSync("config_default.json", completePath);
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
      const stringified = JSON.stringify(oldUserConfig);
      writeFileSync(completePath, stringified);
    }
  }
}


export default completePath
