import Phaser from "phaser";
import Player from "../../global/Player.js";
import { setupControls, handleMovement } from "../../global/action.js";
import { LightCompanion } from "../../global/lightCompanion.js";
import { TutorialUI } from "../Tutorial/TutorialUI.js";

// ─────────────────────────────────────────────
//  Luzes ambiente
// ─────────────────────────────────────────────
const AMBIENT_LIGHTS = [
  [0.08, 0.85, 0xffffff, 0.25, 160],
  [0.22, 0.60, 0xffffff, 0.20, 140],
  [0.40, 0.75, 0xffffff, 0.22, 150],
  [0.55, 0.55, 0xffffff, 0.18, 130],
  [0.70, 0.80, 0xffffff, 0.25, 155],
  [0.85, 0.60, 0xffffff, 0.20, 145],
];

// ─────────────────────────────────────────────
//  Mobiliário
// ─────────────────────────────────────────────
const FURNITURE = [
  { type: "mesa",    xr: 0.28, yr: 1.0, w: 200, h: 80,  color: 0x16161e, anchoredToFloor: true },
  { type: "cadeira", xr: 0.18, yr: 1.0, w: 70,  h: 90,  color: 0x12121a, anchoredToFloor: true },
  { type: "estante", xr: 0.88, yr: 1.0, w: 100, h: 130, color: 0x14141c, anchoredToFloor: true },
];

// ─────────────────────────────────────────────
//  Fases
// ─────────────────────────────────────────────
const PHASE = {
  WALK:     "WALK",
  JUMP:     "JUMP",
  INTERACT: "INTERACT",
  REACH:    "REACH",
  UNLOCK:   "UNLOCK",
  COOP:     "COOP",
  DONE:     "DONE",
};

export class Tutorial extends Phaser.Scene {
  constructor() {
    super({ key: "Tutorial" });

    this.player           = null;
    this.companion        = null;
    this.tutorialUI       = null;
    this.isMultiplayer    = false;
    this.speed            = 400;

    this._phase           = PHASE.WALK;
    this._walkedRight     = false;
    this._hasJumped       = false;
    this._interactDone    = false;
    this._companionMarker = null;
    this._interactKey     = null;
    this._fogLayers       = [];

    this._paperObj        = null;
    this._paperPrompt     = null;
    this._paperOpen       = false;
    // BUG 1 FIX: lista de todos os objetos criados no overlay do papel
    // para garantir que todos são destruídos ao fechar.
    this._paperOverlayObjects = [];

    this._coopMovedEnough = false;
    this._coopMoveTimer   = 0;
    this._coopMoveTarget  = 6000;
  }

  // ─────────────────────────────────────────────
  init(data) {
    this.isMultiplayer    = data?.multiplayer || false;
    this._phase           = PHASE.WALK;
    this._walkedRight     = false;
    this._hasJumped       = false;
    this._interactDone    = false;
    this._paperOpen       = false;
    this._paperOverlayObjects = [];
    this._coopMovedEnough = false;
    this._coopMoveTimer   = 0;
  }

  // ─────────────────────────────────────────────
  preload() {
    Player.preload(this);
    LightCompanion.preload(this);
  }

