import {readdirSync} from "fs"
import {resolve, sep} from "path"

import TreePrompt from "@willowmt/inquirer-tree-prompt"
import inquirer from "inquirer"
inquirer.registerPrompt("tree", TreePrompt)

// ⚠️ USA "new Map()" per sapere come strutturare le cartelle/file (metodo .get()) e
// la funzione qui sotto dovrà essere adattata
// + ci deve essere un uso pesante di regex ⚠️
function createDirectoryLister(dir) {
	return () => {
		return readdirSync(dir, { withFileTypes: true })
		.map((item) => {
			const isDirectory = item.isDirectory();
			const resolved = resolve(dir, item.name)

			return {
				name: item.name,
				value: resolved + (isDirectory ? sep : ''),
				children: isDirectory ? createDirectoryLister(resolved) : null
			};
		});
	};
}

let thing = await inquirer.prompt({
  type: "tree",
  message: "Which ones to clean?",
  name: "selected",
  multiple: true,
  pageSize: 20,
  tree: createDirectoryLister(process.cwd())
})
console.log(thing)