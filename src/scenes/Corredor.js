import Phaser from "phaser";
import { BaseScene } from "../global/BaseScene.js";
import { PALETTE, FONTS, PHYSICS } from "../global/constants.js";

/**
 * Corredor — hub central com 4 portas e 1 NPC.
 *
 * Portas:
 *   1 → SalaDeEstar
 *   2 → Cozinha
 *   3 → QuartoDosPais
 *   4 → Banheiro
 *   (parede esquerda) → QuartoPrincipal  (voltar)
 *
 * NPC: parado no centro, prompt [E] ao se aproximar.
 */

const DOORS = [
  { id: 1, label: "Sala de Estar",   scene: "SalaDeEstar",   xRatio: 0.30 },
  { id: 2, label: "Cozinha",         scene: "Cozinha",        xRatio: 0.46 },
  { id: 3, label: "Quarto dos Pais", scene: "QuartoDosPais",  xRatio: 0.62 },
  { id: 4, label: "Banheiro",        scene: "Banheiro",       xRatio: 0.78 },
];

const NPC_X_RATIO = 0.88; // NPC parado perto do fim do corredor

export class Corredor extends BaseScene {
  constructor() {
    super("Corredor");
    this._eKey       = null;
    this._nearTarget = null;   // { type: "door"|"npc"|"back", scene?, label? }
    this._prompt     = null;
    this._dialogOpen = false;
    this._doorData   = [];     // { zone, scene, label, promptText }
    this._npcData    = null;   // { zone, promptText }
    this._backData   = null;   // { zone, promptText }
  }

  _onInit(_data) {
    this._nearTarget = null;
    this._dialogOpen = false;
  }

  _onPreload() {
    // this.load.image("corredor_bg", "assets/rooms/corredor_bg.png");
    // this.load.image("npc_sprite",  "assets/npcs/npc_01.png");
  }

  _getSpawnX(width) {
    // Player entra pelo lado esquerdo (vindo do QuartoPrincipal)
    return 120;
  }

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    // Fundo — corredor é longo e estreito visualmente
    this.add.rectangle(0, 0, width, height, PALETTE.INK)
      .setOrigin(0, 0).setDepth(-1);

