import { gameEndDiv, gameWinLoseSpan, gameEndScore, canvas } from "../main.js";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    const { win, score, lives } = data;
    const bonus = lives * 50;
    this.finalScore = score + bonus;
    this.win = win;
  }

  create() {
    this.scene.stop("GameScene");
    gameWinLoseSpan.textContent = this.win ? "Win!" : "Lose!";
    gameEndScore.textContent = this.finalScore;
    gameEndDiv.style.display = "flex";
    canvas.style.display = "none";
  }
}
