// shared Phaser config
import StartScene from "./scenes/StartScene.js";
import GameScene from "./scenes/GameScene.js";
import GameOverScene from "./scenes/GameOverScene.js";

export const phaserConfig = {
  type: Phaser.CANVAS,
  width: 1000,
  height: 700,
  canvas: document.getElementById("gameCanvas"),
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [StartScene, GameScene, GameOverScene],
};
