import Phaser from "phaser";
import { TUTORIAL, PALETTE, FONTS } from "../../global/constants.js";

/**
 * PaperItem — objeto interagível "papel no chão".
 *
 * Encapsula todo o ciclo de vida do papel: spawn, prompt visual,
 * abertura do overlay e fechamento. Emite eventos via EventTarget.
 *
 * Eventos (no objeto PaperItem):
 *   "opened"  → overlay aberto
 *   "closed"  → overlay fechado (jogador leu o papel)
 */
export class PaperItem extends EventTarget {

  constructor(scene, x, y, bodyText) {
    super();
    this.scene   = scene;
    this.x       = x;
    this.y       = y;
    this.text    = bodyText;
    this._isOpen = false;

    this._paperGfx    = null;
    this._promptText  = null;
    this._overlayObjs = [];

    this._interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this._escKey      = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Listener permanente de ESC — sem re-registro manual
    this._escKey.on("down", () => {
      if (this._isOpen) this.close();
    });
  }

  get isOpen() { return this._isOpen; }

  // ─────────────────────────────────────────────
  //  SPAWN
  // ─────────────────────────────────────────────

  spawn() {
    const { scene, x, y } = this;
    const pW = 48, pH = 60;

    // Sombra
    const shadow = scene.add.graphics().setDepth(4);
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillEllipse(x, y - 2, pW + 6, 8);

    // Papel desenhado
    const gfx = scene.add.graphics().setDepth(5);
    gfx.fillStyle(0xd8d4ce, 0.9);
    gfx.fillRect(x - pW / 2, y - pH, pW, pH);
    gfx.lineStyle(1, 0x9a9a8a, 0.4);
    for (let l = 0; l < 5; l++) {
      const ly = y - pH + 12 + l * 9;
      gfx.moveTo(x - pW / 2 + 6, ly);
      gfx.lineTo(x + pW / 2 - 6, ly);
    }
    gfx.strokePath();
    this._paperGfx = gfx;

    // Prompt piscante
    this._promptText = scene.add.text(x, y - pH - 16, "[E]", {
      fontFamily: FONTS.MONO,
      fontSize:   "12px",
      color:      "#888888",
    }).setOrigin(0.5).setDepth(6);

    scene.tweens.add({
      targets:  this._promptText,
      alpha:    { from: 0.3, to: 1 },
      duration: 900,
      yoyo:     true,
      repeat:   -1,
    });

    scene.lights.addLight(x, y - pH / 2, 90, PALETTE.WHITE, 0.4);
  }

  // ─────────────────────────────────────────────
  //  ABERTURA DO OVERLAY
  // ─────────────────────────────────────────────

  open() {
    if (this._isOpen) return;
    this._isOpen = true;

    this.scene.physics.pause();

    const { scene } = this;
    const { width, height } = scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const pW = Math.min(width * 0.7, 900);
    const pH = Math.min(height * 0.78, 680);

    // Overlay escurecido
    const overlay = scene.add.rectangle(cx, cy, width, height, 0x000000, 0)
      .setDepth(50).setInteractive();
    scene.tweens.add({ targets: overlay, alpha: 0.75, duration: 400 });

    // Corpo do papel
    const paperBg = scene.add.graphics().setDepth(51);
    this._drawPaperBackground(paperBg, cx, cy, pW, pH);

    // Texto
    const bodyTxt = scene.add.text(cx, cy - pH / 2 + 60, this.text, {
      fontFamily:  "'Cormorant Garamond', serif",
      fontSize:    "20px",
      color:       "#2a2820",
      lineSpacing: 10,
      wordWrap:    { width: pW - 100 },
      align:       "center",
    }).setOrigin(0.5, 0).setDepth(52);

    // Dica de fechar
    const closeHint = scene.add.text(cx, cy + pH / 2 - 28, "[ E  ou  ESC  para fechar ]", {
      fontFamily:    FONTS.MONO,
      fontSize:      "11px",
      color:         "#7a7a6a",
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(52);

    scene.tweens.add({
      targets:  closeHint,
      alpha:    { from: 0.4, to: 1 },
      duration: 1200,
      yoyo:     true,
      repeat:   -1,
    });

    // Entrada
    [paperBg, bodyTxt, closeHint].forEach(o => o.setAlpha(0));
    scene.tweens.add({
      targets:  [paperBg, bodyTxt, closeHint],
      alpha:    1,
      duration: 400,
      ease:     "Quart.easeOut",
    });

    this._overlayObjs = [overlay, paperBg, bodyTxt, closeHint];

    // Interação para fechar (com delay anti-clique-imediato)
    scene.time.delayedCall(300, () => {
      this._interactKey.once("down", () => this.close());
      overlay.on("pointerdown", () => this.close());
    });

    this.dispatchEvent(new Event("opened"));
  }

  // ─────────────────────────────────────────────
  //  FECHAMENTO
  // ─────────────────────────────────────────────

  close() {
    if (!this._isOpen) return;

    const objs = [...this._overlayObjs];
    this._overlayObjs = [];

    this.scene.tweens.add({
      targets:    objs,
      alpha:      0,
      duration:   350,
      ease:       "Quad.easeIn",
      onComplete: () => {
        objs.forEach(o => { try { o?.destroy(); } catch (_) {} });
        this._isOpen = false;
        this.scene.physics.resume();
        this._destroyWorldObjects();
        this.dispatchEvent(new Event("closed"));
      },
    });
  }

  /** Fecha sem animação (ex: sair para o menu enquanto aberto). */
  closeImmediate() {
    this._overlayObjs.forEach(o => { try { o?.destroy(); } catch (_) {} });
    this._overlayObjs = [];
    this._isOpen      = false;
    this._destroyWorldObjects();
  }

  _destroyWorldObjects() {
    this._paperGfx?.destroy();
    this._promptText?.destroy();
    this._paperGfx   = null;
    this._promptText  = null;
  }

  // ─────────────────────────────────────────────
  //  HELPERS GRÁFICOS
  // ─────────────────────────────────────────────

  _drawPaperBackground(gfx, cx, cy, pW, pH) {
    gfx.fillStyle(0xd0ccc4, 1);
    gfx.fillRect(cx - pW / 2, cy - pH / 2, pW, pH);
    gfx.lineStyle(1, 0xa8a49e, 0.8);
    gfx.strokeRect(cx - pW / 2, cy - pH / 2, pW, pH);

    // Dobra no canto
    const foldSize = 28;
    gfx.fillStyle(0xb8b4ae, 1);
    gfx.fillTriangle(
      cx + pW / 2 - foldSize, cy - pH / 2,
      cx + pW / 2,             cy - pH / 2,
      cx + pW / 2,             cy - pH / 2 + foldSize,
    );
    gfx.lineStyle(1, 0x9a9690, 0.6);
    gfx.moveTo(cx + pW / 2 - foldSize, cy - pH / 2);
    gfx.lineTo(cx + pW / 2,            cy - pH / 2 + foldSize);
    gfx.strokePath();

    // Linhas de pauta
    gfx.lineStyle(1, 0xb8b4ae, 0.3);
    for (let row = 0; row < 20; row++) {
      const ly = cy - pH / 2 + 60 + row * 28;
      if (ly > cy + pH / 2 - 20) break;
      gfx.moveTo(cx - pW / 2 + 40, ly);
      gfx.lineTo(cx + pW / 2 - 40, ly);
    }
    gfx.strokePath();
  }
}