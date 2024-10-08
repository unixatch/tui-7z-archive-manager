import { execSync } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import input from "@inquirer/input"

// Gets titles and descriptions only, with a separator in the middle
const commitMessages = execSync(`
  git --no-pager log --pretty=format:"%s%n%b%n---" main..
`).toString().split("---");


const changelogFile = readFileSync("CHANGELOG.md").toString();
const oldChangelogNumber = changelogFile.split("\n")[0]
  .replace(/.*(\d\.\d+\.\d+)/, "$1");

let newVersion;
try {
  newVersion = await input({
    message: "Insert the new version number:",
    validate: str => {
      if (oldChangelogNumber === str) return "\x1b[33mCan't use the same number again\x1b[0m";
      if (str.match(/^\d\.\d+\.\d+$/)) return true;
      return "You have to insert a valid version format"
    }
  });
} catch (e) { 
  // Closes if the user cancels or something wrong happens
  process.exit() 
}

// Adds titles and descriptions of the new commits
writeFileSync(
  "CHANGELOG.md",
  "# CHANGELOG v."+newVersion+
  "\n"+
  commitMessages.join("")+
  changelogFile
)
// Updates package.json's version number
const packageFile = JSON.parse(readFileSync("package.json").toString());
packageFile.version = newVersion;
writeFileSync(
  "package.json", 
  JSON.stringify(packageFile, null, 2)
)