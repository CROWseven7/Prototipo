import Phaser from "phaser";
import { BaseScene }      from "../../global/BaseScene.js";
import { TutorialUI }     from "./TutorialUI.js";
import { PaperItem }      from "./PaperItem.js";
import { TUTORIAL, PALETTE, FONTS, PHYSICS, PLAYER } from "../../global/constants.js";

// ─────────────────────────────────────────────
//  Dados estáticos da cena
// ─────────────────────────────────────────────

const AMBIENT_LIGHTS = [
  [0.08, 0.85, 0xffffff, 0.25, 160],
  [0.22, 0.60, 0xffffff, 0.20, 140],
  [0.40, 0.75, 0xffffff, 0.22, 150],
  [0.55, 0.55, 0xffffff, 0.18, 130],
  [0.70, 0.80, 0xffffff, 0.25, 155],
  [0.85, 0.60, 0xffffff, 0.20, 145],
];

const FURNITURE = [
  { type: "mesa",    xr: 0.28, w: 200, h: 80,  color: 0x16161e },
  { type: "cadeira", xr: 0.18, w: 70,  h: 90,  color: 0x12121a },
  { type: "estante", xr: 0.88, w: 100, h: 130, color: 0x14141c },
];

const PHASE = Object.freeze({
  WALK:     "WALK",
  JUMP:     "JUMP",
  INTERACT: "INTERACT",
  REACH:    "REACH",
  UNLOCK:   "UNLOCK",
  COOP:     "COOP",
  DONE:     "DONE",
});

const PAPER_TEXT =
`— Você encontrou um fragmento. —

Historia...

As palavras estão desbotadas,
há gotas de água no papel.

[Trecho da história a definir]`;

// ─────────────────────────────────────────────
//  Cena
// ─────────────────────────────────────────────

export class Tutorial extends BaseScene {

  constructor() {
    super("Tutorial");
    this._phase           = PHASE.WALK;
    this._walkedRight     = false;
    this._hasJumped       = false;
    this._paper           = null;
    this._companionMarker = null;
    this._tutorialUI      = null;
    this._fogLayers       = [];
    this._coopMoveTimer   = 0;
    this._coopMovedEnough = false;
  }

  // ─────────────────────────────────────────────
  //  HOOKS de BaseScene
  // ─────────────────────────────────────────────

  _onInit(_data) {
    this._phase           = PHASE.WALK;
    this._walkedRight     = false;
    this._hasJumped       = false;
    this._coopMoveTimer   = 0;
    this._coopMovedEnough = false;
  }

  _onRoomReady() {
    const { width, height } = this.scale;

    const companionX = width  * TUTORIAL.COMPANION_X_RATIO;
    const companionY = height - TUTORIAL.COMPANION_Y_FROM_TOP;

    // Marcador do companion no mundo
    this._tutorialUI      = new TutorialUI(this);
    this._companionMarker = this._tutorialUI.showWorldMarker(companionX, companionY, "???");

    // Papel interagível — spawna imediatamente, interação só ativa na fase INTERACT
    const paperX = width  * TUTORIAL.PAPER_X_RATIO;
    const paperY = height - TUTORIAL.PAPER_Y_FROM_FLOOR;
    this._paper  = new PaperItem(this, paperX, paperY, PAPER_TEXT);
    this._paper.spawn();
    this._paper.addEventListener("closed", () => this._onPaperClosed());

    // Pausa via ESC: BaseScene já registrou o ESC genérico,
    // mas no tutorial o ESC também fecha o papel.
    const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on("down", () => {
      if (this._paper.isOpen) {
        this._paper.close();
      } else if (!this._paused) {
        this._openPause();
      }
    });

    this._startPhase(PHASE.WALK);
  }