    // Paredes
    [
      [0,          0, 14,    height],
      [width - 14, 0, 14,    height],
      [0,          0, width, 10],
    ].forEach(([x, y, w, h]) => {
      this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0, 0).setPipeline("Light2D");
    });

    // Faixa de rodapé no teto (estética de corredor)
    this.add.rectangle(0, 60, width, 8, 0x14141c).setOrigin(0, 0).setPipeline("Light2D");

    // ── 4 Portas numeradas ────────────────────────────────────
    this._doorData = DOORS.map(({ id, label, scene, xRatio }) => {
      const dx    = width * xRatio;
      const doorW = 90;
      const doorH = 200;

      // Batente
      this.add.rectangle(dx, floorY - doorH / 2, doorW, doorH, 0x0c0c14)
        .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

      // Número da porta
      this.add.text(dx, floorY - doorH - 30, String(id), {
        fontFamily: FONTS.MONO,
        fontSize:   "12px",
        color:      "#3a3a48",
      }).setOrigin(0.5).setDepth(2);

      // Fresta de luz
      const crack = this.add.rectangle(dx, floorY - 2, doorW - 10, 3, 0x3a3020, 0.6)
        .setOrigin(0.5).setDepth(2);
      this.tweens.add({
        targets:  crack,
        alpha:    { from: 0.3, to: 0.8 },
        duration: 3000 + id * 700,
        yoyo:     true, repeat: -1, ease: "Sine.easeInOut",
      });
      this.lights.addLight(dx, floorY, 160, PALETTE.WARM, 0.18);

      // Zona de interação
      const zone = this.add.zone(dx, floorY - doorH / 2, 140, doorH + 40).setOrigin(0.5);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);

      return { zone, scene, label, x: dx, y: floorY - doorH / 2 };
    });

    // ── Porta de volta (esquerda — QuartoPrincipal) ───────────
    {
      const bx    = 60;
      const doorH = 200;
      this.add.rectangle(bx, floorY - doorH / 2, 90, doorH, 0x0c0c14)
        .setOrigin(0.5).setDepth(1).setPipeline("Light2D");
      this.add.text(bx, floorY - doorH - 30, "←", {
        fontFamily: FONTS.MONO, fontSize: "14px", color: "#3a3a48",
      }).setOrigin(0.5).setDepth(2);
      this.lights.addLight(bx, floorY, 140, PALETTE.WARM, 0.15);

      const zone = this.add.zone(bx, floorY - doorH / 2, 140, doorH + 40).setOrigin(0.5);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      this._backData = { zone, x: bx, y: floorY - doorH / 2 };
    }

    // ── NPC ───────────────────────────────────────────────────
    {
      const nx = width * NPC_X_RATIO;
      const ny = floorY;

      // Sprite placeholder (retângulo cinza enquanto não há sprite)
      const npcBody = this.add.rectangle(nx, ny - 80, 50, 140, 0x2a2a38)
        .setOrigin(0.5).setDepth(2).setPipeline("Light2D");

      // "Cabeça"
      this.add.circle(nx, ny - 165, 30, 0x2a2a38).setDepth(2);

      // Balão de nome
      this.add.text(nx, ny - 220, "???", {
        fontFamily: FONTS.MONO, fontSize: "11px", color: "#5a5a6a",
        letterSpacing: 3,
      }).setOrigin(0.5).setDepth(3);

      // Luz tênue sobre o NPC
      this.lights.addLight(nx, ny - 80, 180, PALETTE.WHITE, 0.25);

      const zone = this.add.zone(nx, ny - 80, 160, 200).setOrigin(0.5);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      this._npcData = { zone, x: nx, y: ny - 80 };
    }

    // ── Prompt [E] compartilhado ──────────────────────────────
    this._prompt = this.add.text(0, -9999, "[E]", {
      fontFamily: FONTS.MONO, fontSize: "14px", color: "#888888",
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.tweens.add({
      targets:  this._prompt,
      alpha:    { from: 0, to: 1 },
      duration: 800, yoyo: true, repeat: -1, paused: true,
    });

    // ── Luzes gerais do corredor ──────────────────────────────
    [0.15, 0.45, 0.72].forEach((xr, i) => {
      this.lights.addLight(width * xr, height * 0.3, 200, PALETTE.WHITE, 0.15 + i * 0.03);
    });
  }

  _onUpdate(_time, _delta) {
    if (!this.player || this._dialogOpen) return;

    const px = this.player.x;
    const py = this.player.y;

    // Verifica proximidade de todas as zonas interativas
    let found = null;
    let bestDist = 180;

    // Portas
    for (const d of this._doorData) {
      const dist = Phaser.Math.Distance.Between(px, py, d.x, d.y);
      if (dist < bestDist) { bestDist = dist; found = { type: "door", ...d }; }
    }

    // Porta de volta
    if (this._backData) {
      const dist = Phaser.Math.Distance.Between(px, py, this._backData.x, this._backData.y);
      if (dist < bestDist) { bestDist = dist; found = { type: "back", ...this._backData }; }
    }

    // NPC
    if (this._npcData) {
      const dist = Phaser.Math.Distance.Between(px, py, this._npcData.x, this._npcData.y);
      if (dist < bestDist) { bestDist = dist; found = { type: "npc", ...this._npcData }; }
    }

    // Atualiza prompt
    if (found) {
      this._prompt.setPosition(found.x, found.y - 80);
      if (!this._nearTarget) {
        this._nearTarget = found;
        this.tweens.getTweensOf(this._prompt).forEach(t => t.restart());
      } else {
        this._nearTarget = found;
      }
    } else {
      if (this._nearTarget) {
        this._nearTarget = null;
        this.tweens.getTweensOf(this._prompt).forEach(t => t.pause());
        this._prompt.setAlpha(0);
      }
    }

    // Tecla E
    if (this._nearTarget && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      this._interact(this._nearTarget);
    }
  }

  _interact(target) {
    if (target.type === "door") {
      this._goToScene(target.scene);
    } else if (target.type === "back") {
      this._goToScene("QuartoPrincipal");
    } else if (target.type === "npc") {
      this._openNpcDialog();
    }
  }

  _goToScene(key) {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => this.scene.start(key));
  }

  // ── Diálogo simples do NPC ────────────────────────────────
  _openNpcDialog() {
    this._dialogOpen = true;
    this.physics.pause();

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.72;
    const bW = width * 0.65;
    const bH = 120;

    const overlay = this.add.rectangle(cx, cy, bW, bH, 0x08080e, 0.92)
      .setDepth(50).setStrokeStyle(1, 0x2a2a3a);

    const nameTag = this.add.text(cx - bW / 2 + 20, cy - bH / 2 + 14, "???", {
      fontFamily: FONTS.MONO, fontSize: "11px", color: "#5a5a6a", letterSpacing: 3,
    }).setDepth(51);

    // TODO: trocar pelo diálogo real do NPC
    const dialogText = this.add.text(cx, cy + 6,
      "...", {
        fontFamily:  "'Cormorant Garamond', serif",
        fontSize:    "20px",
        color:       "#a8a49e",
        wordWrap:    { width: bW - 60 },
        align:       "center",
        lineSpacing: 6,
      }
    ).setOrigin(0.5).setDepth(51);

    const hint = this.add.text(cx + bW / 2 - 16, cy + bH / 2 - 12, "[E]", {
      fontFamily: FONTS.MONO, fontSize: "11px", color: "#3a3a48",
    }).setOrigin(1, 1).setDepth(51);

    const closeAll = () => {
      [overlay, nameTag, dialogText, hint].forEach(o => o.destroy());
      this._dialogOpen = false;
      this.physics.resume();
    };

    const eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.time.delayedCall(300, () => {
      eKey.once("down", closeAll);
    });
  }

  _onRoomReady() {
    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }
}