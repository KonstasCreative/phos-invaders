import { phaserConfig } from "./config.js";

const gameStartDiv = document.getElementById("gameStartDiv");
const gameEndDiv = document.getElementById("gameEndDiv");
const gameRestartBtn = document.getElementById("gameRestartBtn");
const gameWinLoseSpan = document.getElementById("gameWinLoseSpan");
const gameEndScore = document.getElementById("gameEndScoreSpan");
const canvas = document.getElementById("gameCanvas");

const sessionId = document.getElementById("qrContainer").dataset.session;
document.getElementById("qrContainer").dataset.session = sessionId;

// 3️⃣ Connect to Socket.IO and join
const socket = io();
socket.emit("join-game", sessionId);

// 4️⃣ When controller arrives, hide start screen and start Phaser
socket.on("controller-connected", () => {
  console.log("controller connected" + sessionId);

  gameStartDiv.style.display = "none";
  if (!window.game) {
    window.game = new Phaser.Game(phaserConfig);
  } else {
    game.scene.start("GameScene");
  }
});

// 5️⃣ Relay remote controls into your GameScene
socket.on("control", (action) => {
  // dispatch a custom event that your GameScene can listen for
  window.dispatchEvent(new CustomEvent("remote-control", { detail: action }));
});

let game = null;

gameRestartBtn.addEventListener("click", () => {
  gameEndDiv.style.display = "none";
  canvas.style.display = "flex";
  game.scene.keys["GameScene"].scene.restart();
});

// Expose DOM elements so scenes can call them
export { gameEndDiv, gameWinLoseSpan, gameEndScore, canvas };
