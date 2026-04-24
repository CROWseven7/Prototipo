import Phaser from "phaser";

/**
 * TutorialUI — dicas e prompts de tutorial.
 * FIX #7: hints posicionados acima do centro da tela (cy = height * 0.38)
 */
export class TutorialUI {
  constructor(scene) {
    this.scene          = scene;
    this.container      = scene.add.container(0, 0).setDepth(20);
    this._activeHint    = null;
    this._stepIndex     = 0;
    this._steps         = [];
    this._onAllComplete = null;
  }

  // ─────────────────────────────────────────────
  setSteps(steps, onAllComplete) {
    this._steps         = steps;
    this._onAllComplete = onAllComplete;
    this._stepIndex     = 0;
    this._showStep(0);
  }

  update() {
    if (this._stepIndex >= this._steps.length) return;
    const step = this._steps[this._stepIndex];
    if (step.condition && step.condition()) {
      this._stepIndex++;
      if (this._stepIndex < this._steps.length) {
        this._showStep(this._stepIndex);
      } else {
        this._hideHint(() => {
          if (this._onAllComplete) this._onAllComplete();
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  _showStep(index) {
    const step = this._steps[index];
    this._hideHint(() => {
      this._activeHint = this._buildHint(step.keys, step.text);
    });
  }

  _hideHint(onDone) {
    if (this._activeHint) {
      const hint = this._activeHint;
      this._activeHint = null;
      this.scene.tweens.add({
        targets: hint,
        alpha: 0,
        y: hint.y + 16,
        duration: 350,
        ease: "Quad.easeIn",
        onComplete: () => { hint.destroy(); if (onDone) onDone(); },
      });
    } else {
      if (onDone) onDone();
    }
  }

  // ─────────────────────────────────────────────
  showMessage(text, duration = 3000) {
    const { width, height } = this.scene.scale;
    // FIX #7: mensagens avulsas também acima do centro
    const cy = height * 0.40;
    const container = this._buildMessage(text, width / 2, cy);

    if (duration > 0) {
      this.scene.time.delayedCall(duration, () => {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 500,
          onComplete: () => container.destroy(),
        });
      });
    }
    return container;
  }

  // ─────────────────────────────────────────────
  showWorldMarker(x, y, label = "") {
    const scene = this.scene;
    const mc = scene.add.container(x, y - 90).setDepth(15);

    if (label) {
      const txt = scene.add.text(0, -28, label, {
        fontFamily: "'Courier Prime', monospace",
        fontSize: "11px",
        color: "#5a5a6a",
        letterSpacing: 3,
      }).setOrigin(0.5);
      mc.add(txt);
    }

    const arrow = scene.add.text(0, 0, "▼", {
      fontSize: "16px",
      color: "#4a4a58",
    }).setOrigin(0.5);
    mc.add(arrow);

    scene.tweens.add({
      targets: arrow,
      y: 10, alpha: 0.3,
      duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    return mc;
  }

  // ─────────────────────────────────────────────
  //  HINT — posicionado acima do centro (FIX #7)
  // ─────────────────────────────────────────────
  _buildHint(keys, text) {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const cx = width / 2;
    // FIX #7: ~38% da altura = ligeiramente acima do centro
    const cy = height * 0.38;

    const container = scene.add.container(cx, cy + 24).setDepth(20).setAlpha(0);

    const bgWidth  = 520;
    const bgHeight = 48;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 24);
    bg.lineStyle(1, 0x3a3a48, 0.8);
    bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 24);
    container.add(bg);

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x2a2a35, 0.5);
    sep.moveTo(-bgWidth / 2 + 80, -bgHeight / 2 + 8);
    sep.lineTo(-bgWidth / 2 + 80, bgHeight / 2 - 8);
    sep.strokePath();
    container.add(sep);

    // Teclas
    let kx = -bgWidth / 2 + 20;
    keys.forEach((key, i) => {
      if (i > 0) {
        const plus = scene.add.text(kx, 0, "+", {
          fontFamily: "'Courier Prime', monospace",
          fontSize: "10px", color: "#3a3a48",
        }).setOrigin(0.5);
        container.add(plus);
        kx += 12;
      }

      const kb = scene.add.graphics();
      const kw = key.length > 1 ? 34 : 24;
      kb.fillStyle(0x1a1a22, 0.9);
      kb.fillRoundedRect(kx - kw / 2, -11, kw, 22, 4);
      kb.lineStyle(1, 0x4a4a58, 0.9);
      kb.strokeRoundedRect(kx - kw / 2, -11, kw, 22, 4);
      kb.lineStyle(2, 0x080810, 0.6);
      kb.strokeRoundedRect(kx - kw / 2, -9, kw, 24, 4);
      container.add(kb);

      const kt = scene.add.text(kx, 0, key, {
        fontFamily: "'Courier Prime', monospace",
        fontSize: "11px", color: "#8a8a9a", fontStyle: "bold",
      }).setOrigin(0.5);
      container.add(kt);

      kx += kw + 8;
    });

    // Texto
    const instrX = -bgWidth / 2 + 96;
    const instr = scene.add.text(instrX, 0, text, {
      fontFamily: "'Courier Prime', monospace",
      fontSize: "13px", color: "#7a7a8a", letterSpacing: 1,
    }).setOrigin(0, 0.5);
    container.add(instr);

    // Entrada
    scene.tweens.add({
      targets: container, alpha: 1, y: cy,
      duration: 500, ease: "Quart.easeOut",
    });

    // Flutuação
    scene.tweens.add({
      targets: container, y: cy - 5,
      duration: 2800, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: 500,
    });

    this.container.add(container);
    return container;
  }

  _buildMessage(text, cx, cy) {
    const scene = this.scene;
    const container = scene.add.container(cx, cy + 20).setDepth(20).setAlpha(0);

    const w = Math.min(text.length * 10 + 80, 560);
    const lines = scene.add.graphics();
    lines.lineStyle(1, 0x3a3a48, 0.6);
    lines.moveTo(-w / 2, -20); lines.lineTo(w / 2, -20);
    lines.moveTo(-w / 2,  20); lines.lineTo(w / 2,  20);
    lines.strokePath();
    container.add(lines);

    const label = scene.add.text(0, 0, text, {
      fontFamily: "'Courier Prime', monospace",
      fontSize: "15px", color: "#9a9aaa", letterSpacing: 3,
    }).setOrigin(0.5);
    container.add(label);

    scene.tweens.add({
      targets: container, alpha: 1, y: cy,
      duration: 500, ease: "Quart.easeOut",
    });

    return container;
  }

  // ─────────────────────────────────────────────
  destroy() {
    this._hideHint();
    this.container.destroy();
  }
}