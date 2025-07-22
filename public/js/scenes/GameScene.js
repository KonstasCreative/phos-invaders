export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init() {
    this.player = null;
    this.cursors = null;
    this.bullets = null;
    this.alienBullets = null;
    this.alienDirection = 1; // 1 = right, -1 = left
    this.stepSize = 10;
    this.dropAmount = 20;
    this.moveEvent = null;
    this.lastFired = 0;
    this.lastAlienShot = 0;
    this.score = 0;
    this.scoreText = null;
    this.lives = 3;
    this.hearts = [];
    this.gameOver = false;
    this.bonus = null;
    this.nextBonusTime = 0;
    this.wave = 0;
  }

  preload() {
    this.load.image("player", "/assets/player.png");
    this.load.image("bonus", "/assets/boss.png");
    this.load.image("bullet", "/assets/laser.png");
    this.load.image("alien1", "/assets/alien1.png");
    this.load.image("alien2", "/assets/alien2.png");
    this.load.image("alien-bullet", "/assets/alien-bullet.png");
    this.load.image("explosion", "/assets/explosion.png");
    this.load.image("heart", "/assets/heart.png");
  }

  create() {
    const { width, height } = this.sys.game.config;
    // initialize flags
    this.remoteLeft = false;
    this.remoteRight = false;
    this.remoteFire = false;

    // Background color
    this.cameras.main.setBackgroundColor("#0e0e0e");

    // Player
    this.player = this.physics.add
      .image(width / 2, height - 50, "player")
      .setCollideWorldBounds(true)
      .setScale(0.25);

    // Score text
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontFamily: "Orbitron",
      fontSize: "20px",
      fill: "#fff",
    });

    //Hearts display
    for (let i = 0; i < this.lives; i++) {
      this.hearts.push(
        this.add.image(width - 40 - i * 32, 24, "heart").setScale(0.1)
      );
    }

    //Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    //Groups
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 10,
    });
    this.alienBullets = this.physics.add.group({
      defaultKey: "alien-bullet",
      maxSize: 20,
    });
    this.aliens = this.physics.add.group();

    // Destructible pixel barriers spelling "YOLT"
    const barrierWidth = width * 0.9;
    const letters = ["P", "H", "O", "S"];
    const cols = 5,
      rows = 5;
    const letterWidth = barrierWidth / letters.length;
    const blockSize = letterWidth / (cols * 1.8);
    const startX = width / 2 - barrierWidth / 2;
    this.barrierBlocks = this.physics.add.staticGroup();
    // Define pixel patterns: 1 = filled, 0 = empty
    const patterns = {
      P: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0],
      ],
      H: [
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
      ],
      O: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ],
      S: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ],
    };
    // Create blocks
    letters.forEach((char, li) => {
      const pattern = patterns[char];
      const offsetX = startX + li * letterWidth;
      const offsetY = height - 250; // just above player
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (pattern[r][c] === 1) {
            const bx = offsetX + c * blockSize + blockSize / 2;
            const by = offsetY + r * blockSize + blockSize / 2;
            const block = this.add.rectangle(
              bx,
              by,
              blockSize,
              blockSize,
              0x00ff00
            );
            this.physics.add.existing(block, true);
            this.barrierBlocks.add(block);
          }
        }
      }
    });

    // Collide bullets with barriers: each block takes 4 hits
    this.physics.add.collider(this.bullets, this.barrierBlocks, (b, block) => {
      b.disableBody(true, true);
      block.hitPoints = (block.hitPoints || 4) - 1;
      if (block.hitPoints <= 0) {
        block.destroy();
      } else {
        // Visual feedback: fade with alpha
        block.alpha = block.hitPoints / 4;
      }
    });
    this.physics.add.collider(
      this.alienBullets,
      this.barrierBlocks,
      (b, block) => {
        b.disableBody(true, true);
        block.hitPoints = (block.hitPoints || 4) - 1;
        if (block.hitPoints <= 0) {
          block.destroy();
        } else {
          block.alpha = block.hitPoints / 4;
        }
      }
    );

    // Initial alien rows
    this.spawnInitialRows();

    // Zig-zag movement event
    this.moveEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: this.moveAliens,
      callbackScope: this,
    });

    this.bonus = this.physics.add
      .image(-50, 80, "bonus")
      .setScale(0.4, 0.2)
      .setActive(false)
      .setVisible(false);

    this.physics.add.overlap(
      this.bullets,
      this.bonus,
      this.hitBonus,
      null,
      this
    );

    // Colliders
    this.physics.add.overlap(
      this.bullets,
      this.aliens,
      this.hitAlien,
      null,
      this
    );
    this.physics.add.overlap(
      this.alienBullets,
      this.player,
      this.hitPlayer,
      null,
      this
    );

    // Listen for remote-control events
    window.addEventListener("remote-control", (e) => {
      const { type, action } = e.detail;
      switch (action) {
        case "left":
          this.remoteLeft = type === "press";
          break;
        case "right":
          this.remoteRight = type === "press";
          break;
        case "fire":
          this.remoteFire = type === "press";
          break;
      }
    });
  }

  update(time) {
    const { width, height } = this.sys.game.config;

    if (this.gameOver) return;

    // keyboard flags
    const leftKey = this.cursors.left.isDown;
    const rightKey = this.cursors.right.isDown;
    const spaceKey = this.cursors.space.isDown;

    // COMBINED flags
    const leftPressed = leftKey || this.remoteLeft;
    const rightPressed = rightKey || this.remoteRight;
    const firing = spaceKey || this.remoteFire;

    // apply velocity exactly as before
    this.player.setVelocityX(leftPressed ? -300 : rightPressed ? 300 : 0);

    // Firing (respect your rate limit)
    if (firing && time > this.lastFired) {
      const b = this.bullets.get(this.player.x, this.player.y - 20);
      if (b) {
        b.enableBody(true, this.player.x, this.player.y - 20, true, true)
          .setScale(0.1)
          .body.setVelocityY(-400);
        this.lastFired = time + 300;
      }
    }

    if (time > this.nextBonusTime) {
      this.spawnBonus();
      this.nextBonusTime = time + 15000;
    }
    if (this.bonus.active) {
      this.bonus.x += 100 * (1 / 60);
      if (this.bonus.x > width + 50)
        this.bonus.setActive(false).setVisible(false);
    }

    // Alien shooting
    if (time > this.lastAlienShot) {
      const alive = this.aliens.getChildren().filter((a) => a.active);
      if (alive.length) {
        const shooter = Phaser.Utils.Array.GetRandom(alive);
        const ab = this.alienBullets.get(shooter.x, shooter.y + 20);
        if (ab) {
          ab.enableBody(true, shooter.x, shooter.y + 20, true, true)
            .setScale(0.1)
            .body.setVelocityY(200);
          this.lastAlienShot = time + 1000;
        }
      }
    }

    // Cleanup off-screen
    this.alienBullets.children.each((b) => {
      if (b.active && b.y > height) {
        this.alienBullets.killAndHide(b);
        b.body.enable = false;
      }
    });
    this.bullets.children.each((b) => {
      if (b.active && b.y < 0) {
        this.bullets.killAndHide(b);
        b.body.enable = false;
      }
    });
  }

  spawnInitialRows() {
    const { width } = this.sys.game.config;
    const textures = ["alien1", "alien2"];
    const cols = 11;
    const rows = 5;
    const spacingX = 60;
    const spacingY = 40;
    // Calculate horizontal offset to center the formation
    const totalWidth = (cols - 1) * spacingX;
    const startX = (width - totalWidth) / 2;
    // Start one row down to leave top row empty for passing ships
    const startY = 80 + spacingY;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * spacingX;
        const y = startY + r * spacingY;
        const texture = textures[(r + c) % 2];
        this.aliens.create(x, y, texture).setScale(0.22, 0.12);
      }
    }
  }

  handlePlayerFire() {
    const b = this.bullets.get(this.player.x, this.player.y - 20);
    if (b) {
      b.enableBody(true, this.player.x, this.player.y - 20, true, true)
        .setScale(0.1)
        .body.setVelocityY(-400);
      this.lastFired = time + 300;
    }
  }

  moveAliens() {
    const { width } = this.sys.game.config;
    let leftMost = width,
      rightMost = 0;

    // Calculate group bounds
    this.aliens.getChildren().forEach((a) => {
      if (!a.active) return;
      leftMost = Math.min(leftMost, a.x - a.displayWidth / 2);
      rightMost = Math.max(rightMost, a.x + a.displayWidth / 2);
    });

    // Edge detection
    const atRightEdge =
      this.alienDirection > 0 && rightMost + this.stepSize >= width;
    const atLeftEdge = this.alienDirection < 0 && leftMost - this.stepSize <= 0;

    if (atRightEdge || atLeftEdge) {
      // flip direction and descend
      this.alienDirection *= -1;
      this.aliens.getChildren().forEach((a) => {
        if (a.active) a.y += this.dropAmount;
      });
      // Check invasion
      this.aliens.getChildren().forEach((a) => {
        if (a.active && a.y + a.displayHeight / 2 >= this.player.y)
          this.finishGame(false);
      });
    } else {
      // normal horizontal move
      this.aliens.getChildren().forEach((a) => {
        if (a.active) a.x += this.stepSize * this.alienDirection;
      });
    }
  }

  spawnBonus() {
    this.bonus.setPosition(-50, 80).setActive(true).setVisible(true);
  }

  hitBonus(bullet, bonus) {
    bullet.destroy();
    bonus.disableBody(true, true);
    const ex = this.add.image(bonus.x, bonus.y, "explosion").setScale(0.25);
    this.time.delayedCall(100, () => ex.destroy());
    bonus.setActive(false).setVisible(false);
    this.score += 50;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  hitAlien(bullet, alien) {
    bullet.destroy();
    alien.disableBody(true, true);
    const ex = this.add.image(alien.x, alien.y, "explosion").setScale(0.25);
    this.time.delayedCall(100, () => ex.destroy());
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);

    // wave completion
    if (this.aliens.countActive() === 0) {
      this.wave++;
      const newDelay = Math.max(100, 500 - this.wave * 100);
      this.spawnInitialRows();
      this.moveEvent.remove(false);
      this.moveEvent = this.time.addEvent({
        delay: newDelay,
        loop: true,
        callback: this.moveAliens,
        callbackScope: this,
      });
    }
  }

  hitPlayer(playerObj, bullet) {
    bullet.destroy();
    if (this.gameOver) return;
    this.lives--;
    this.hearts[this.lives].destroy();
    this.tweens.add({
      targets: this.player,
      alpha: 0,
      duration: 100,
      repeat: 5,
      yoyo: true,
      onComplete: () => this.player.setAlpha(1),
    });
    if (this.lives <= 0) this.finishGame(false);
  }

  finishGame(win) {
    this.gameOver = true;
    this.physics.pause();
    this.moveEvent.remove(false);
    this.scene.start("GameOverScene", {
      win,
      score: this.score,
      lives: this.lives,
    });
  }
}
