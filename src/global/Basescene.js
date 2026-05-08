import Phaser from "phaser";
import Player from "./Player.js";
import { setupControls, handleMovement } from "./Action.js";
import { LightCompanion } from "./LightCompanion.js";
import { PLAYER, PHYSICS, COMPANION, PALETTE, FONTS } from "./constants.js";

/**
 * BaseScene — classe mãe para todas as cenas de sala.
 *
 * Responsabilidades desta classe:
 *   - Criar player, companion, física, luzes, pausa
 *   - Gerenciar transições de/para o menu
 *   - Ouvir eventos do GameUI de forma padronizada
 *
 * Responsabilidades das subclasses:
 *   - _buildRoom(width, height)   → geometria e cenário da sala
 *   - _getSpawnX(width)           → posição X inicial do player
 *   - (opcional) _onRoomReady()   → lógica extra após create()
 *   - (opcional) _onUpdate(time, delta) → update específico da sala
 */
export class BaseScene extends Phaser.Scene {

  constructor(key) {
    super({ key });
    this.player        = null;
    this.companion     = null;
    this.speed         = PLAYER.SPEED;
    this.isMultiplayer = false;
    this._paused       = false;
    this._groundGroup  = null;
  }

  // ─────────────────────────────────────────────
  //  CICLO DE VIDA PHASER
  // ─────────────────────────────────────────────

  init(data) {
    this.isMultiplayer = data?.multiplayer ?? false;
    this._paused       = false;
    this._onInit(data);
  }

  preload() {
    Player.preload(this);
    LightCompanion.preload(this);
    this._onPreload();
  }

  create() {
    const { width, height } = this.scale;

    this.lights.enable();
    this.lights.setAmbientColor(PALETTE.INK);

    this._groundGroup    = this.physics.add.staticGroup();
    this._furnitureGroup = this.physics.add.staticGroup();

    // Subclasse constrói o cenário e popula _groundGroup / _furnitureGroup
    this._buildRoom(width, height);

    this._applyBWFilter();

    // Player
    Player.createAnimations(this);
    const floorY = height - PHYSICS.FLOOR_OFFSET;
    this.player  = new Player(this, this._getSpawnX(width), PLAYER.spawnY(floorY));
    this.physics.add.collider(this.player, this._groundGroup);
    this.physics.add.collider(this.player, this._furnitureGroup);

    // Companion
    const companionX = width * 0.80;
    const companionY = height - COMPANION.FOLLOW_OFFSET_Y * 2;
    this.companion   = new LightCompanion(this, companionX, companionY);

    // Controles
    setupControls(this);

    // UI e pausa
    this._wirePause();
    this._showModeLabel(width);

    this._onRoomReady();
  }

  update(time, delta) {
    if (this._paused) return;
    handleMovement(this);

    if (this.companion?.isUnlocked) {
      if (this.isMultiplayer) {
        this.companion.updateCoop(this.cursors);
      } else {
        this.companion.updateAI(this.player);
      }
    }

    this._onUpdate(time, delta);
  }

  // ─────────────────────────────────────────────
  //  HOOKS para subclasses (sobrescreva conforme precisar)
  // ─────────────────────────────────────────────

  _onInit(_data)          {}
  _onPreload()            {}
  _onRoomReady()          {}
  _onUpdate(_time, _delta) {}

  /** Deve ser sobrescrito: posição X inicial do player */
  _getSpawnX(_width) { return 130; }

  /** Deve ser sobrescrito: constrói o cenário e popula _groundGroup/_furnitureGroup */
  _buildRoom(_width, _height) {}

  // ─────────────────────────────────────────────
  //  PAUSA
  // ─────────────────────────────────────────────

  _wirePause() {
    const ui = this.registry.get("ui");

    ui.addEventListener("pause",        () => this._openPause());
    ui.addEventListener("resume",       () => this._closePause());
    ui.addEventListener("returnToMenu", () => this._returnToMenu());
    ui.addEventListener("muteToggle",   (e) => this.sound.setMute(e.detail));
    ui.addEventListener("volumeChange", (e) => this.sound.setVolume(e.detail));

    ui.buildPauseTrigger();
    ui.showPauseTrigger();

    const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on("down", () => {
      if (!this._paused) this._openPause();
    });
  }

  _openPause() {
    if (this._paused) return;
    this._paused = true;
    this.physics.pause();
    this.registry.get("ui").showPause();
  }

  _closePause() {
    if (!this._paused) return;
    this._paused = false;
    this.physics.resume();
  }

  _returnToMenu() {
    this._paused = false;
    const ui = this.registry.get("ui");
    ui.hidePauseTrigger();
    ui.hidePause();

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(600, () => this.scene.start("MainMenu"));
  }

  // ─────────────────────────────────────────────
  //  UTILITÁRIOS
  // ─────────────────────────────────────────────

  _applyBWFilter() {
    try {
      this.cameras.main.setPostPipeline("ColorMatrix");
      const pipeline = this.cameras.main.getPostPipeline("ColorMatrix");
      if (pipeline?.grayscale) pipeline.grayscale(1);
    } catch {
      const canvas = this.game.canvas;
      if (canvas) canvas.style.filter = "saturate(0)";
    }
  }

  _showModeLabel(width) {
    const label = this.isMultiplayer
      ? "COOPERATIVO  ·  P1: WASD  ·  P2: SETAS"
      : "MODO SOLO";

    this.add.text(20, 16, label, {
      fontFamily: FONTS.MONO,
      fontSize:   "11px",
      color:      "#4a4a58",
    }).setOrigin(0, 0).setDepth(20);
  }

  /** Cria um chão estático padrão. Salas com geometria diferente sobrescrevem _buildRoom. */
  _createFloor(width, height) {
    const floorY  = height - PHYSICS.FLOOR_OFFSET;
    const floorBg = this.add
      .rectangle(width / 2, floorY + PHYSICS.FLOOR_HEIGHT / 2, width, PHYSICS.FLOOR_HEIGHT, PALETTE.ASH)
      .setOrigin(0.5, 0.5);
    floorBg.setPipeline("Light2D");
    this.physics.add.existing(floorBg, true);
    this._groundGroup.add(floorBg);
    return floorY;
  }
}