  // ─────────────────────────────────────────────
  create() {
    const { width, height } = this.scale;

    this.lights.enable();
    this.lights.setAmbientColor(0x0a0a0e);

    this._buildRoom(width, height);
    this._createAmbientLights(width, height);
    this._createFog(width, height);

    this.cameras.main.setPostPipeline
      ? this._applyBWFilter()
      : void 0;

    // ── Player ────────────────────────────────
    Player.createAnimations(this);
    // BUG 6 FIX: player começa exatamente sobre o chão (floorY − metade da hitbox)
    const floorY   = height - 60;
    const hitboxH  = 720;          // mesmo valor de Player.js
    const spawnY   = floorY - (hitboxH * 0.5 * 0.5); // escala 0.5 aplicada no Player
    this.player = new Player(this, 130, spawnY);
    this.physics.add.collider(this.player, this._groundGroup);
    this.physics.add.collider(this.player, this._furnitureGroup);

    // ── Companion ────────────────────────────
    const companionX = width * 0.80;
    const companionY = height - 220;
    this.companion = new LightCompanion(this, companionX, companionY);

    // ── Controles ────────────────────────────
    this._interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    // BUG 1 FIX: _escKey centralizado aqui; não recriamos mais dentro do overlay
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    setupControls(this);

    // ── UI de tutorial ────────────────────────
    this.tutorialUI = new TutorialUI(this);
    this._companionMarker = this.tutorialUI.showWorldMarker(companionX, companionY, "???");

    // ── BUG 3 FIX: modo label no canto superior ESQUERDO,
    //    longe do botão de pausa (que fica centralizado no topo)
    const modeLabel = this.isMultiplayer
      ? "COOPERATIVO  ·  P1: WASD  ·  P2: SETAS"
      : "MODO SOLO";
    this.add.text(20, 16, modeLabel, {
      fontFamily: "'Courier Prime', monospace",
      fontSize:   "11px",
      color:      "#4a4a58",
    }).setOrigin(0, 0).setDepth(20); // origem no topo-esquerdo

    // ── Botão de pausa (HTML) ─────────────────
    const ui = window.GameUI;
    ui.buildPauseTrigger();
    ui.showPauseTrigger();

    ui.on("pause",        () => this._openPause());
    ui.on("resume",       () => this._closePause());
    ui.on("returnToMenu", () => this._returnToMenu());
    ui.on("muteToggle",   (m) => this._onMuteToggle(m));
    ui.on("volumeChange", (v) => this._onVolumeChange(v));

    // ESC → pausa (só quando o overlay de papel está fechado)
    this._escKey.on("down", () => {
      if (this._paperOpen) {
        // BUG 1 FIX: ESC fecha o papel quando ele está aberto
        this._closePaperOverlay();
      } else {
        this._openPause();
      }
    });

    // MELHORIA 1: spawna o papel logo ao criar a cena, não só na fase INTERACT.
    // Assim ele já está visível desde o início. A interação só é registrada
    // quando a fase INTERACT é ativada.
    this._spawnPaper();

    // ── Inicia tutorial ───────────────────────
    this._startPhase(PHASE.WALK);
  }

  // ─────────────────────────────────────────────
  //  PAUSA
  // ─────────────────────────────────────────────
  _openPause() {
    if (this._paused || this._paperOpen) return;
    this._paused = true;
    this.physics.pause();
    window.GameUI.showPause();
  }

  _closePause() {
    if (!this._paused) return;
    this._paused = false;
    this.physics.resume();
  }

