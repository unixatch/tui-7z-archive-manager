import { fromEvent } from 'rxjs'
import { 
  filter, 
  share, 
  map, 
  takeUntil 
} from 'rxjs/operators/index.js'
import observe from 'inquirer/lib/utils/events.js'
import oldInquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"

const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

class inquirerFileTreeSelection extends oldInquirerFileTreeSelection {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);
		this.value = ""
  }
  _run(cb) {
    return __awaiter(this, void 0, void 0, function* () {
        this.done = cb;
        var events = observe(this.rl);
        var validation = this.handleSubmitEvents(events.line.pipe(map(() => this.active.path)));
        
        validation.success.forEach(this.onSubmit.bind(this));
        validation.error.forEach(this.onError.bind(this));
        
        // Up arrow
        events.normalizedUpKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onUpKey.bind(this));
        // Down arrow
        events.normalizedDownKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onDownKey.bind(this));
        
        // Left arrow
        events.keypress.pipe(filter(({ key }) => key.name === 'left'), share())
            .pipe(takeUntil(validation.success))
            .forEach(this.onLeftKey.bind(this));
        // Right arrow
        events.keypress.pipe(filter(({ key }) => key.name === 'right'), share())
            .pipe(takeUntil(validation.success))
            .forEach(this.onRigthKey.bind(this));
        
        // Any keypresses
        events.keypress.pipe(filter(({ key }) => {
          switch (key.sequence) {
            // Prevents double renders when unneeded
            case "\x1B[D": // Left
            case "\x1B[C": // Right
            case "\x1B[A": // Up
            case "\x1B[B": // Down
            case "\t":     // Tab
            case "\r":     // Enter
            case " ":
              return false;
            
            // HOME
            case "\x1B[H":
              this.keyPressed = "home";
              return true;
            // END
            case "\x1B[F":
              this.keyPressed = "end";
              return true;
              
            // Pageup
            case "\x1B[5~":
              this.keyPressed = "pageUp";
              return true;
            // Pagedown
            case "\x1B[6~":
              this.keyPressed = "pageDown";
              return true;
            
            default:
              return true;
          }
        }), share())
            .pipe(takeUntil(validation.success))
            .forEach(this.onKeypress.bind(this));
        
        events.spaceKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onSpaceKey.bind(this, false));
        function normalizeKeypressEvents(value, key) {
            return { value: value, key: key || {} };
        }
        // Tab
        fromEvent(this.rl.input, 'keypress', normalizeKeypressEvents)
            .pipe(filter(({ key }) => key && key.name === 'tab'), share())
            .pipe(takeUntil(validation.success))
            .forEach(this.onSpaceKey.bind(this, true));
        // Hides cursor
    	  process.stdout.write("\x1b[?25l")
        if (this.firstRender) {
            const rootNode = this.rootNode;
            yield this.prepareChildren(rootNode);
            rootNode.open = true;
            this.active = this.active || rootNode.children[0];
            this.prepareChildren(this.active);
            this.render();
        }
        return this;
    });
  }
  render(error) {
	  // Getting rid of the blue answers
	  // for cleaning purposes only if answered
    if (this.status === 'answered') {
      let message = this.getQuestion();
      return this.screen.render(message);
    }
    super.render(error);
  }
  onKeypress() {
    switch (this.keyPressed) {
	    case "home":
    	  this.active = this.shownList[0];
	      return this.render();
	    case "end":
	      this.active = this.shownList[this.shownList.length-1];
	      return this.render();
	    case "pageUp":
	      return this.moveActive(-3);
	    case "pageDown":
	      return this.moveActive(3);
	  }
  }
  close() {
	  // Only runs when it's called for cancelling the prompt
	  if (this.status !== "answered") this.onSubmit(this);
  }
}

export default inquirerFileTreeSelection;