import oldTreePrompt from "@willowmt/inquirer-tree-prompt"
import chalk from 'chalk'
import figures from 'figures'
import { fromEvent, Subject } from 'rxjs'
import { 
  filter, 
  share, 
  map, 
  takeUntil 
} from 'rxjs/operators/index.js'
import observe from 'inquirer/lib/utils/events.js'

class TreePrompt extends oldTreePrompt {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);
		this.value = "";
		// Necessary
		this.line = "";
		this.searchTerm = "";
		this.treeContentCache = "";
		this.mapOfTree = (this.opt?.mapOfTree) ? this.opt.mapOfTree : false;
		this.memoryShownList = [];
		this.treePromptResult = new Subject();
		
		// Same as Node's REPL
		this.rl.autoComplete = true;
  }
  valueFor(node) {
		return typeof node?.value !== 'undefined' ? node?.value : node?.name;
	}
  _installKeyHandlers() {
		const events = observe(this.rl);

    // It'll end the prompt only when outside searchMode
    events.line
      .pipe(
        map(() => this.valueFor(
			    this.opt.multiple ? this.selectedList[0] : this.active
			  ))
		  )
      .forEach(this.onLine.bind(this))
    // Triggers when searchMode isn't active
		const validation = this.handleSubmitEvents(this.treePromptResult);
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
        // Prevents double renders when unneeded
        switch (key.sequence) {
          case "\x1B[D": // Left
          case "\x1B[C": // Right
          case "\x1B[A": // Up
          case "\x1B[B": // Down
          case "\x1B":   // Escape
          case "\t":     // Tab
          case "\r":     // Enter
          case "\x06":   // Ctrl + f
            return false;
          
          case " ":
            return global.searching;
          default:
            return true;
        }
      }),
			share()
    )
    .pipe(takeUntil(validation.success))
    .forEach(this.onKeypress.bind(this))
    
    // Escape key
    events.keypress
    .pipe(
      filter(({ key }) => key.name === "escape"),
      share()
    )
    .pipe(takeUntil(validation.success))
    .forEach(this.onEscape.bind(this))
    
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

  async render(error) {
    // Getting rid of the blue answers
	  // for cleaning purposes only if answered
    if (this.status === 'answered') {
      let message = this.getQuestion();
      return this.screen.render(message);
    }
		let message = this.getQuestion();

		if (this.firstRender) {
			let hint = "Use arrow keys,";
			if (this.opt.multiple) {
				hint += " space to select,";
			}
			hint += " enter to confirm.";
			message += chalk.dim(`(${hint})`);
		}

		this.shownList = [];
		let treeContent = (global.searching) 
		  ? this.treeContentCache
		  : await this.createTreeContent();
	  if (this.memoryShownList.length === 0 && global.searchMode) {
	    if (this.opt.recursiveSearch) this.fixPositionActive = true;
	    this.memoryShownList = this.shownList;
	  } else if (this.fixPositionActive) delete this.fixPositionActive;
	  
		if (!global.searching) this.treeContentCache = treeContent;
		if (this.opt.loop !== false) {
			treeContent += '----------------';
		}
		if (global.searching || global.searchMode) {
      if (global.firstSearch) {
			  // Shows cursor
        process.stdout.write("\x1b[?25h")
        this.rl.line = this.line;
        this.rl.cursor = this.rl.line.length;
        global.firstSearch = false;
      }
      if (!global.searching && !global.firstSearch) {
        // Hides cursor
        process.stdout.write("\x1b[?25l")
      }
		}
		message += '\n' + this.paginator.paginate(treeContent,
				this.shownList.indexOf(this.active), this.opt.pageSize);
	  if (global.searching || global.searchMode) {
	    message += "\n ⭞ "+chalk.blueBright(this.line)+normal
	  }

		let bottomContent;

		if (error) {
			bottomContent = '\n' + chalk.red('>> ') + error;
		}
		this.firstRender = false;
		this.screen.render(message, bottomContent);
	}
	printTree(node, output = "", indent) {
	  if (!(node instanceof Object)) {
	    throw new TypeError("A node must be provided")
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
		return output;
	}
	async findRecursivelyAMatch(folder, child, regex) {
	  if (!folder instanceof Object) {
      throw new TypeError("folder must be an object")
    }
    if (!regex instanceof RegExp) {
      throw new TypeError("regex must be a regular expression")
    }
    if (typeof folder.children === "function") {
      await this.prepareChildren(folder)
    }
    if (typeof child.children === "function") {
      await this.prepareChildren(child)
    }
    if (folder.children.length === 0) return;
    let hasBeenFound = folder.children
      .find(string => {
        string = (string instanceof Object)
          ? string.value
          : string;
        // Removes the slash at the end
        if (string.includes(sep, string.length-2)) string = string.slice(0, -1);
        return string
          .replaceAll(regex, "")
          .match(this.searchTerm[0])
      });
    if (hasBeenFound instanceof Object) hasBeenFound = hasBeenFound.value;
    if (!hasBeenFound) {
      for (const obj of child.children) {
        if (typeof obj.children === "function") {
          await this.prepareChildren(obj)
        }
        // File
        if (!obj.children) {
          if (obj.name.match(this.searchTerm[0])) return true;
          continue;
        }
        // Folder
        if (obj.open || this.opt.recursiveSearch) {
          const hasBeenFound = await this.findRecursivelyAMatch(obj, obj, regex);
          if (hasBeenFound) return true;
        }
      }
      // If at the very end it finds nothing...
      // OR if there aren't open folders...
      return false;
    }
    return true;
	}
	async createTreeContent(node = this.tree, indent = 2) {
		const children = node.children || [];
		let output = '';

    let memoryIndent;
    for (const child of children) {
		  if (global.searchMode && this.searchTerm[1].length > 0) {
		    if (!child.name.match(this.searchTerm[0])) {
          if (this.memoryShownList.length > 0) {
            const isInShownList = this.memoryShownList.find(obj => obj.value === child.value);
            if (isInShownList) {
              if (isInShownList.open) {
                output += this.printTree(child, "", indent);
                output += await this.createTreeContent(child, indent + 2);
                continue;
              }
              output += this.printTree(child, "", indent);
              continue;
            } else continue;
          }
          if (child.children !== null && (child.open || this.opt.recursiveSearch)) {
            if (typeof child.children === "function") {
              await this.prepareChildren(child)
            }
            
            const slash = (platform === "win32") ? "\\\\" : "\\/";
            const regex = new RegExp(`^(?:[^${slash}]*${slash})*`, "g");
            const folder = this.mapOfTree.get(child.value.slice(0, -1));
            
            if (await this.findRecursivelyAMatch(folder, child, regex)) {
              output += this.printTree(child, "", indent);
              if (child.open) {
                output += await this.createTreeContent(child, indent + 2);
              } else if (this.opt.recursiveSearch) {
                await this.createTreeContent(child, indent + 2);
              }
              continue;
            }
            continue;
          }
          continue;
		    }
      }
			output += this.printTree(child, "", indent);

			if (child.open) {
				output += await this.createTreeContent(child, indent + 2)
			}
    }
		return output
	}
	onUpKey() {
	  if (this.shownList.length === 0 || global.searching) {
	    // For auto-complete
	    this.line = this.rl.line;
	    return this.render();
	  }
	  super.onUpKey()
	}
	onDownKey() {
	  if (this.shownList.length === 0 || global.searching) {
	    // For auto-complete
	    this.line = this.rl.line;
	    return this.render();
	  }
		// Fixes the disappearing selection after pressing enter and down on a filtered list
		if (this.fixPositionActive) {
		  delete this.fixPositionActive;
		  if (this.active.children !== null) {
		    const secondItem = this.mapOfTree.get("surface")[1];
		    this.active = this.shownList.find(obj => obj.value.slice(0, -1) === secondItem);
  		  return this.render();
		  }
		}
	  super.onDownKey()
	}
	onRightKey() {
	  if (global.searching) return this.render();
	  if (this.shownList.length === 0) return;
	  super.onRightKey()
	}
	onLeftKey() {
	  if (global.searching) return this.render();
	  if (this.shownList.length === 0) return;
	  super.onLeftKey()
	}
	onKeypress() {
	  if (global.searching) {
	    this.line = this.rl.line;
	    this.render();
	  }
	}
	onSpaceKey() {
	  if (!global.searchMode) this.rl.line = "";
	  // Doesn't select unshown 📄/📂s
	  if (!this.shownList.includes(this.active) || global.searching) return;
	  super.onSpaceKey()
	}
	onTabKey() {
	  if (this.shownList.length === 0 || global.searching) {
	    // Gets rid of tab since it's not used in names
	    this.rl.line = this.rl.line.slice(0, -1);
	    return;
	  }
	  super.onTabKey()
	}
	onEscape() {
	  // Hides cursor
	  process.stdout.write("\x1b[?25l")
	  this.line = "";
	  this.searchTerm = "";
	  this.memoryShownList = [];
	  global.searchMode = false;
	  global.searching = false;
	  this.render()
	}
	onLine(result) {
	  if (global.searchMode && global.searching) {
	    if (this.line.length < 1) {
  	    // Hides cursor
    	  process.stdout.write("\x1b[?25l")
	      global.searchMode = false;
	      global.searching = false;
	    } else {
	      if (this.searchTerm[1] !== this.line) this.active = this.shownList[0];
	      this.searchTerm = [
	        new RegExp(`${escapeRegExp(this.line)}`, "ig"),
	        this.line
        ];
        if (this.memoryShownList.length > 0) this.memoryShownList = [];
	      global.searching = false;
	    }
	    return this.render();
	  }
	  return this.treePromptResult.next(result)
	}
	toggleOpen() {
		if (!this.active.children) return;

		this.active.open = !this.active.open;

    // It was missing from the original class...
    if (typeof this.active.children === "function") {
      return this.prepareChildrenAndRender(this.active);
    }
		this.render();
	}
	onSubmit(state) {
	  global.searching = false;
	  global.searchMode = false;
	  
	  this.status = 'answered';

		this.render();

		this.screen.done();
		// Shows cursor
    process.stdout.write("\x1b[?25h")
		

		this.done(this.opt.multiple ?
				this.selectedList.map((item) => this.valueFor(item)) : state.value);
	}
  close() {
	  // Only runs when it's called for cancelling the prompt
	  if (this.status !== "answered") this.onSubmit(this);
  }
}

export default TreePrompt;