/**
 * GameUI — módulo central de overlays HTML.
 *
 * Estende EventTarget nativo para suportar múltiplos listeners por evento.
 * Não injeta CSS duplicado — todos os estilos vivem em style.css.
 * Registrado em Phaser via scene.registry: scene.registry.get("ui").
 *
 * Eventos emitidos:
 *   "pause"        → usuário clicou em pausar
 *   "resume"       → usuário clicou em continuar
 *   "returnToMenu" → usuário clicou em voltar ao menu
 *   "menuAction"   → { detail: "singleplayer" | "multiplayer" | "ranking" | "options" }
 *   "muteToggle"   → { detail: boolean (isMuted) }
 *   "volumeChange" → { detail: number (0..1) }
 */
export class GameUI extends EventTarget {

  constructor() {
    super();
    this._isMuted     = false;
    this._musicVolume = 0.5;
    this._menuEl      = null;
    this._pauseEl     = null;
    this._hintTimeout     = null;
    this._progressTimeout = null;

    this._buildMainMenu();
    this._buildPauseMenu();
    this._buildGameModeLabel();
    this._buildHintBar();
    this._buildProgressLabel();
  }

  // ─────────────────────────────────────────────
  //  API PÚBLICA
  // ─────────────────────────────────────────────

  showMenu() {
    this._pauseEl?.style.setProperty("display", "none");
    if (this._menuEl) {
      this._menuEl.style.display = "flex";
      requestAnimationFrame(() => (this._menuEl.style.opacity = "1"));
    }
    this._setGameModeLabel("");
  }

  hideMenu() {
    if (!this._menuEl) return;
    this._menuEl.style.opacity = "0";
    setTimeout(() => (this._menuEl.style.display = "none"), 1200);
  }

  showPause() {
    if (!this._pauseEl) return;
    this._pauseEl.style.display = "flex";
    requestAnimationFrame(() => (this._pauseEl.style.opacity = "1"));
    const slider = this._pauseEl.querySelector("#pause-volume-slider");
    if (slider) {
      slider.value = Math.round(this._musicVolume * 100);
      this._updateSliderFill(slider);
    }
  }

  hidePause() {
    if (!this._pauseEl) return;
    this._pauseEl.style.opacity = "0";
    setTimeout(() => (this._pauseEl.style.display = "none"), 400);
  }

  setGameMode(mode) {
    const labels = { singleplayer: "Solo", multiplayer: "Co-op" };
    this._setGameModeLabel(labels[mode] ?? "");
  }

