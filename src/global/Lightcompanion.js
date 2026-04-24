import Phaser from "phaser";

/**
 * LightCompanion — Módulo global do companheiro de luz.
 * Pode ser instanciado em qualquer cena.
 */
export class LightCompanion {
  constructor(scene, x, y) {
    this.scene = scene;
    this.isUnlocked = false;
    this.sprite = null;
    this.lightSource = null;
    this._createSprite(x, y);
  }

  /**
   * Pré-carrega a textura da bola de luz.
   * Chame em preload() da cena.
   */
  static preload(scene) {
    if (scene.textures.exists("light_ball")) return;

    const size = 300;
    const canvas = scene.textures.createCanvas("light_ball", size, size);
    const ctx = canvas.context;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.1, "rgba(0, 255, 255, 0.8)");
    gradient.addColorStop(0.4, "rgba(0, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(0, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  _createSprite(x, y) {
    const scene = this.scene;

    this.sprite = scene.physics.add.sprite(x, y, "light_ball");
    this.sprite.setDepth(2);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.sprite.setAlpha(0.3);
    this.sprite.setScale(0.6);

    // Pulsar suavemente mesmo quando bloqueado
    scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.2, to: 0.4 },
      scale: { from: 0.55, to: 0.65 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Fonte de luz fraca enquanto bloqueada
    this.lightSource = scene.lights.addLight(x, y, 200, 0x00ffff, 0.8);
  }

  /**
   * Desbloqueia o companheiro com animação de "despertar".
   */
  unlock() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;

    const scene = this.scene;

    // Para todos os tweens existentes
    scene.tweens.killTweensOf(this.sprite);

    // Animação de despertar
    scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      scale: 1,
      duration: 800,
      ease: "Back.easeOut",
      onComplete: () => {
        // Pulsar completo após despertar
        scene.tweens.add({
          targets: this.sprite,
          alpha: 0.6,
          scale: 1.05,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    // Aumenta intensidade da luz
    scene.tweens.add({
      targets: this.lightSource,
      intensity: 2.5,
      radius: 500,
      duration: 800,
      ease: "Quad.easeOut",
    });

    // Flash de ativação
    const flash = scene.add.circle(
      this.sprite.x, this.sprite.y, 10, 0x00ffff, 0.8
    ).setDepth(10).setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: flash,
      radius: 300,
      alpha: 0,
      duration: 600,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Atualiza o companion no modo singleplayer (segue o player).
   * @param {Phaser.GameObjects.Sprite} player
   */
  updateAI(player) {
    if (!this.isUnlocked || !this.sprite || !player) return;

    const offset = player.flipX ? 80 : -80;
    const targetX = player.x + offset;
    const targetY = player.y - 120;

    this.sprite.x = Phaser.Math.Linear(this.sprite.x, targetX, 0.1);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, targetY, 0.1);
    this.sprite.setVelocity(0);

    this.lightSource.x = this.sprite.x;
    this.lightSource.y = this.sprite.y;
  }

  /**
   * Atualiza o companion no modo coop (controlado pelo P2).
   * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors
   * @param {number} speed
   */
  updateCoop(cursors, speed = 400) {
    if (!this.isUnlocked || !this.sprite) return;

    this.sprite.setVelocity(0);

    if (cursors.left.isDown) this.sprite.setVelocityX(-speed);
    else if (cursors.right.isDown) this.sprite.setVelocityX(speed);

    if (cursors.up.isDown) this.sprite.setVelocityY(-speed);
    else if (cursors.down.isDown) this.sprite.setVelocityY(speed);

    this.lightSource.x = this.sprite.x;
    this.lightSource.y = this.sprite.y;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}