  // MELHORIA 2: fade-in na música ao voltar ao menu.
  // A cena Menu.js toca a música de volta; aqui fazemos o fade-out da cena
  // e deixamos o menu.js fazer o fade-in. O único ajuste necessário é
  // garantir que a música do menu reinicie com volume 0 → fade.
  // (menu.js já lida com isso; veja a versão corrigida de menu.js)
  _returnToMenu() {
    this._paused = false;
    window.GameUI.hidePauseTrigger();

    // Limpa qualquer overlay de papel aberto antes de sair
    if (this._paperOpen) this._closePaperOverlayImmediate();

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.start("MainMenu");
    });
  }

  _onMuteToggle(muted) { this.sound.setMute(muted); }
  _onVolumeChange(v)   { this.sound.setVolume(v); }

  // ─────────────────────────────────────────────
  //  FILTRO PRETO E BRANCO
  // ─────────────────────────────────────────────
  _applyBWFilter() {
    try {
      this.cameras.main.setPostPipeline("ColorMatrix");
      const pipeline = this.cameras.main.getPostPipeline("ColorMatrix");
      if (pipeline?.grayscale) pipeline.grayscale(1);
    } catch (e) {
      const canvas = this.game.canvas;
      if (canvas) canvas.style.filter = saturate(0);
    }
  }

  // ─────────────────────────────────────────────
  //  CENÁRIO
  // ─────────────────────────────────────────────
  _buildRoom(width, height) {
    this._groundGroup    = this.physics.add.staticGroup();
    this._furnitureGroup = this.physics.add.staticGroup();

    const floorY = height - 60;

    this.add.rectangle(0, 0, width, height, 0x080810).setOrigin(0, 0).setDepth(-1);

    const floor = this.add.rectangle(width / 2, floorY + 60, width, 120, 0x0e0e12).setOrigin(0.5, 0.5);
    floor.setPipeline("Light2D");
    this.physics.add.existing(floor, true);
    this._groundGroup.add(floor);

    this.add.rectangle(0,          0, 14,    height, 0x0a0a0d).setOrigin(0, 0).setPipeline("Light2D");
    this.add.rectangle(width - 14, 0, 14,    height, 0x0a0a0d).setOrigin(0, 0).setPipeline("Light2D");
    this.add.rectangle(0,          0, width, 10,     0x0a0a0d).setOrigin(0, 0).setPipeline("Light2D");

    this.add.rectangle(0, floorY - 8, width, 8, 0x18181f).setOrigin(0, 0).setPipeline("Light2D");

    FURNITURE.forEach(({ xr, yr, w, h, color, anchoredToFloor }) => {
      const fx = width * xr;
      const fy = anchoredToFloor ? (floorY - h / 2) : (height * yr);
      const obj = this.add.rectangle(fx, fy, w, h, color).setOrigin(0.5, 0.5);
      obj.setPipeline("Light2D");
      this.physics.add.existing(obj, true);
      this._furnitureGroup.add(obj);

      const detail = this.add.graphics().setDepth(1);
      detail.lineStyle(1, 0x2a2a35, 0.8);
      detail.strokeRect(fx - w / 2 + 4, fy - h / 2 + 4, w - 8, h - 8);
    });

    this._buildDoorCrack(width * 0.95, floorY);
  }

  _buildDoorCrack(x, floorY) {
    const doorW = 90, doorH = 200;
    const door = this.add.rectangle(x, floorY - doorH / 2, doorW, doorH, 0x0c0c14)
      .setOrigin(0.5, 0.5).setDepth(1);
    door.setPipeline("Light2D");

    const crack = this.add.rectangle(x, floorY - 2, doorW - 10, 3, 0x3a3020, 0.7)
      .setOrigin(0.5, 0.5).setDepth(2);

    this.lights.addLight(x, floorY, 180, 0xffe0aa, 0.18);

    this.tweens.add({
      targets: crack,
      alpha: { from: 0.4, to: 0.9 },
      duration: 5000, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  _createAmbientLights(width, height) {
    AMBIENT_LIGHTS.forEach(([xr, yr, color, intensity, radius]) => {
      this.lights.addLight(width * xr, height * yr, radius, color, intensity);
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
      this._fogLayers.push({ obj: blob, baseX: fx, baseY: fy });
      this.tweens.add({
        targets: blob,
        x: fx + Phaser.Math.Between(-80, 80),
        alpha: alpha * 0.5,
        duration: Phaser.Math.Between(12000, 22000),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: i * 3000,
      });
    }
  }

  // ─────────────────────────────────────────────
  //  MÁQUINA DE ESTADOS
  // ─────────────────────────────────────────────
  _startPhase(phase) {
    this._phase = phase;

    switch (phase) {

      case PHASE.WALK:
        this.tutorialUI.setSteps([{
          keys: ["A", "D"],
          text: "Mova-se pelo cômodo",
          condition: () => this._walkedRight,
        }], () => this._startPhase(PHASE.JUMP));
        break;

      case PHASE.JUMP:
        this.tutorialUI.setSteps([{
          keys: ["W"],
          text: "Pule sobre os obstáculos",
          condition: () => this._hasJumped,
        }], () => this._startPhase(PHASE.INTERACT));
        break;

      case PHASE.INTERACT:
        // MELHORIA 1: papel já existe desde o create(); aqui só registramos
        // a dica de interação — não spawnamos de novo.
        this.tutorialUI.setSteps([{
          keys: ["E"],
          text: "Examine o papel no chão",
          condition: () => this._interactDone,
        }], () => this._startPhase(PHASE.REACH));
        break;

      case PHASE.REACH:
        this.tutorialUI.setSteps([{
          keys: ["D"],
          text: "Aproxime-se da fonte de luz",
          condition: () => this._isNearCompanion(),
        }], () => this._unlockCompanion());
        break;

      case PHASE.UNLOCK:
        break;

      case PHASE.COOP:
        this._coopMoveTimer   = 0;
        this._coopMovedEnough = false;
        this.tutorialUI.setSteps([{
          keys: ["↑", "↓", "←", "→"],
          text: "P2: Guie a luz pelo quarto — explore as sombras",
          condition: () => this._coopMovedEnough,
        }], () => this._startPhase(PHASE.DONE));
        break;

      case PHASE.DONE:
        this._finishTutorial();
        break;
    }
  }

  // ─────────────────────────────────────────────
  //  PAPEL INTERAGÍVEL
  //  BUG 1 FIX: todos os objetos rastreados em _paperOverlayObjects[]
  //  BUG 2 FIX: hitbox do player NÃO é reconfigurada por offset aqui —
  //             isso é responsabilidade de Player.js / action.js apenas.
  // ─────────────────────────────────────────────
  _spawnPaper() {
    const { width, height } = this.scale;
    const ix = width * 0.38;
    const iy = height - 85;

    const paperW = 48, paperH = 60;
    const paperGfx = this.add.graphics().setDepth(5);
    paperGfx.fillStyle(0xd8d4ce, 0.9);
    paperGfx.fillRect(ix - paperW / 2, iy - paperH, paperW, paperH);
    paperGfx.lineStyle(1, 0x9a9a8a, 0.4);
    for (let l = 0; l < 5; l++) {
      const ly = iy - paperH + 12 + l * 9;
      paperGfx.moveTo(ix - paperW / 2 + 6, ly);
      paperGfx.lineTo(ix + paperW / 2 - 6, ly);
    }
    paperGfx.strokePath();
    this._paperObj = paperGfx;

    const shadow = this.add.graphics().setDepth(4);
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillEllipse(ix, iy - 2, paperW + 6, 8);

    this._paperPrompt = this.add.text(ix, iy - paperH - 16, "[E]", {
      fontFamily: "'Courier Prime', monospace",
      fontSize:   "12px",
      color:      "#888888",
    }).setOrigin(0.5).setDepth(6);

    this.lights.addLight(ix, iy - paperH / 2, 90, 0xffffff, 0.4);

    this.tweens.add({
      targets: this._paperPrompt,
      alpha: { from: 0.3, to: 1 },
      duration: 900, yoyo: true, repeat: -1,
    });
  }

  _openPaperOverlay() {
    if (this._paperOpen) return;
    this._paperOpen = true;
    this.physics.pause();

    const { width, height } = this.scale;

    // ── Overlay escurecido ─────────────────────
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(50).setInteractive();
    this.tweens.add({ targets: overlay, alpha: 0.75, duration: 400 });

    // ── Papel ─────────────────────────────────
    const pW = Math.min(width * 0.7, 900);
    const pH = Math.min(height * 0.78, 680);
    const cx = width / 2;
    const cy = height / 2;

    const paperBg = this.add.graphics().setDepth(51);
    paperBg.fillStyle(0xd0ccc4, 1);
    paperBg.fillRect(cx - pW / 2, cy - pH / 2, pW, pH);
    paperBg.lineStyle(1, 0xa8a49e, 0.8);
    paperBg.strokeRect(cx - pW / 2, cy - pH / 2, pW, pH);
    const foldSize = 28;
    paperBg.fillStyle(0xb8b4ae, 1);
    paperBg.fillTriangle(
      cx + pW / 2 - foldSize, cy - pH / 2,
      cx + pW / 2,            cy - pH / 2,
      cx + pW / 2,            cy - pH / 2 + foldSize
    );
    paperBg.lineStyle(1, 0x9a9690, 0.6);
    paperBg.moveTo(cx + pW / 2 - foldSize, cy - pH / 2);
    paperBg.lineTo(cx + pW / 2,            cy - pH / 2 + foldSize);
    paperBg.strokePath();
    paperBg.lineStyle(1, 0xb8b4ae, 0.3);
    for (let row = 0; row < 20; row++) {
      const ly = cy - pH / 2 + 60 + row * 28;
      if (ly > cy + pH / 2 - 20) break;
      paperBg.moveTo(cx - pW / 2 + 40, ly);
      paperBg.lineTo(cx + pW / 2 - 40, ly);
    }
    paperBg.strokePath();

    // ── Texto ─────────────────────────────────
    const bodyText =
`— Você encontrou um fragmento. —


Historia...


As palavras estão desbotadas,
há gotas de água no papel.


[Trecho da história a definir]`;

    const bodyTxt = this.add.text(cx, cy - pH / 2 + 60, bodyText, {
      fontFamily: "'Cormorant Garamond', serif",
      fontSize:   "20px",
      color:      "#2a2820",
      lineSpacing: 10,
      wordWrap: { width: pW - 100 },
      align: "center",
    }).setOrigin(0.5, 0).setDepth(52);

    // ── Dica de fechar ─────────────────────────
    const closeHint = this.add.text(cx, cy + pH / 2 - 28, "[ E  ou  ESC  para fechar ]", {
      fontFamily: "'Courier Prime', monospace",
      fontSize:   "11px",
      color:      "#7a7a6a",
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(52);

    this.tweens.add({
      targets: closeHint,
      alpha: { from: 0.4, to: 1 },
      duration: 1200, yoyo: true, repeat: -1,
    });

    // Entrada
    paperBg.setAlpha(0);
    bodyTxt.setAlpha(0);
    closeHint.setAlpha(0);
    this.tweens.add({ targets: [paperBg, bodyTxt, closeHint], alpha: 1, duration: 400, ease: "Quart.easeOut" });

    // BUG 1 FIX: rastreia TODOS os objetos criados
    this._paperOverlayObjects = [overlay, paperBg, bodyTxt, closeHint];

    // BUG 1 FIX: função de fechar única, remove todos os listeners ao executar
    const closeFn = () => this._closePaperOverlay();

    // Delay para não fechar instantaneamente ao abrir
    this.time.delayedCall(300, () => {
      // BUG 1 FIX: usa once() para que o listener seja removido após o primeiro uso.
      // Registramos nos objetos de teclado centrais (criados no create()),
      // não em novas instâncias — assim não há conflito com o ESC de pausa.
      this._interactKey.once("down", closeFn);
      this._escKey.once("down", closeFn);
      overlay.on("pointerdown", closeFn);
    });
  }

  _closePaperOverlay() {
    if (!this._paperOpen) return;
    // BUG 1 FIX: remove listener do ESC imediatamente para evitar
    // que o próximo keydown de ESC feche algo que já foi fechado
    this._escKey.off("down");      // remove todos (será re-registrado abaixo)
    this._interactKey.off("down"); // idem

    const objects = [...this._paperOverlayObjects];
    this._paperOverlayObjects = [];

    this.tweens.add({
      targets: objects,
      alpha: 0,
      duration: 350,
      ease: "Quad.easeIn",
      onComplete: () => {
        objects.forEach(t => { try { t?.destroy(); } catch (_) {} });
        this._paperOpen = false;
        this.physics.resume();
        this._interactDone = true;

        // Destroi o objeto do papel e prompt do mundo
        if (this._paperObj)    { this._paperObj.destroy();    this._paperObj = null; }
        if (this._paperPrompt) { this._paperPrompt.destroy(); this._paperPrompt = null; }

        // BUG 1 FIX: re-registra o listener de ESC → pausa após fechar o papel
        this._escKey.on("down", () => {
          if (this._paperOpen) {
            this._closePaperOverlay();
          } else {
            this._openPause();
          }
        });
      },
    });
  }

  // Fecha imediatamente sem animação (usado ao sair para o menu)
  _closePaperOverlayImmediate() {
    this._paperOverlayObjects.forEach(t => { try { t?.destroy(); } catch (_) {} });
    this._paperOverlayObjects = [];
    this._paperOpen = false;
  }

  // ─────────────────────────────────────────────
  _isNearCompanion() {
    if (!this.player || !this.companion) return false;
    return Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.companion.x, this.companion.y
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
        targets: this._companionMarker,
        alpha: 0, duration: 400,
        onComplete: () => this._companionMarker.destroy(),
      });
    }

    const msg = this.tutorialUI.showMessage("✦  Uma luz acende no escuro  ✦", 0);
    this.companion.unlock();

    this.time.delayedCall(1400, () => {
      this.tweens.add({ targets: msg, alpha: 0, duration: 500, onComplete: () => msg.destroy() });
      const nextPhase = this.isMultiplayer ? PHASE.COOP : PHASE.DONE;
      this.time.delayedCall(400, () => this._startPhase(nextPhase));
    });
  }

  _finishTutorial() {
    const msg = this.tutorialUI.showMessage("Você não está sozinho.", 0);
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(1200, 0, 0, 0);
      this.time.delayedCall(1200, () => {
        msg.destroy();
        // this.scene.start("Game");
      });
    });
  }

  // ─────────────────────────────────────────────
  //  UPDATE
  // ─────────────────────────────────────────────
  update(time, delta) {
    if (this._paused) return;

    // BUG 2 FIX: handleMovement já cuida de toda a lógica de offset da hitbox.
    // Não mexemos em body.setOffset em nenhum outro lugar desta cena.
    handleMovement(this);

    if (this._phase === PHASE.WALK && this.keys?.D?.isDown) {
      this._walkedRight = true;
    }

    if (this._phase === PHASE.JUMP && this.keys?.W?.isDown) {
      if (this.player?.body?.velocity.y < -80) this._hasJumped = true;
    }

    // Interagir com o papel
    if (!this._paperOpen && this._phase === PHASE.INTERACT &&
        Phaser.Input.Keyboard.JustDown(this._interactKey)) {
      const { width, height } = this.scale;
      const dist = Phaser.Math.Distance.Between(
        this.player?.x ?? 0, this.player?.y ?? 0,
        width * 0.38, height - 100
      );
      if (dist < 220) this._openPaperOverlay();
    }

    if (this.tutorialUI) this.tutorialUI.update();

    if (this.companion?.isUnlocked) {
      if (this.isMultiplayer) {
        this.companion.updateCoop(this.cursors);
      } else {
        this.companion.updateAI(this.player);
      }
    }

    if (this._phase === PHASE.COOP && !this._coopMovedEnough) {
      if (this._p2Moving()) {
        this._coopMoveTimer += delta;
        if (this._coopMoveTimer >= this._coopMoveTarget) {
          this._coopMovedEnough = true;
        }
      }
    }
  }
}