  setVolume(v) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    const slider = this._pauseEl?.querySelector("#pause-volume-slider");
    if (slider) {
      slider.value = Math.round(this._musicVolume * 100);
      this._updateSliderFill(slider);
    }
  }

  get isMuted() { return this._isMuted; }

  showHint(text, duration = 4000) {
    const el = document.getElementById("game-hint-bar");
    if (!el) return;
    clearTimeout(this._hintTimeout);
    el.style.opacity = "0";
    setTimeout(() => {
      el.querySelector(".hint-text").textContent = text;
      el.style.display = "flex";
      requestAnimationFrame(() => (el.style.opacity = "1"));
    }, 200);
    if (duration > 0) {
      this._hintTimeout = setTimeout(() => this.hideHint(), duration);
    }
  }

  hideHint() {
    const el = document.getElementById("game-hint-bar");
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => (el.style.display = "none"), 300);
  }

  showProgress(text, duration = 3500) {
    const el = document.getElementById("game-progress-label");
    if (!el) return;
    clearTimeout(this._progressTimeout);
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent  = text;
      el.style.display = "block";
      requestAnimationFrame(() => (el.style.opacity = "1"));
    }, 200);
    if (duration > 0) {
      this._progressTimeout = setTimeout(() => this.hideProgress(), duration);
    }
  }

  hideProgress() {
    const el = document.getElementById("game-progress-label");
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => (el.style.display = "none"), 300);
  }

  buildPauseTrigger() {
    if (document.getElementById("pause-trigger-btn")) {
      this.showPauseTrigger();
      return;
    }
    const btn = document.createElement("button");
    btn.id = "pause-trigger-btn";
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5"  y="4" width="4" height="16" rx="1"/>
        <rect x="15" y="4" width="4" height="16" rx="1"/>
      </svg>`;
    btn.addEventListener("click", () => this.dispatchEvent(new Event("pause")));
    document.getElementById("app").appendChild(btn);
  }

  hidePauseTrigger() {
    const btn = document.getElementById("pause-trigger-btn");
    if (btn) btn.style.display = "none";
  }

  showPauseTrigger() {
    const btn = document.getElementById("pause-trigger-btn");
    if (btn) btn.style.display = "block";
  }

  // ─────────────────────────────────────────────
  //  BUILDERS
  // ─────────────────────────────────────────────

  _buildMainMenu() {
    const el = document.createElement("div");
    el.id = "main-menu-ui";
    el.innerHTML = `
      <div class="menu-grain" aria-hidden="true"></div>
      <div class="menu-vignette" aria-hidden="true"></div>
      <div class="menu-title-block">
        <h1 class="menu-title">
          FRAGMENTOS<br><span class="menu-subtitle">DO LAR</span>
        </h1>
        <div class="menu-divider"></div>
      </div>
      <nav id="menu-nav" aria-label="Menu principal">
        <button class="menu-btn" data-action="singleplayer">Jogar Solo</button>
        <button class="menu-btn" data-action="multiplayer">Modo Cooperativo</button>
        <button class="menu-btn" data-action="ranking">Registros</button>
        <button class="menu-btn" data-action="options">Opções</button>
      </nav>
      <div class="menu-bottom-bar">
        <span class="menu-version">v0.2.5 — DEMO</span>
        <div class="menu-icon-group">
          <button id="menu-fullscreen-btn" class="icon-btn" title="Tela cheia" aria-label="Alternar tela cheia">
            <svg id="menu-fs-expand"   xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            <svg id="menu-fs-compress" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/></svg>
          </button>
          <button id="menu-mute-btn" class="icon-btn" title="Mudo/Som" aria-label="Alternar som">
            <svg id="menu-sound-on"  xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            <svg id="menu-sound-off" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
          </button>
        </div>
      </div>`;

    document.getElementById("app").appendChild(el);
    this._menuEl = el;
    this._wireMenuButtons(el);
  }

  _buildPauseMenu() {
    const el = document.createElement("div");
    el.id = "pause-menu-ui";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Menu de pausa");
    el.innerHTML = `
      <div class="pause-inner">
        <div class="pause-header">
          <span class="pause-title">PAUSA</span>
          <div class="pause-divider"></div>
        </div>
        <div class="pause-volume-row">
          <span class="pause-volume-label">VOLUME</span>
          <input id="pause-volume-slider" type="range" min="0" max="100" value="50" aria-label="Volume da música">
          <button id="pause-mute-btn" class="icon-btn" aria-label="Mudo">
            <svg id="pause-sound-on"  xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            <svg id="pause-sound-off" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
          </button>
        </div>
        <div class="pause-separator"></div>
        <div class="pause-actions">
          <button class="menu-btn" id="pause-resume-btn">Continuar</button>
          <div class="pause-separator"></div>
          <button class="menu-btn menu-btn--danger" id="pause-mainmenu-btn">Voltar ao Menu</button>
        </div>
      </div>`;

    document.getElementById("app").appendChild(el);
    this._pauseEl = el;
    this._wirePauseButtons(el);
  }

  _buildGameModeLabel() {
    if (document.getElementById("game-mode-label")) return;
    const el = document.createElement("div");
    el.id = "game-mode-label";
    document.getElementById("app").appendChild(el);
  }

  _buildHintBar() {
    if (document.getElementById("game-hint-bar")) return;
    const el = document.createElement("div");
    el.id = "game-hint-bar";
    el.innerHTML = `<span class="hint-icon">Dica</span><span class="hint-text"></span>`;
    document.getElementById("app").appendChild(el);
  }

  _buildProgressLabel() {
    if (document.getElementById("game-progress-label")) return;
    const el = document.createElement("div");
    el.id = "game-progress-label";
    document.getElementById("app").appendChild(el);
  }

  // ─────────────────────────────────────────────
  //  WIRE-UP
  // ─────────────────────────────────────────────

  _wireMenuButtons(el) {
    el.querySelectorAll(".menu-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("menuAction", { detail: btn.dataset.action }));
      });
    });

    const fsBtn      = el.querySelector("#menu-fullscreen-btn");
    const fsExpand   = el.querySelector("#menu-fs-expand");
    const fsCompress = el.querySelector("#menu-fs-compress");

    const syncFsIcon = () => {
      const isFs = !!document.fullscreenElement;
      fsExpand.style.display   = isFs ? "none"  : "block";
      fsCompress.style.display = isFs ? "block" : "none";
    };

    fsBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
    document.addEventListener("fullscreenchange", syncFsIcon);

    el.querySelector("#menu-mute-btn").addEventListener("click", () => this._toggleMute());
  }

  _wirePauseButtons(el) {
    el.querySelector("#pause-resume-btn").addEventListener("click", () => {
      this.hidePause();
      this.dispatchEvent(new Event("resume"));
    });

    el.querySelector("#pause-mainmenu-btn").addEventListener("click", () => {
      this.hidePause();
      this.dispatchEvent(new Event("returnToMenu"));
    });

    const slider = el.querySelector("#pause-volume-slider");
    slider.addEventListener("input", () => {
      const v = parseInt(slider.value, 10) / 100;
      this._musicVolume = v;
      this._updateSliderFill(slider);
      this.dispatchEvent(new CustomEvent("volumeChange", { detail: v }));
    });

    el.querySelector("#pause-mute-btn").addEventListener("click", () => this._toggleMute());
  }

  _toggleMute() {
    this._isMuted = !this._isMuted;
    // Usa atributo no #app para CSS controlar visibilidade dos ícones
    document.getElementById("app").dataset.muted = this._isMuted ? "1" : "0";
    this.dispatchEvent(new CustomEvent("muteToggle", { detail: this._isMuted }));
  }

  _updateSliderFill(slider) {
    const pct = slider.value + "%";
    slider.style.background = `linear-gradient(to right, var(--color-dust) 0%, var(--color-dust) ${pct}, var(--color-fog) ${pct}, var(--color-fog) 100%)`;
  }

  _setGameModeLabel(text) {
    const el = document.getElementById("game-mode-label");
    if (!el) return;
    el.textContent    = text;
    el.style.display  = text ? "block" : "none";
  }
}