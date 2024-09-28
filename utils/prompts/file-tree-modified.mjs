import oldInquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"

class inquirerFileTreeSelection extends oldInquirerFileTreeSelection {
  constructor(questions, rl, answers) {
		super(questions, rl, answers);
		this.value = ""
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
  close() {
	  // Only runs when it's called for cancelling the prompt
	  if (this.status !== "answered") this.onSubmit(this);
  }
}

export default inquirerFileTreeSelection;