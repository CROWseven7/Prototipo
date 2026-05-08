import Phaser from "phaser";
import { BaseScene } from "../global/BaseScene.js";
import { PALETTE, FONTS, PHYSICS, PLAYER } from "../global/constants.js";

/**
 * QuartoPrincipal — checkpoint do jogo.
 * O player sempre reaparece aqui após morrer.
 * Contém uma porta que leva ao Corredor.
 */
export class QuartoPrincipal extends BaseScene {
  constructor() {
    super("QuartoPrincipal");
    this._doorPrompt  = null;
    this._eKey        = null;
    this._nearDoor    = false;
  }

  _onInit(_data) {
    this._nearDoor = false;
  }

  _onPreload() {
    // this.load.image("quarto_bg", "assets/rooms/quarto_bg.png");
  }

  _onRoomReady() {
    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  _getSpawnX(_width) {
    // Spawn do lado esquerdo — longe da porta (direita)
    return 200;
  }

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    // Fundo
    this.add.rectangle(0, 0, width, height, PALETTE.INK)
      .setOrigin(0, 0).setDepth(-1);

    // Paredes e teto
    [
      [0,          0, 14,    height],
      [width - 14, 0, 14,    height],
      [0,          0, width, 10],
    ].forEach(([x, y, w, h]) => {
      this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0, 0).setPipeline("Light2D");
    });

    // ── Mobília básica do quarto ──────────────────────────────
    // Cama (esquerda)
    const bedW = 260, bedH = 60;
    const bed  = this.add.rectangle(width * 0.2, floorY - bedH / 2, bedW, bedH, 0x16161e).setOrigin(0.5);
    bed.setPipeline("Light2D");
    this.physics.add.existing(bed, true);
    this._furnitureGroup.add(bed);

    // Cabeceira
    const headH = 100;
    const head  = this.add.rectangle(width * 0.2 - bedW / 2 + 20, floorY - bedH - headH / 2, 20, headH, 0x12121a).setOrigin(0.5);
    head.setPipeline("Light2D");
    this.physics.add.existing(head, true);
    this._furnitureGroup.add(head);

    // Escrivaninha (centro)
    const deskW = 180, deskH = 70;
    const desk  = this.add.rectangle(width * 0.55, floorY - deskH / 2, deskW, deskH, 0x14141c).setOrigin(0.5);
    desk.setPipeline("Light2D");
    this.physics.add.existing(desk, true);
    this._furnitureGroup.add(desk);

    // ── Porta para o Corredor (direita) ──────────────────────
    this._buildDoor(width, floorY);

    // ── Luzes ambiente ────────────────────────────────────────
    this.lights.addLight(width * 0.2,  height * 0.5, 250, PALETTE.WARM, 0.3);
    this.lights.addLight(width * 0.55, height * 0.4, 180, PALETTE.WHITE, 0.2);
    this.lights.addLight(width * 0.95, height * 0.6, 200, PALETTE.WARM, 0.25);
  }

  _buildDoor(width, floorY) {
    const doorX = width - 100;
    const doorW = 90;
    const doorH = 200;

    // Batente
    this.add.rectangle(doorX, floorY - doorH / 2, doorW, doorH, 0x0c0c14)
      .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

    // Fresta de luz
    const crack = this.add.rectangle(doorX, floorY - 2, doorW - 10, 3, 0x3a3020, 0.7)
      .setOrigin(0.5).setDepth(2);
    this.tweens.add({
      targets:  crack,
      alpha:    { from: 0.4, to: 0.9 },
      duration: 4000,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
    });
    this.lights.addLight(doorX, floorY, 180, PALETTE.WARM, 0.2);

    // Prompt [E] — começa invisível
    this._doorPrompt = this.add.text(doorX, floorY - doorH - 24, "[E]", {
      fontFamily: FONTS.MONO,
      fontSize:   "14px",
      color:      "#888888",
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets:  this._doorPrompt,
      alpha:    { from: 0, to: 1 },
      duration: 800,
      yoyo:     true,
      repeat:   -1,
      paused:   true,            // só ativa quando o player chegar perto
    });

    // Zona de interação (invisível)
    this._doorZone = this.add.zone(doorX, floorY - doorH / 2, 140, doorH + 40)
      .setOrigin(0.5);
    this.physics.world.enable(this._doorZone);
    this._doorZone.body.setAllowGravity(false);

    this._doorX = doorX;
    this._doorFloorY = floorY;
    this._doorH = doorH;
  }

  _onUpdate(_time, _delta) {
    if (!this.player) return;

    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this._doorX,   this._doorFloorY - this._doorH / 2,
    );

    const close = dist < 160;

    if (close && !this._nearDoor) {
      this._nearDoor = true;
      this._doorPrompt.setAlpha(0);
      // Reinicia o tween piscante
      this.tweens.getTweensOf(this._doorPrompt).forEach(t => t.restart());
    } else if (!close && this._nearDoor) {
      this._nearDoor = false;
      this.tweens.getTweensOf(this._doorPrompt).forEach(t => t.pause());
      this._doorPrompt.setAlpha(0);
    }

    if (this._nearDoor && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      this._goToCorredor();
    }
  }

  _goToCorredor() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start("Corredor");
    });
  }
}