  _onUpdate(time, delta) {
    if (this._phase === PHASE.WALK && this.keys?.D?.isDown) {
      this._walkedRight = true;
    }

    if (this._phase === PHASE.JUMP && this.keys?.W?.isDown) {
      if (this.player?.body?.velocity.y < -80) this._hasJumped = true;
    }

    // Interação com o papel na fase correta
    if (!this._paper?.isOpen && this._phase === PHASE.INTERACT) {
      if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey("E"))) {
        const dist = Phaser.Math.Distance.Between(
          this.player?.x ?? 0, this.player?.y ?? 0,
          this._paper.x, this._paper.y,
        );
        if (dist < TUTORIAL.PAPER_INTERACT_RADIUS) this._paper.open();
      }
    }

    this._tutorialUI?.update();

    if (this._phase === PHASE.COOP && !this._coopMovedEnough) {
      if (this._p2Moving()) {
        this._coopMoveTimer += delta;
        if (this._coopMoveTimer >= TUTORIAL.COOP_MOVE_TARGET_MS) {
          this._coopMovedEnough = true;
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  //  MÁQUINA DE ESTADOS
  // ─────────────────────────────────────────────

  _startPhase(phase) {
    this._phase = phase;

    switch (phase) {

      case PHASE.WALK:
        this._tutorialUI.setSteps([{
          keys:      ["A", "D"],
          text:      "Mova-se pelo cômodo",
          condition: () => this._walkedRight,
        }], () => this._startPhase(PHASE.JUMP));
        break;

      case PHASE.JUMP:
        this._tutorialUI.setSteps([{
          keys:      ["W"],
          text:      "Pule sobre os obstáculos",
          condition: () => this._hasJumped,
        }], () => this._startPhase(PHASE.INTERACT));
        break;

      case PHASE.INTERACT:
        this._tutorialUI.setSteps([{
          keys:      ["E"],
          text:      "Examine o papel no chão",
          condition: () => this._phase === PHASE.REACH,
        }], () => {});
        break;

      case PHASE.REACH:
        this._tutorialUI.setSteps([{
          keys:      ["D"],
          text:      "Aproxime-se da fonte de luz",
          condition: () => this._isNearCompanion(),
        }], () => this._unlockCompanion());
        break;

      case PHASE.UNLOCK:
        break;

      case PHASE.COOP:
        this._coopMoveTimer   = 0;
        this._coopMovedEnough = false;
        this._tutorialUI.setSteps([{
          keys:      ["↑", "↓", "←", "→"],
          text:      "P2: Guie a luz pelo quarto — explore as sombras",
          condition: () => this._coopMovedEnough,
        }], () => this._startPhase(PHASE.DONE));
        break;

      case PHASE.DONE:
        this._finishTutorial();
        break;
    }
  }

  _onPaperClosed() {
    // Papel foi lido — avança para a próxima fase
    if (this._phase === PHASE.INTERACT) {
      this._startPhase(PHASE.REACH);
    }
  }

  _isNearCompanion() {
    if (!this.player || !this.companion) return false;
    return Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.companion.x, this.companion.y,
    ) < 240;
  }

  _p2Moving() {
    return this.cursors && (
      this.cursors.left.isDown  || this.cursors.right.isDown ||
      this.cursors.up.isDown    || this.cursors.down.isDown
    );
  }

  _unlockCompanion() {
    this._phase = PHASE.UNLOCK;

    if (this._companionMarker) {
      this.tweens.add({
        targets:    this._companionMarker,
        alpha:      0,
        duration:   400,
        onComplete: () => this._companionMarker.destroy(),
      });
    }

    const msg = this._tutorialUI.showMessage("✦  Uma luz acende no escuro  ✦", 0);
    this.companion.unlock();

    this.time.delayedCall(1400, () => {
      this.tweens.add({
        targets:    msg,
        alpha:      0,
        duration:   500,
        onComplete: () => msg.destroy(),
      });
      const nextPhase = this.isMultiplayer ? PHASE.COOP : PHASE.DONE;
      this.time.delayedCall(400, () => this._startPhase(nextPhase));
    });
  }

  _finishTutorial() {
    const msg = this._tutorialUI.showMessage("Você não está sozinho.", 0);
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(1200, 0, 0, 0);
      this.time.delayedCall(1200, () => {
        msg.destroy();
        this.scene.start("QuartoPrincipal");
      });
    });
  }

  // ─────────────────────────────────────────────
  //  CONSTRUÇÃO DO CENÁRIO (BaseScene._buildRoom)
  // ─────────────────────────────────────────────

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    this.add.rectangle(0, 0, width, height, PALETTE.INK)
      .setOrigin(0, 0).setDepth(-1);

    // Paredes laterais e teto
    [
      [0,          0, 14,    height],
      [width - 14, 0, 14,    height],
      [0,          0, width, 10],
    ].forEach(([x, y, w, h]) => {
      this.add.rectangle(x, y, w, h, 0x0a0a0d).setOrigin(0, 0).setPipeline("Light2D");
    });

    this.add.rectangle(0, floorY - 8, width, 8, 0x18181f).setOrigin(0, 0).setPipeline("Light2D");

    // Mobiliário
    FURNITURE.forEach(({ xr, w, h, color }) => {
      const fx  = width * xr;
      const fy  = floorY - h / 2;
      const obj = this.add.rectangle(fx, fy, w, h, color).setOrigin(0.5, 0.5);
      obj.setPipeline("Light2D");
      this.physics.add.existing(obj, true);
      this._furnitureGroup.add(obj);

      const detail = this.add.graphics().setDepth(1);
      detail.lineStyle(1, 0x2a2a35, 0.8);
      detail.strokeRect(fx - w / 2 + 4, fy - h / 2 + 4, w - 8, h - 8);
    });

    this._buildDoorCrack(width * 0.95, floorY);

    AMBIENT_LIGHTS.forEach(([xr, yr, color, intensity, radius]) => {
      this.lights.addLight(width * xr, height * yr, radius, color, intensity);
    });

    this._createFog(width, height);
  }

  _buildDoorCrack(x, floorY) {
    const doorW = 90, doorH = 200;
    const door  = this.add
      .rectangle(x, floorY - doorH / 2, doorW, doorH, 0x0c0c14)
      .setOrigin(0.5, 0.5).setDepth(1);
    door.setPipeline("Light2D");

    const crack = this.add
      .rectangle(x, floorY - 2, doorW - 10, 3, 0x3a3020, 0.7)
      .setOrigin(0.5, 0.5).setDepth(2);

    this.lights.addLight(x, floorY, 180, PALETTE.WARM, 0.18);

    this.tweens.add({
      targets:  crack,
      alpha:    { from: 0.4, to: 0.9 },
      duration: 5000,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
    });
  }

  _createFog(width, height) {
    const fogTop = this.add.graphics().setDepth(8).setAlpha(0.6);
    fogTop.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0);
    fogTop.fillRect(0, 0, width, 100);

    const fogBottom = this.add.graphics().setDepth(8).setAlpha(0.5);
    fogBottom.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
    fogBottom.fillRect(0, height - 100, width, 100);

    for (let i = 0; i < 3; i++) {
      const r     = Phaser.Math.Between(300, 600);
      const fx    = Phaser.Math.Between(0, width);
      const fy    = Phaser.Math.FloatBetween(0.55, 0.85) * height;
      const alpha = Phaser.Math.FloatBetween(0.04, 0.09);
      const blob  = this.add.circle(fx, fy, r, 0x0d0d16, alpha).setDepth(7);

      this.tweens.add({
        targets:  blob,
        x:        fx + Phaser.Math.Between(-80, 80),
        alpha:    alpha * 0.5,
        duration: Phaser.Math.Between(12000, 22000),
        yoyo:     true,
        repeat:   -1,
        ease:     "Sine.easeInOut",
        delay:    i * 3000,
      });
    }
  }
}