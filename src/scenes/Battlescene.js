import Phaser from "phaser";
import { PALETTE, FONTS } from "../global/constants.js";

/**
 * BattleScene — interface universal de batalha por turnos.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  [HP Boss ──────────────────────────]                   │
 * │                                                         │
 * │  [Boss sprite — canto superior esq]                     │
 * │                              [Player sprite — inf dir]  │
 * │                                                         │
 * │  [HP Player ───────────────]                            │
 * │  [ Ataque ]  [ Defesa ]  [ Cura ]  [ Acessórios* ]     │
 * └─────────────────────────────────────────────────────────┘
 *
 * Como iniciar a batalha:
 *   this.scene.start("BattleScene", {
 *     // ── Boss ──
 *     bossName:       "Sombra",
 *     bossSprite:     "boss_shadow",    // chave de textura já carregada
 *     bossMaxHp:      300,
 *     bossHp:         300,
 *
 *     // ── Player ──
 *     playerName:     "Você",
 *     playerSprite:   "player_frame_1", // reutiliza textura existente
 *     playerMaxHp:    100,
 *     playerHp:       100,
 *
 *     // ── Acessórios (opcional) ──
 *     accessories:    [{ label: "Poção", key: "potion" }],
 *
 *     // ── Retorno após batalha ──
 *     returnScene:    "QuartoPrincipal",
 *   });
 *
 * Personalize a lógica de dano/cura em _executePlayerAction() e _bossTurn().
 */

const COLOR = {
  BG:         0x06060a,
  PANEL:      0x0e0e14,
  BAR_BG:     0x1a1a22,
  HP_GREEN:   0x4a9e6a,
  HP_YELLOW:  0x9e8a2a,
  HP_RED:     0x8a3a2a,
  BTN_IDLE:   0x14141e,
  BTN_HOVER:  0x22223a,
  BTN_PRESS:  0x0a0a10,
  BTN_BORDER: 0x2a2a3a,
  TEXT_MAIN:  "#c8c4be",
  TEXT_DIM:   "#5a5a6a",
  TEXT_LOG:   "#8a8a9a",
};

