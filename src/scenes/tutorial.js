import Phaser from "phaser";

export class Tutorial extends Phaser.Scene {
  constructor() {
    super({ key: "Tutorial" });
    this.player = null;
    this.lightCompanion = null;
    this.lightSource = null;
    this.isMultiplayer = false;
    this.speed = 500;
  }

  init(data) {
    this.isMultiplayer = data.multiplayer || false;
  }

  preload() {
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(0, 0, 180, 320);
    graphics.generateTexture("player_block", 180, 320);

    const size = 300;
    const canvas = this.textures.createCanvas("light_ball", size, size);
    const ctx = canvas.context;

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.1, "rgba(0, 255, 255, 0.8)");
    gradient.addColorStop(0.4, "rgba(0, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(0, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  create() {
    const { width, height } = this.scale;

    this.lights.enable();
    this.lights.setAmbientColor(0x0a0a0a);

    const bg = this.add.rectangle(0, 0, width, height, 0x111112).setOrigin(0);
    bg.setPipeline("Light2D");

    this.lightSource = this.lights.addLight(0, 0, 500, 0x00ffff, 2.5);

    this.player = this.physics.add.sprite(
      width / 2,
      height / 2,
      "player_block",
    );
    this.player.setPipeline("Light2D");
    this.player.setDepth(1);
    this.player.setCollideWorldBounds(true);

    this.lightCompanion = this.physics.add.sprite(
      width / 2 + 100,
      height / 2,
      "light_ball",
    );
    this.lightCompanion.setDepth(2);
    this.lightCompanion.body.setAllowGravity(false);
    this.lightCompanion.setCollideWorldBounds(true);
    this.lightCompanion.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: this.lightCompanion,
      alpha: 0.6,
      scale: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.cursors = this.input.keyboard.createCursorKeys();

    const textoModo = this.isMultiplayer
      ? "P1: WASD | P2: SETAS"
      : "USE WASD PARA MOVER";
    this.add
      .text(width / 2, 50, textoModo, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#00ffff",
      })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(3);
  }

  update() {
    if (this.lightCompanion && this.lightSource) {
      this.lightSource.x = this.lightCompanion.x;
      this.lightSource.y = this.lightCompanion.y;
    }

    if (this.keys.A.isDown) {
      this.player.setVelocityX(-this.speed);
    } else if (this.keys.D.isDown) {
      this.player.setVelocityX(this.speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.keys.W.isDown && this.player.body.blocked.down) {
      this.player.setVelocityY(-750);
    }

    if (this.isMultiplayer) {
      const lightSpeed = 400;
      this.lightCompanion.setVelocity(0);

      if (this.cursors.left.isDown)
        this.lightCompanion.setVelocityX(-lightSpeed);
      else if (this.cursors.right.isDown)
        this.lightCompanion.setVelocityX(lightSpeed);

      if (this.cursors.up.isDown) this.lightCompanion.setVelocityY(-lightSpeed);
      else if (this.cursors.down.isDown)
        this.lightCompanion.setVelocityY(lightSpeed);
    } else {
      const targetX =
        this.player.x + (this.player.body.velocity.x >= 0 ? -80 : 80);
      const targetY = this.player.y - 120;

      this.lightCompanion.x = Phaser.Math.Linear(
        this.lightCompanion.x,
        targetX,
        0.1,
      );
      this.lightCompanion.y = Phaser.Math.Linear(
        this.lightCompanion.y,
        targetY,
        0.1,
      );
      this.lightCompanion.setVelocity(0);
    }
  }
}
