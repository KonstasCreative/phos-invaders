export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create() {
    // nothing here—DOM handles the menu
    // Immediately go to GameScene if Phaser created
    this.scene.start("GameScene");
  }
}
