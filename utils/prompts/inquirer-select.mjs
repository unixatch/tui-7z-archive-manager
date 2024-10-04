import chalk from 'chalk'
import { fromEvent } from 'rxjs'
import { filter, share, flatMap, map, take, takeUntil } from 'rxjs/operators/index.js'
import BasePrompt from 'inquirer/lib/prompts/base.js'
import observe from 'inquirer/lib/utils/events.js'
import Paginator from 'inquirer/lib/utils/paginator.js'

class SelectPrompt extends BasePrompt {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);

		this.done = () => {};
		
		this.firstRender = true;
		this.keyPressed = "";
		this.shownList = [];

		this.paginator = new Paginator(this.screen, { isInfinite: this.opt.loop !== false });
	}
	
	/**
	 * @protected
	 */
	async _run(done) {
		this.done = done;
		this._observeKeyEvents();

    this.render()
		// Hides cursor
    process.stdout.write("\x1b[?25l")
		return this;
	}
	
	_observeKeyEvents() {
		const events = observe(this.rl);

		const validation = this.handleSubmitEvents(events.line);
		validation.success.forEach(this.onSubmit.bind(this));
		validation.error.forEach(this.onError.bind(this));

		events.normalizedUpKey
		.pipe(takeUntil(validation.success))
		.forEach(this.onUpKey.bind(this));

		events.normalizedDownKey
		.pipe(takeUntil(validation.success))
		.forEach(this.onDownKey.bind(this));

		// Any alphanumeric or Pageup/Pagedown
		events.keypress.pipe(filter(({ key }) => {
		  if (key.sequence === "\x1B[5~") {
		    this.keyPressed = "pageUp";
		    return true;
		  }
		  if (key.sequence === "\x1B[6~") {
		    this.keyPressed = "pageDown";
		    return true;
		  }
		  const regex = /^[a-zA-Z0-9]$/;
		  
		  if (key.sequence.match(regex)) {
		    this.keyPressed = key.name;
		    return true;
		  }
		  return false;
	  }), share())
		.pipe(takeUntil(validation.success))
		.forEach(this.onKeypress.bind(this));
		
	  // HOME or END
	  events.keypress.pipe(filter(({ key }) => {
		  if (key.sequence === "\x1B[H" || key.sequence === "\x1B[F") {
	      this.keyPressed = key.sequence;
	      return true;
	    }
	    return false;
	  }), share())
		.pipe(takeUntil(validation.success))
		.forEach(this.onBorders.bind(this));
	}
	
	render(error, keyPressed = false) {
	  let message = this.getQuestion();
	  
	  if (this.firstRender) message += chalk.dim("(Use arrow keys)");
	  
	  if (this.status !== "answered") {
	    this.shownList = [];
	    let list = this.createListing(this.opt.choices, keyPressed);
	    if (this.opt.loop) list += "----------------";
	    
	    message += '\n' + this.paginator.paginate(
	      list,
				this.shownList.indexOf(this.active), 
				this.opt.pageSize
			);
	  }
	  
	  let bottomContent;
	  if (error) {
			bottomContent = '\n' + chalk.red('>> ') + error;
		}
		this.firstRender = false;
		this.screen.render(message, bottomContent);
	}
	
	createListing(node, keyPressed) {
	  let output = '';
		const isFinal = this.status === 'answered';
		let descriptionOfItem;
		
	  node.forEach(item => {
	    this.shownList.push(item)
			if (!this.active) {
				this.active = item;
			}

			let prefix = (item === this.active) ? "❯ " : "  ";
			const showValue = prefix + item.name + '\n';

			if (item === this.active) {
			  if (item.description) descriptionOfItem = item.description;
				output += chalk.cyan(showValue)
			} else output += showValue
	  })
	  if (descriptionOfItem) output += chalk.cyan(descriptionOfItem);
	  return output;
	}
	
	onError(state) {
		this.render(state.isValid);
	}
	
	onSubmit(state) {
		this.status = 'answered';

		this.render();
		this.screen.done();
		// Shows cursor
    process.stdout.write("\x1b[?25h")

		this.done(this.active.value)
	}
	
	onUpKey() {
	  if (this.initialLetters) delete this.initialLetters
		this.moveActive(-1);
	}

	onDownKey() {
	  if (this.initialLetters) delete this.initialLetters
		this.moveActive(1);
	}
	
	moveActive(direction = 0) {
		const currentIndex = this.shownList.indexOf(this.active);
		let index = currentIndex + direction;

		if (index >= this.shownList.length) {
			if (this.opt.loop === false) return;
			index = 0;
		}
		if (index < 0) {
			if (this.opt.loop === false) return;
			index = this.shownList.length - 1;
		}

		this.active = this.shownList[index];
		this.render();
	}
	
	onKeypress() {
	  if (this.keyPressed === "pageUp") return this.moveActive(-3);
	  if (this.keyPressed === "pageDown") return this.moveActive(3);
	  
	  // Select based on letter matching
	  const newActives = this.shownList.filter(obj => obj.name[0].toUpperCase() === this.keyPressed.toUpperCase());
    // In case it's the same group of items that match the letter
	  if (newActives
	      && this.initialLetters
	      && newActives[0]?.name[0].toUpperCase() === this.initialLetters[0]?.name[0].toUpperCase()) {
	    if (this.initialLettersIndex >= this.initialLetters.length-1) {
	      this.initialLettersIndex = 0;
	    } else this.initialLettersIndex = this.initialLettersIndex+1;
	    
	    let index = this.shownList.indexOf(this.initialLetters[this.initialLettersIndex]);
	    this.active = this.shownList[index];
    // A new matching letter
	  } else if (newActives.length !== 0) {
	    this.initialLetters = newActives;
	    this.initialLettersIndex = (this.active.name === newActives[0].name) ? 1 : 0;
	    
      this.active = newActives[this.initialLettersIndex];
    // Or just stay put
	  } else if (this.initialLetters) delete this.initialLetters
	  
	  this.render(null, true)
	}
	
	onBorders() {
	  if (this.initialLetters) delete this.initialLetters
	  // HOME
	  if (this.keyPressed === "\x1B[H") {
	    this.active = this.shownList[0];
	    return this.render();
	  }
	  // END
	  if (this.keyPressed === "\x1B[F") {
	    const index = this.shownList.length-1;
	    this.active = this.shownList[index];
	    return this.render();
	  }
	}
	
	close() {
	  // Only runs when it's called for cancelling the prompt
	  if (this.status !== "answered") this.onSubmit(this)
	}
}

export default SelectPrompt;