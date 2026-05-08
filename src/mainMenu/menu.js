import Phaser from "phaser";

export class Menu extends Phaser.Scene {

  constructor() {
    super({ key: "MainMenu" });
    this._music    = null;
    this._maxVolume = 0.5;
  }

  preload() {
    this.load.audio("menuMusic", "sounds/Soundtrack.mp3");

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 12);
    g.generateTexture("spark", 2, 12);
  }

  create() {
    const { width, height } = this.scale;
    const ui = this.registry.get("ui");

    this._startMusic();
    this._createParticles(width, height);

    ui.showMenu();
    ui.hidePauseTrigger();
    ui.setGameMode("");

    ui.addEventListener("menuAction",   (e) => this._onMenuAction(e.detail));
    ui.addEventListener("muteToggle",   (e) => this._onMuteToggle(e.detail));
    ui.addEventListener("volumeChange", (e) => this._onVolumeChange(e.detail));
  }

  // ─────────────────────────────────────────────
  //  MÚSICA
  // ─────────────────────────────────────────────

  _startMusic() {
    const existing = this.sound.get("menuMusic");

    if (!existing) {
      this._music = this.sound.add("menuMusic", { loop: true, volume: 0 });
      this._music.play();
    } else {
      this._music = existing;
      if (this._music.isPaused) {
        this._music.resume();
      } else if (!this._music.isPlaying) {
        this._music.play();
      }
      this._music.setVolume(0);
    }

    this.tweens.add({
      targets:  this._music,
      volume:   this._maxVolume,
      duration: 2000,
    });
  }

  _fadeOutMusic(onComplete) {
    if (this._music?.isPlaying) {
      this.tweens.add({
        targets:    this._music,
        volume:     0,
        duration:   500,
        onComplete,
      });
    } else {
      onComplete();
    }
  }

  // ─────────────────────────────────────────────
  //  PARTÍCULAS
  // ─────────────────────────────────────────────

  _createParticles(width, height) {
    this.add.particles(0, 0, "spark", {
      emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, width, height) },
      scaleX:   0.5,
      scaleY:   0.5,
      speedY:   { min: -30, max: -180 },
      speedX:   { min: -30, max: -180 },
      lifespan: { min: 1500, max: 5000 },
      alpha:    { start: 0.7, end: 0 },
      tint:     [0xffffff, 0xd0d0d0, 0xe8e4de, 0xb0b0b8],
      frequency: 25,
      blendMode: "ADD",
    });
  }

  // ─────────────────────────────────────────────
  //  AÇÕES DE MENU
  // ─────────────────────────────────────────────

  _onMenuAction(action) {
    if (action === "ranking") {
      this.scene.launch("Ranking");
      return;
    }

    if (action === "options") {
      console.log("Configurações em breve");
      return;
    }

    const sceneMap = {
      singleplayer: { key: "Tutorial", data: { multiplayer: false } },
      multiplayer:  { key: "Tutorial", data: { multiplayer: true  } },
    };

    const target = sceneMap[action];
    if (!target) return;

    this.registry.get("ui").hideMenu();

    this._fadeOutMusic(() => {
      this.scene.start(target.key, target.data);
    });
  }

  _onMuteToggle(muted) {
    if (!this._music) return;
    this.tweens.killTweensOf(this._music);

    if (muted) {
      this.tweens.add({
        targets:    this._music,
        volume:     0,
        duration:   1000,
        onComplete: () => {
          if (this.registry.get("ui").isMuted) this._music.pause();
        },
      });
    } else {
      if (this._music.isPaused) this._music.resume();
      if (!this._music.isPlaying) this._music.play();
      this.tweens.add({
        targets:  this._music,
        volume:   this._maxVolume,
        duration: 1000,
      });
    }
  }

  _onVolumeChange(v) {
    this._maxVolume = v;
    if (this._music && !this.registry.get("ui").isMuted) {
      this._music.setVolume(v);
    }
  }
}