import { lstatSync, readFileSync } from "fs"
import { join, resolve, extname } from "path"
import inquirer from "inquirer"
import { 
  __dirname, onlyUserArgs
} from "./utils.mjs"


const actUpOnPassedArgs = async (args) => {
  let lastParam;
  const newArguments = onlyUserArgs(args);
  if (newArguments.length !== 0) {
    for (const arg of newArguments) {
      switch (arg) {
        case /^(--path|-p|\/p)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "pathToArchive"
          break;
        }
        case /^(--yes|-y|\/y)$/.test(arg) && arg: {
          autoConfirmation()
          break;
        }
        case /^(--help|-h|\/h|\/\?)$/.test(arg) && arg: {
          help()
          process.exit()
        }
        case /^(--version|-v|\/v)$/.test(arg) && arg: {
          version()
          process.exit()
        }
        
        default:
          if (lastParam === "pathToArchive") {
            setArchiveFilePath(arg)
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
    ${green}--path${normal}, ${green}-p${normal}, ${green}/p${normal}:
      ${dimGray+italics}Sets the archive file path${normal}
    
    ${green}--yes${normal}, ${green}-y${normal}, ${green}/y${normal}:
      ${dimGray+italics}Auto-confirm deletions${normal}
    
    ${green}--help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
    
    ${green}--version${normal}, ${green}-v${normal}, ${green}/v${normal}:
      ${dimGray+italics}Shows the installed version${normal}
  `
  console.log(helpText)
}
const version = () => {
  const packageJSONPath = join(__dirname, "package.json");
  const { version } = JSON.parse(readFileSync(packageJSONPath).toString());
  
  console.log(`${green + version + normal}`)
}

export default actUpOnPassedArgs