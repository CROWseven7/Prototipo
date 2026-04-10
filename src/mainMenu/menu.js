import Phaser from "phaser";

export class Menu extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenu" });

    this.backgroundMusic = null;

    this.maxVolume = 0.5;
  }

  preload() {
    this.load.audio("menuMusic", "sounds/Soundtrack.ogg");

    let graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(0xffffff, 1);

    graphics.fillRect(0, 0, 2, 12);

    graphics.generateTexture("spark", 2, 12);
  }

  create() {
    const { width, height } = this.scale;

    if (!this.sound.get("menuMusic")) {
      this.backgroundMusic = this.sound.add("menuMusic", {
        loop: true,

        volume: 0,
      });

      this.backgroundMusic.play();

      this.tweens.add({
        targets: this.backgroundMusic,

        volume: this.maxVolume,

        duration: 2000,
      });
    } else {
      this.backgroundMusic = this.sound.get("menuMusic");
    }

    this.add.particles(0, 0, "spark", {
      emitZone: {
        type: "random",

        source: new Phaser.Geom.Rectangle(0, 0, width, height),
      },

      scaleX: 0.5,

      scaleY: 0.5,

      speedY: { min: -50, max: -250 },

      speedX: { min: -50, max: -250 },

      lifespan: { min: 1000, max: 4000 },

      alpha: { start: 1, end: 0 },

      tint: [0x00ffff, 0x0088ff],

      frequency: 20,

      blendMode: "ADD",
    });

    this.renderMainMenuUI();

    this.setupMenuButtons();

    this.setupGlobalButtons();
  }

  renderMainMenuUI() {
    const menuUI = document.getElementById("main-menu-ui");

    if (!menuUI) return;

    menuUI.innerHTML = `

      <h1 class="text-6xl font-thin text-cyan-100 tracking-[1.5rem] mb-20 opacity-80 uppercase italic">

        SEM NOME

      </h1>



      <nav class="flex flex-col gap-6 pointer-events-auto">

        <button class="menu-btn">Single Player</button>

        <button class="menu-btn">Multiplayer Coop</button>

        <button class="menu-btn">Ranking</button>

        <button class="menu-btn">Opções</button>

      </nav>

    `;
  }

  setupGlobalButtons() {
    const muteBtn = document.getElementById("mute-btn");

    const fullscreenBtn = document.getElementById("fullscreen-btn");

    const appContainer = document.getElementById("app");

    if (!muteBtn) return;

    muteBtn.dataset.muted = "false";

    muteBtn.style.opacity = "1";

    muteBtn.onclick = (e) => {
      e.preventDefault();

      e.stopPropagation();

      if (this.sound.context.state === "suspended") {
        this.sound.context.resume();
      }

      const isCurrentlyMuted = muteBtn.dataset.muted === "true";

      const nextMuteState = !isCurrentlyMuted;

      muteBtn.dataset.muted = nextMuteState.toString();

      muteBtn.style.setProperty(
        "opacity",

        nextMuteState ? "0.3" : "1",

        "important",
      );

      if (this.backgroundMusic) {
        this.tweens.killTweensOf(this.backgroundMusic);

        if (nextMuteState) {
          this.tweens.add({
            targets: this.backgroundMusic,

            volume: 0,

            duration: 1000,

            onComplete: () => {
              if (muteBtn.dataset.muted === "true")
                this.backgroundMusic.pause();
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
    };

    fullscreenBtn.onclick = (e) => {
      e.preventDefault();

      if (!document.fullscreenElement) {
        appContainer.requestFullscreen();

        fullscreenBtn.style.opacity = "0.3";
      } else {
        document.exitFullscreen();

        fullscreenBtn.style.opacity = "1";
      }
    };
  }

  setupMenuButtons() {
    const menuButtons = document.querySelectorAll("#main-menu-ui .menu-btn");
    const menuUI = document.getElementById("main-menu-ui");

    menuButtons.forEach((btn) => {
      btn.onclick = () => {
        const buttonText = btn.innerText.toLowerCase();

        let sceneKey = "";
        let sceneData = {};

        if (buttonText === "single player") {
          sceneKey = "Tutorial";
          sceneData = { multiplayer: false };
        } else if (buttonText === "multiplayer coop") {
          sceneKey = "Tutorial";
          sceneData = { multiplayer: true };
        } else if (buttonText === "ranking") {
          sceneKey = "Ranking";
        }

        if (sceneKey !== "") {
          if (menuUI) menuUI.style.display = "none";

          if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.tweens.add({
              targets: this.backgroundMusic,
              volume: 0,
              duration: 500,
              onComplete: () => {
                this.scene.start(sceneKey, sceneData);
              },
            });
          } else {
            this.scene.start(sceneKey, sceneData);
          }
        } else if (buttonText === "opções") {
          console.log("Configurações em breve");
        }
      };
    });
  }
}