const ANIM_DURATION = 350;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });

    // Estado da batalha (preenchido via init())
    this._bossName      = "???";
    this._bossSprite    = null;
    this._bossMaxHp     = 100;
    this._bossHp        = 100;

    this._playerName    = "Você";
    this._playerSprite  = null;
    this._playerMaxHp   = 100;
    this._playerHp      = 100;

    this._accessories   = [];
    this._returnScene   = "QuartoPrincipal";

    // Referências de UI
    this._bossBar       = null;   // Graphics da barra de HP do boss
    this._playerBar     = null;   // Graphics da barra de HP do player
    this._bossHpLabel   = null;
    this._playerHpLabel = null;
    this._logLines      = [];     // Textos do log de batalha
    this._buttons       = [];
    this._playerTurn    = true;
    this._busy          = false;  // Bloqueia input durante animações
  }

  // ─────────────────────────────────────────────
  //  INICIALIZAÇÃO
  // ─────────────────────────────────────────────

  init(data) {
    this._bossName     = data.bossName     ?? "???";
    this._bossSprite   = data.bossSprite   ?? null;
    this._bossMaxHp    = data.bossMaxHp    ?? 100;
    this._bossHp       = data.bossHp       ?? this._bossMaxHp;

    this._playerName   = data.playerName   ?? "Você";
    this._playerSprite = data.playerSprite ?? null;
    this._playerMaxHp  = data.playerMaxHp  ?? 100;
    this._playerHp     = data.playerHp     ?? this._playerMaxHp;

    this._accessories  = data.accessories  ?? [];
    this._returnScene  = data.returnScene  ?? "QuartoPrincipal";

    this._playerTurn   = true;
    this._busy         = false;
    this._logLines     = [];
  }

  // ─────────────────────────────────────────────
  //  CREATE
  // ─────────────────────────────────────────────

  create() {
    const { width, height } = this.scale;

    this._buildBackground(width, height);
    this._buildBossArea(width, height);
    this._buildPlayerArea(width, height);
    this._buildBossHpBar(width, height);
    this._buildPlayerHpBar(width, height);
    this._buildButtons(width, height);
    this._buildLog(width, height);

    this._log(`${this._bossName} aparece!`);
    this._log("O que você vai fazer?");

    // Entrada com fade
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ─────────────────────────────────────────────
  //  FUNDO
  // ─────────────────────────────────────────────

  _buildBackground(w, h) {
    // Fundo geral
    this.add.rectangle(0, 0, w, h, COLOR.BG).setOrigin(0, 0).setDepth(-2);

    // Área de batalha central (70% da largura, 60% da altura)
    const aW = w * 0.70;
    const aH = h * 0.62;
    const ax  = w * 0.15;
    const ay  = h * 0.06;

    this.add.rectangle(ax, ay, aW, aH, COLOR.PANEL)
      .setOrigin(0, 0).setDepth(-1).setStrokeStyle(1, COLOR.BTN_BORDER);

    // Gradiente de "chão" dentro da arena
    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(0x0a0a12, 0.6);
    ground.fillRect(ax, ay + aH * 0.55, aW, aH * 0.45);

    this._arenaX = ax;
    this._arenaY = ay;
    this._arenaW = aW;
    this._arenaH = aH;
  }

  // ─────────────────────────────────────────────
  //  SPRITES
  // ─────────────────────────────────────────────

  _buildBossArea(w, h) {
    const bx = this._arenaX + w * 0.08;
    const by = this._arenaY + this._arenaH * 0.15;

    if (this._bossSprite && this.textures.exists(this._bossSprite)) {
      const spr = this.add.image(bx, by, this._bossSprite)
        .setOrigin(0, 0).setScale(1.4).setDepth(5);
      // Tween de "respiração" do boss
      this.tweens.add({
        targets: spr, y: by - 10, duration: 2000,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    } else {
      // Placeholder enquanto não há sprite
      const ph = this.add.rectangle(bx, by, 160, 200, 0x1e1e28).setOrigin(0, 0).setDepth(5);
      this.add.text(bx + 80, by + 100, "BOSS", {
        fontFamily: FONTS.MONO, fontSize: "14px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(6);
    }

    // Nome do boss
    this.add.text(this._arenaX + 20, this._arenaY + this._arenaH + 8, this._bossName, {
      fontFamily: FONTS.MONO, fontSize: "11px", color: COLOR.TEXT_DIM,
      letterSpacing: 3,
    }).setDepth(10);
  }

  _buildPlayerArea(w, h) {
    const px = this._arenaX + this._arenaW - w * 0.16;
    const py = this._arenaY + this._arenaH * 0.38;

    if (this._playerSprite && this.textures.exists(this._playerSprite)) {
      const spr = this.add.image(px, py, this._playerSprite)
        .setOrigin(0.5, 0).setScale(0.5).setDepth(5).setFlipX(true);
      this.tweens.add({
        targets: spr, y: py - 5, duration: 1600,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    } else {
      this.add.rectangle(px, py, 100, 160, 0x1e1e28).setOrigin(0.5, 0).setDepth(5);
      this.add.text(px, py + 80, "PLAYER", {
        fontFamily: FONTS.MONO, fontSize: "11px", color: COLOR.TEXT_DIM,
      }).setOrigin(0.5).setDepth(6);
    }
  }

  // ─────────────────────────────────────────────
  //  BARRAS DE HP
  // ─────────────────────────────────────────────

  _buildBossHpBar(w, h) {
    const barX = this._arenaX;
    const barY = this._arenaY - 42;
    const barW = this._arenaW;
    const barH = 22;

    // Fundo
    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(COLOR.BAR_BG, 1);
    bg.fillRect(barX, barY, barW, barH);
    bg.lineStyle(1, COLOR.BTN_BORDER, 0.8);
    bg.strokeRect(barX, barY, barW, barH);

    // Barra de HP
    this._bossBar = this.add.graphics().setDepth(11);
    this._bossBarMeta = { x: barX + 2, y: barY + 2, maxW: barW - 4, h: barH - 4 };
    this._redrawBar(this._bossBar, this._bossBarMeta, this._bossHp, this._bossMaxHp);

    // Label
    this._bossHpLabel = this.add.text(barX + barW / 2, barY + barH / 2,
      `${this._bossName}  ${this._bossHp} / ${this._bossMaxHp}`, {
        fontFamily: FONTS.MONO, fontSize: "11px", color: COLOR.TEXT_MAIN, letterSpacing: 2,
      }
    ).setOrigin(0.5).setDepth(12);
  }

  _buildPlayerHpBar(w, h) {
    const btnAreaTop = h * 0.80;
    const barW = w * 0.55;
    const barX = w * 0.15;
    const barY = btnAreaTop - 36;
    const barH = 22;

    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(COLOR.BAR_BG, 1);
    bg.fillRect(barX, barY, barW, barH);
    bg.lineStyle(1, COLOR.BTN_BORDER, 0.8);
    bg.strokeRect(barX, barY, barW, barH);

    this._playerBar = this.add.graphics().setDepth(11);
    this._playerBarMeta = { x: barX + 2, y: barY + 2, maxW: barW - 4, h: barH - 4 };
    this._redrawBar(this._playerBar, this._playerBarMeta, this._playerHp, this._playerMaxHp);

    this._playerHpLabel = this.add.text(barX + barW / 2, barY + barH / 2,
      `${this._playerName}  ${this._playerHp} / ${this._playerMaxHp}`, {
        fontFamily: FONTS.MONO, fontSize: "11px", color: COLOR.TEXT_MAIN, letterSpacing: 2,
      }
    ).setOrigin(0.5).setDepth(12);
  }

  _redrawBar(gfx, meta, current, max) {
    gfx.clear();
    const ratio = Math.max(0, current / max);
    const color = ratio > 0.5 ? COLOR.HP_GREEN : ratio > 0.25 ? COLOR.HP_YELLOW : COLOR.HP_RED;
    gfx.fillStyle(color, 1);
    gfx.fillRect(meta.x, meta.y, meta.maxW * ratio, meta.h);
  }

  _animBar(gfx, meta, fromHp, toHp, maxHp) {
    const obj  = { v: fromHp };
    this.tweens.add({
      targets: obj, v: toHp, duration: 400, ease: "Quad.easeOut",
      onUpdate: () => this._redrawBar(gfx, meta, obj.v, maxHp),
    });
  }

  // ─────────────────────────────────────────────
  //  BOTÕES DE AÇÃO
  // ─────────────────────────────────────────────

  _buildButtons(w, h) {
    const btnY    = h * 0.88;
    const btnH    = 52;
    const gap     = 18;

    const baseActions = [
      { label: "Ataque",  key: "attack",  color: 0x1a1010 },
      { label: "Defesa",  key: "defend",  color: 0x0e1218 },
      { label: "Cura",    key: "heal",    color: 0x0e1814 },
    ];

    const hasAcc = this._accessories.length > 0;
    const actions = hasAcc
      ? [...baseActions, { label: "Acessórios", key: "accessories", color: 0x141018 }]
      : baseActions;

    const totalBtns = actions.length;
    const totalW    = w * 0.70;
    const btnW      = (totalW - gap * (totalBtns - 1)) / totalBtns;
    const startX    = w * 0.15;

    actions.forEach(({ label, key, color }, i) => {
      const bx = startX + i * (btnW + gap);

      const bg = this.add.graphics().setDepth(20).setInteractive(
        new Phaser.Geom.Rectangle(bx, btnY - btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      );

      const drawBtn = (c) => {
        bg.clear();
        bg.fillStyle(c, 1);
        bg.fillRect(bx, btnY - btnH / 2, btnW, btnH);
        bg.lineStyle(1, COLOR.BTN_BORDER, 0.9);
        bg.strokeRect(bx, btnY - btnH / 2, btnW, btnH);
      };

      drawBtn(color);

      const txt = this.add.text(bx + btnW / 2, btnY, label, {
        fontFamily: FONTS.MONO, fontSize: "13px", color: COLOR.TEXT_MAIN, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(21);

      bg.on("pointerover",  () => { if (!this._busy) drawBtn(COLOR.BTN_HOVER); });
      bg.on("pointerout",   () => drawBtn(color));
      bg.on("pointerdown",  () => { if (!this._busy) drawBtn(COLOR.BTN_PRESS); });
      bg.on("pointerup",    () => {
        drawBtn(color);
        if (!this._busy && this._playerTurn) this._onActionPressed(key);
      });

      this._buttons.push({ bg, txt, drawBtn, color });
    });
  }

  _setButtonsEnabled(enabled) {
    this._buttons.forEach(b => {
      b.bg.input.enabled = enabled;
      b.txt.setAlpha(enabled ? 1 : 0.4);
    });
  }

  // ─────────────────────────────────────────────
  //  LOG DE MENSAGENS
  // ─────────────────────────────────────────────

  _buildLog(w, h) {
    const logX = w * 0.15;
    const logY = h * 0.69;
    const logW = w * 0.70;

    // Fundo do log
    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(COLOR.PANEL, 0.8);
    bg.fillRect(logX, logY, logW, 58);
    bg.lineStyle(1, COLOR.BTN_BORDER, 0.5);
    bg.strokeRect(logX, logY, logW, 58);

    this._logX = logX + 16;
    this._logY = logY + 10;
    this._logW = logW - 32;
  }

  _log(msg) {
    // Mantém no máximo 2 linhas
    if (this._logLines.length >= 2) {
      this._logLines[0].destroy();
      this._logLines.shift();
      this._logLines.forEach((t, i) => t.setY(this._logY + i * 20));
    }
    const t = this.add.text(this._logX, this._logY + this._logLines.length * 22, msg, {
      fontFamily: FONTS.MONO, fontSize: "13px", color: COLOR.TEXT_LOG,
      wordWrap: { width: this._logW },
    }).setDepth(15).setAlpha(0);

    this.tweens.add({ targets: t, alpha: 1, duration: 300 });
    this._logLines.push(t);
  }

  // ─────────────────────────────────────────────
  //  LÓGICA DE BATALHA
  // ─────────────────────────────────────────────

  _onActionPressed(key) {
    if (key === "accessories") {
      this._showAccessoryMenu();
      return;
    }
    this._executePlayerAction(key, null);
  }

  /**
   * Executa a ação do jogador.
   * Personalize os valores de dano/cura aqui conforme o design do jogo.
   */
  _executePlayerAction(key, accKey) {
    this._busy = true;
    this._setButtonsEnabled(false);

    let dmg = 0;
    let heal = 0;
    let msg  = "";

    switch (key) {
      case "attack":
        dmg = Phaser.Math.Between(10, 25);
        msg = `Você atacou! ${this._bossName} perdeu ${dmg} HP.`;
        break;
      case "defend":
        // Defesa: armazena flag — pode ser usada para reduzir dano no turno do boss
        this._defending = true;
        msg = "Você se preparou para defender!";
        break;
      case "heal":
        heal = Phaser.Math.Between(8, 18);
        msg = `Você se curou em ${heal} HP.`;
        break;
      case "item":
        // Item personalizado via accessories — expanda aqui
        msg = `Você usou ${accKey}.`;
        heal = 15;
        break;
    }

    // Aplica efeitos
    const prevBossHp = this._bossHp;
    const prevPlayerHp = this._playerHp;

    this._bossHp    = Math.max(0, this._bossHp - dmg);
    this._playerHp  = Math.min(this._playerMaxHp, this._playerHp + heal);

    this._animBar(this._bossBar,   this._bossBarMeta,   prevBossHp,   this._bossHp,   this._bossMaxHp);
    this._animBar(this._playerBar, this._playerBarMeta, prevPlayerHp, this._playerHp, this._playerMaxHp);

    this._bossHpLabel.setText(`${this._bossName}  ${Math.ceil(this._bossHp)} / ${this._bossMaxHp}`);
    this._playerHpLabel.setText(`${this._playerName}  ${Math.ceil(this._playerHp)} / ${this._playerMaxHp}`);

    this._log(msg);

    this.time.delayedCall(ANIM_DURATION + 100, () => {
      if (this._bossHp <= 0) {
        this._endBattle("win");
        return;
      }
      // Turno do boss
      this.time.delayedCall(500, () => this._bossTurn());
    });
  }

  /**
   * Lógica do turno do boss.
   * Personalize o comportamento (padrões de ataque, fases, etc.) aqui.
   */
  _bossTurn() {
    const baseDmg = Phaser.Math.Between(8, 20);
    const dmg     = this._defending ? Math.floor(baseDmg * 0.5) : baseDmg;
    this._defending = false;

    const prevHp = this._playerHp;
    this._playerHp = Math.max(0, this._playerHp - dmg);

    this._animBar(this._playerBar, this._playerBarMeta, prevHp, this._playerHp, this._playerMaxHp);
    this._playerHpLabel.setText(`${this._playerName}  ${Math.ceil(this._playerHp)} / ${this._playerMaxHp}`);

    this._log(`${this._bossName} atacou! Você perdeu ${dmg} HP.`);

    this.time.delayedCall(ANIM_DURATION + 200, () => {
      if (this._playerHp <= 0) {
        this._endBattle("lose");
        return;
      }
      this._busy = false;
      this._setButtonsEnabled(true);
      this._log("O que você vai fazer?");
    });
  }

  // ─────────────────────────────────────────────
  //  MENU DE ACESSÓRIOS
  // ─────────────────────────────────────────────

  _showAccessoryMenu() {
    const { width, height } = this.scale;
    const menuW = 280;
    const menuH = 40 + this._accessories.length * 44;
    const mx = width / 2 - menuW / 2;
    const my = height * 0.60 - menuH / 2;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
      .setDepth(30).setInteractive();

    const bg = this.add.graphics().setDepth(31);
    bg.fillStyle(COLOR.PANEL, 0.98);
    bg.fillRect(mx, my, menuW, menuH);
    bg.lineStyle(1, COLOR.BTN_BORDER);
    bg.strokeRect(mx, my, menuW, menuH);

    const closeMenu = () => {
      [overlay, bg, ...itemTexts, ...itemBgs].forEach(o => o.destroy());
    };
    overlay.on("pointerdown", closeMenu);

    const itemTexts = [];
    const itemBgs   = [];

    this._accessories.forEach(({ label, key }, i) => {
      const iy = my + 12 + i * 44;

      const ibg = this.add.graphics().setDepth(32).setInteractive(
        new Phaser.Geom.Rectangle(mx + 8, iy, menuW - 16, 36),
        Phaser.Geom.Rectangle.Contains,
      );
      const drawIbg = (c) => {
        ibg.clear();
        ibg.fillStyle(c, 1);
        ibg.fillRect(mx + 8, iy, menuW - 16, 36);
      };
      drawIbg(COLOR.BTN_IDLE);

      ibg.on("pointerover",  () => drawIbg(COLOR.BTN_HOVER));
      ibg.on("pointerout",   () => drawIbg(COLOR.BTN_IDLE));
      ibg.on("pointerup",    () => {
        closeMenu();
        this._executePlayerAction("item", key);
      });

      const it = this.add.text(mx + menuW / 2, iy + 18, label, {
        fontFamily: FONTS.MONO, fontSize: "13px", color: COLOR.TEXT_MAIN,
      }).setOrigin(0.5).setDepth(33);

      itemTexts.push(it);
      itemBgs.push(ibg);
    });
  }

  // ─────────────────────────────────────────────
  //  FIM DE BATALHA
  // ─────────────────────────────────────────────

  _endBattle(result) {
    this._setButtonsEnabled(false);
    const msg = result === "win" ? "Você venceu!" : "Você foi derrotado...";
    this._log(msg);

    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => {
        this.scene.start(this._returnScene);
      });
    });
  }
}