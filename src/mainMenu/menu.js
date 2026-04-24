import Phaser from "phaser";

export class Menu extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenu" });
    this.backgroundMusic = null;
    this.maxVolume = 0.5;
  }

  preload() {
    this.load.audio("menuMusic", "sounds/Soundtrack.mp3");

    // Textura de partícula: retângulo branco simples
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 2, 12);
    graphics.generateTexture("spark", 2, 12);
  }

  create() {
    const { width, height } = this.scale;
    const ui = window.GameUI;

    // ── Música (Bug 2) ────────────────────────────────────
    // Ao voltar do jogo, o som pode estar pausado ou sem volume.
    // Sempre garantimos que toca com fade-in.
    const existing = this.sound.get("menuMusic");
    if (!existing) {
      this.backgroundMusic = this.sound.add("menuMusic", { loop: true, volume: 0 });
      this.backgroundMusic.play();
    } else {
      this.backgroundMusic = existing;
      // Bug 2: se estava pausado (voltou do jogo), retoma
      if (this.backgroundMusic.isPaused) {
        this.backgroundMusic.resume();
      } else if (!this.backgroundMusic.isPlaying) {
        this.backgroundMusic.play();
      }
      // Garante volume 0 antes do fade
      this.backgroundMusic.setVolume(0);
    }
    this.tweens.add({
      targets: this.backgroundMusic,
      volume: this.maxVolume,
      duration: 2000,
    });

    // ── Partículas brancas/cinzas (Melhoria 1) ───────────
    // Substituímos os tints cyan por tons de branco/cinza
    this.add.particles(0, 0, "spark", {
      emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, width, height) },
      scaleX: 0.5, scaleY: 0.5,
      speedY: { min: -30, max: -180 },
      speedX: { min: -30, max: -180 },
      lifespan: { min: 1500, max: 5000 },
      alpha: { start: 0.7, end: 0 },
      // Tons de branco, cinza claro, branco quente — sem ciano
      tint: [0xffffff, 0xd0d0d0, 0xe8e4de, 0xb0b0b8],
      frequency: 25,
      blendMode: "ADD",
    });

    // ── Remove filtro de saturação (caso venha do jogo) ──
    ui.removeDesaturation();

    // ── UI ───────────────────────────────────────────────
    ui.hidePauseTrigger();
    ui.showMenu();

    // Remove label de modo de jogo
    ui.setGameMode("");

    // ── Eventos ───────────────────────────────────────────
    // Limpa listeners anteriores para evitar duplicatas
    ui.on("menuAction",    (action) => this._onMenuAction(action));
    ui.on("muteToggle",    (muted)  => this._onMuteToggle(muted));
    ui.on("volumeChange",  (v)      => this._onVolumeChange(v));
  }

  _onMenuAction(action) {
    let sceneKey  = "";
    let sceneData = {};

    if      (action === "singleplayer") { sceneKey = "Tutorial"; sceneData = { multiplayer: false }; }
    else if (action === "multiplayer")  { sceneKey = "Tutorial"; sceneData = { multiplayer: true };  }
    else if (action === "ranking")      { sceneKey = "Ranking"; }
    else if (action === "options")      { console.log("Configurações em breve"); return; }

    if (!sceneKey) return;

    window.GameUI.hideMenu();

    const go = () => this.scene.start(sceneKey, sceneData);

    if (this.backgroundMusic?.isPlaying) {
      this.tweens.add({
        targets: this.backgroundMusic,
        volume: 0,
        duration: 500,
        onComplete: go,
      });
    } else {
      go();
    }
  }

  _onMuteToggle(muted) {
    if (!this.backgroundMusic) return;
    this.tweens.killTweensOf(this.backgroundMusic);
    if (muted) {
      this.tweens.add({
        targets: this.backgroundMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          if (window.GameUI.isMuted) this.backgroundMusic.pause();
        },
      });
    } else {
      if (this.backgroundMusic.isPaused) this.backgroundMusic.resume();
      if (!this.backgroundMusic.isPlaying) this.backgroundMusic.play();
      this.tweens.add({
        targets: this.backgroundMusic,
        volume: this.maxVolume,
        duration: 1000,
      });
    }
  }

  _onVolumeChange(v) {
    this.maxVolume = v;
    if (this.backgroundMusic && !window.GameUI.isMuted) {
      this.backgroundMusic.setVolume(v);
    }
  }
}