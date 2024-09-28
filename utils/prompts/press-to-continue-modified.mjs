import oldPressToContinuePrompt from "inquirer-press-to-continue"

class PressToContinuePrompt extends oldPressToContinuePrompt {
  constructor(questions, rl, answers) {
    super(questions, rl, answers)
  }
  close() {
    this._done()
  }
}

export default PressToContinuePrompt;