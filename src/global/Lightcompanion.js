import Phaser from "phaser";
import { COMPANION, PALETTE } from "./constants.js";

export class LightCompanion {

  constructor(scene, x, y) {
    this.scene       = scene;
    this.isUnlocked  = false;
    this.sprite      = null;
    this.lightSource = null;
    this._createSprite(x, y);
  }

  static preload(scene) {
    if (scene.textures.exists("light_ball")) return;

    const size   = COMPANION.TEXTURE_SIZE;
    const canvas = scene.textures.createCanvas("light_ball", size, size);
    const ctx    = canvas.context;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0,   "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.1, "rgba(0, 255, 255, 0.8)");
    gradient.addColorStop(0.4, "rgba(0, 255, 255, 0.2)");
    gradient.addColorStop(1,   "rgba(0, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  _createSprite(x, y) {
    const { scene } = this;

    this.sprite = scene.physics.add.sprite(x, y, "light_ball");
    this.sprite.setDepth(2);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.sprite.setAlpha(COMPANION.ALPHA_LOCKED);
    this.sprite.setScale(COMPANION.SCALE_LOCKED);

    scene.tweens.add({
      targets:  this.sprite,
      alpha:    { from: 0.2, to: 0.4 },
      scale:    { from: 0.55, to: 0.65 },
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
    });

    this.lightSource = scene.lights.addLight(
      x, y,
      COMPANION.LIGHT_RADIUS_LOCKED,
      PALETTE.CYAN,
      COMPANION.LIGHT_INTENSITY_LOCKED,
    );
  }

  unlock() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;

    const { scene } = this;

    scene.tweens.killTweensOf(this.sprite);

    scene.tweens.add({
      targets:  this.sprite,
      alpha:    COMPANION.ALPHA_UNLOCKED,
      scale:    COMPANION.SCALE_UNLOCKED,
      duration: 800,
      ease:     "Back.easeOut",
      onComplete: () => {
        scene.tweens.add({
          targets:  this.sprite,
          alpha:    0.6,
          scale:    1.05,
          duration: 1500,
          yoyo:     true,
          repeat:   -1,
          ease:     "Sine.easeInOut",
        });
      },
    });

    scene.tweens.add({
      targets:  this.lightSource,
      intensity: COMPANION.LIGHT_INTENSITY_UNLOCK,
      radius:   COMPANION.LIGHT_RADIUS_UNLOCK,
      duration: 800,
      ease:     "Quad.easeOut",
    });

    const flash = scene.add
      .circle(this.sprite.x, this.sprite.y, 10, PALETTE.CYAN, 0.8)
      .setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets:    flash,
      radius:     300,
      alpha:      0,
      duration:   600,
      ease:       "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  /** Modo solo: companion segue o player suavemente. */
  updateAI(player) {
    if (!this.isUnlocked || !this.sprite || !player) return;

    const offset  = player.flipX ? COMPANION.FOLLOW_OFFSET_X : -COMPANION.FOLLOW_OFFSET_X;
    const targetX = player.x + offset;
    const targetY = player.y - COMPANION.FOLLOW_OFFSET_Y;

    this.sprite.x = Phaser.Math.Linear(this.sprite.x, targetX, COMPANION.FOLLOW_LERP);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, targetY, COMPANION.FOLLOW_LERP);
    this.sprite.setVelocity(0);

    this._syncLight();
  }

  /** Modo coop: companion controlado pelo P2 (setas). */
  updateCoop(cursors, speed = COMPANION.COOP_SPEED) {
    if (!this.isUnlocked || !this.sprite) return;

    this.sprite.setVelocity(0);

    if      (cursors.left.isDown)  this.sprite.setVelocityX(-speed);
    else if (cursors.right.isDown) this.sprite.setVelocityX(speed);

    if      (cursors.up.isDown)    this.sprite.setVelocityY(-speed);
    else if (cursors.down.isDown)  this.sprite.setVelocityY(speed);

    this._syncLight();
  }

  _syncLight() {
    this.lightSource.x = this.sprite.x;
    this.lightSource.y = this.sprite.y;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}