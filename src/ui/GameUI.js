/**
 * GameUI — módulo central que cria e gerencia todos os overlays HTML.
 * Instanciado uma vez em main.js; exposto em window.GameUI.
 *
 * CORREÇÕES:
 * Bug 2  — música volta ao menu (flag _musicStopped + resume no showMenu)
 * Bug 3  — filtro de saturação 0 aplicado no canvas via CSS filter
 * Bug 4  — fullscreen e mute funcionam (pointer-events corrigido no menu)
 * Bug 5  — textos de dica/progressão não se sobrepõem (clearInterval + replace)
 * Melhoria 2 — cursor hover: bolinha maior e mais branca nos botões
 * Melhoria 3 — textos de dica/progressão maiores
 * Melhoria 7 — botão de pausa com apenas traços (sem texto)
 * Melhoria 8 — indicador de modo de jogo no canto superior esquerdo
 * Melhoria 6 — separação visual entre "Continuar" e "Voltar ao Menu"
 */
export class GameUI {
  constructor() {
    this._pauseCallbacks  = {};
    this._isMuted         = false;
    this._musicVolume     = 0.5;

    this._menuEl   = null;
    this._pauseEl  = null;

    // Controle de hints/progressão (Bug 5)
    this._hintInterval    = null;
    this._progressTimeout = null;

    this._injectStyles();
    this._buildMainMenu();
    this._buildPauseMenu();
    this._buildGameModeLabel();
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────

  /** Mostra menu principal */
  showMenu() {
    if (this._pauseEl) this._pauseEl.style.display = "none";
    if (this._menuEl) {
      this._menuEl.style.display = "flex";
      requestAnimationFrame(() => (this._menuEl.style.opacity = "1"));
    }

    // Bug 2: Remove filtro de saturação ao voltar ao menu
    const canvas = document.querySelector("#game-container canvas");
    if (canvas) canvas.style.filter = "";

    // Oculta label de modo de jogo
    this._setGameModeLabel("");
  }

  /** Esconde menu principal */
  hideMenu() {
    if (!this._menuEl) return;
    this._menuEl.style.opacity = "0";
    setTimeout(() => (this._menuEl.style.display = "none"), 1200);
  }

  /** Mostra overlay de pausa */
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

  /** Esconde overlay de pausa */
  hidePause() {
    if (!this._pauseEl) return;
    this._pauseEl.style.opacity = "0";
    setTimeout(() => (this._pauseEl.style.display = "none"), 400);
  }

  /**
   * Define o modo de jogo exibido no canto superior esquerdo.
   * Melhoria 8.
   * @param {"singleplayer"|"multiplayer"|""} mode
   */
  setGameMode(mode) {
    if (mode === "singleplayer") this._setGameModeLabel("Solo");
    else if (mode === "multiplayer") this._setGameModeLabel("Co-op");
    else this._setGameModeLabel("");
  }

  /**
   * Registra callbacks de eventos de UI.
   */
  on(event, fn) {
    this._pauseCallbacks[event] = fn;
  }

  get isMuted() { return this._isMuted; }

  setVolume(v) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    const slider = this._pauseEl?.querySelector("#pause-volume-slider");
    if (slider) {
      slider.value = Math.round(this._musicVolume * 100);
      this._updateSliderFill(slider);
    }
  }

  /**
   * Aplica filtro de saturação 0 no canvas do Phaser. Bug 3.
   * Chame quando entrar numa fase.
   */
  applyDesaturation() {
    const canvas = document.querySelector("#game-container canvas");
    if (canvas) canvas.style.filter = "saturate(0)";
  }

  /**
   * Remove o filtro de saturação.
   */
  removeDesaturation() {
    const canvas = document.querySelector("#game-container canvas");
    if (canvas) canvas.style.filter = "";
  }

  // ─────────────────────────────────────────────
  //  HINT / PROGRESS SYSTEM (Bug 5 + Melhoria 3)
  // ─────────────────────────────────────────────

  /**
   * Exibe uma dica no painel inferior. Bug 5: garante que apenas
   * uma dica é exibida por vez, sem sobreposição.
   * @param {string} text
   * @param {number} [duration=4000] ms antes de sumir automaticamente
   */
  showHint(text, duration = 4000) {
    const el = document.getElementById("game-hint-bar");
    if (!el) return;

    // Cancela timer anterior para não sobrescrever
    if (this._hintTimeout) {
      clearTimeout(this._hintTimeout);
      this._hintTimeout = null;
    }

    // Fade out → troca texto → fade in
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

  /**
   * Exibe texto de progressão (ex: "Capítulo 1"). Bug 5: substitui
   * o anterior sem sobrepor.
   * @param {string} text
   * @param {number} [duration=3500]
   */
  showProgress(text, duration = 3500) {
    const el = document.getElementById("game-progress-label");
    if (!el) return;

    if (this._progressTimeout) {
      clearTimeout(this._progressTimeout);
      this._progressTimeout = null;
    }

    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = text;
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

  // ─────────────────────────────────────────────
  //  BUILDERS
  // ─────────────────────────────────────────────

  _buildMainMenu() {
    const el = document.createElement("div");
    el.id = "main-menu-ui";
    el.style.cssText = `
      position:absolute; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      opacity:0; transition:opacity 1.2s cubic-bezier(0.16,1,0.3,1);
      background: radial-gradient(ellipse at center bottom, rgba(10,10,18,0.3) 0%, rgba(0,0,0,0.85) 100%);
      pointer-events:none; z-index:100;
    `;

    el.innerHTML = `
      <!-- Grain -->
      <div style="position:absolute;inset:0;pointer-events:none;
        background-image:url('data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E');
        opacity:0.4;"></div>
      <!-- Vignette -->
      <div style="position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 200px rgba(0,0,0,0.8);"></div>

      <!-- Title -->
      <div style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;margin-bottom:4rem;animation:fadeSlideDown 1.8s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(3rem,7vw,6.5rem);font-weight:300;color:#c8c4be;letter-spacing:0.25em;line-height:1;margin:0;text-align:center;text-shadow:0 0 80px rgba(180,170,160,0.15);">
          FRAGMENTOS<br><span style="font-style:italic;font-size:0.65em;letter-spacing:0.4em;color:#8a8580;">DO LAR</span>
        </h1>
        <div style="margin-top:1.5rem;width:120px;height:1px;background:linear-gradient(to right,transparent,rgba(180,170,160,0.4),transparent);"></div>
      </div>

      <!-- Nav — pointer-events:auto para os botões funcionarem (Bug 4) -->
      <nav id="menu-nav" style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:auto;animation:fadeSlideUp 2s cubic-bezier(0.16,1,0.3,1) 0.4s forwards;opacity:0;">
        <button class="menu-btn" data-action="singleplayer">Jogar Solo</button>
        <button class="menu-btn" data-action="multiplayer">Modo Cooperativo</button>
        <button class="menu-btn" data-action="ranking">Registros</button>
        <button class="menu-btn" data-action="options">Opções</button>
      </nav>

      <!-- Bottom bar — pointer-events:auto (Bug 4) -->
      <div style="position:absolute;bottom:2rem;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-end;padding:0 2.5rem;z-index:10;pointer-events:auto;animation:fadeIn 2.5s ease forwards 1s;opacity:0;">
        <div style="font-size:0.7rem;color:#3a3a48;font-family:'Courier Prime',monospace;letter-spacing:0.3em;">v0.2.5 — DEMO</div>
        <div style="display:flex;align-items:center;gap:1rem;">
          <button id="menu-fullscreen-btn" class="icon-btn" title="Tela cheia">
            <svg id="menu-fs-expand" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
            <svg id="menu-fs-compress" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/>
            </svg>
          </button>
          <button id="menu-mute-btn" class="icon-btn" title="Mudo/Som">
            <svg id="menu-sound-on" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            </svg>
            <svg id="menu-sound-off" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.getElementById("app").appendChild(el);
    this._menuEl = el;
    this._wireMenuButtons(el);
  }

  _buildPauseMenu() {
    const el = document.createElement("div");
    el.id = "pause-menu-ui";
    el.style.cssText = `
      position:absolute; inset:0; display:none; flex-direction:column;
      align-items:center; justify-content:center;
      opacity:0; transition:opacity 0.35s ease;
      background:rgba(5,5,8,0.82); backdrop-filter:blur(6px);
      z-index:200; pointer-events:auto;
    `;

    el.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:2rem;min-width:320px;">
        <!-- Header -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
          <span style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:300;color:#c8c4be;letter-spacing:0.35em;">PAUSA</span>
          <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,rgba(180,170,160,0.35),transparent);"></div>
        </div>

        <!-- Volume row -->
        <div style="display:flex;align-items:center;gap:1rem;width:100%;">
          <span style="font-family:'Courier Prime',monospace;font-size:0.7rem;color:#5a5a6a;letter-spacing:0.2em;min-width:50px;">VOLUME</span>
          <input id="pause-volume-slider" type="range" min="0" max="100" value="50"
            style="flex:1;-webkit-appearance:none;height:2px;background:linear-gradient(to right,#5a5a6a 0%,#5a5a6a 50%,#2a2a35 50%,#2a2a35 100%);outline:none;cursor:pointer;">
          <button id="pause-mute-btn" class="icon-btn" style="flex-shrink:0;" title="Mudo">
            <svg id="pause-sound-on" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            </svg>
            <svg id="pause-sound-off" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
            </svg>
          </button>
        </div>

        <!-- Divider -->
        <div style="width:100%;height:1px;background:rgba(90,90,106,0.2);"></div>

        <!-- Actions — Melhoria 6: separação visual entre continuar e voltar -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;">
          <button class="menu-btn" id="pause-resume-btn">Continuar</button>
          <div style="width:100%;height:1px;margin:8px 0;background:rgba(90,90,106,0.15);"></div>
          <button class="menu-btn menu-btn--danger" id="pause-mainmenu-btn">Voltar ao Menu</button>
        </div>
      </div>
    `;

    document.getElementById("app").appendChild(el);
    this._pauseEl = el;
    this._wirePauseButtons(el);
  }

  /** Melhoria 8: Label de modo de jogo no canto superior esquerdo */
  _buildGameModeLabel() {
    if (document.getElementById("game-mode-label")) return;
    const el = document.createElement("div");
    el.id = "game-mode-label";
    el.style.cssText = `
      position:absolute; top:16px; left:20px; z-index:150;
      display:none;
      font-family:'Courier Prime',monospace; font-size:0.65rem;
      color:#4a4a58; letter-spacing:0.3em; text-transform:uppercase;
      pointer-events:none;
      transition: opacity 0.4s ease;
    `;
    document.getElementById("app").appendChild(el);
  }

  _setGameModeLabel(text) {
    const el = document.getElementById("game-mode-label");
    if (!el) return;
    if (!text) { el.style.display = "none"; return; }
    el.textContent = text;
    el.style.display = "block";
    el.style.opacity = "1";
  }

  // ─────────────────────────────────────────────
  //  WIRE-UP
  // ─────────────────────────────────────────────

  _wireMenuButtons(el) {
    el.querySelectorAll(".menu-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (this._pauseCallbacks["menuAction"]) {
          this._pauseCallbacks["menuAction"](action);
        }
      });
    });

    // Fullscreen (Bug 4)
    const fsBtn      = el.querySelector("#menu-fullscreen-btn");
    const fsExpand   = el.querySelector("#menu-fs-expand");
    const fsCompress = el.querySelector("#menu-fs-compress");

    const updateFsIcon = () => {
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
    document.addEventListener("fullscreenchange", updateFsIcon);

    // Mute (Bug 4)
    const muteBtn = el.querySelector("#menu-mute-btn");
    const sOn     = el.querySelector("#menu-sound-on");
    const sOff    = el.querySelector("#menu-sound-off");
    muteBtn.addEventListener("click", () => this._toggleMute(sOn, sOff));
  }

  _wirePauseButtons(el) {
    el.querySelector("#pause-resume-btn").addEventListener("click", () => {
      this.hidePause();
      if (this._pauseCallbacks["resume"]) this._pauseCallbacks["resume"]();
    });

    // Bug 2: ao voltar ao menu, dispara callback que a cena usa para reiniciar música
    el.querySelector("#pause-mainmenu-btn").addEventListener("click", () => {
      this.hidePause();
      if (this._pauseCallbacks["returnToMenu"]) this._pauseCallbacks["returnToMenu"]();
    });

    const slider = el.querySelector("#pause-volume-slider");
    slider.addEventListener("input", () => {
      const v = parseInt(slider.value, 10) / 100;
      this._musicVolume = v;
      this._updateSliderFill(slider);
      if (this._pauseCallbacks["volumeChange"]) this._pauseCallbacks["volumeChange"](v);
    });

    const muteBtn = el.querySelector("#pause-mute-btn");
    const sOn     = el.querySelector("#pause-sound-on");
    const sOff    = el.querySelector("#pause-sound-off");
    muteBtn.addEventListener("click", () => this._toggleMute(sOn, sOff));
  }

  _toggleMute(iconOn, iconOff) {
    this._isMuted = !this._isMuted;

    // Sync ambos menus
    [
      this._menuEl?.querySelector("#menu-sound-on"),
      this._pauseEl?.querySelector("#pause-sound-on"),
    ].forEach(i => { if (i) i.style.display = this._isMuted ? "none" : "block"; });
    [
      this._menuEl?.querySelector("#menu-sound-off"),
      this._pauseEl?.querySelector("#pause-sound-off"),
    ].forEach(i => { if (i) i.style.display = this._isMuted ? "block" : "none"; });

    if (this._pauseCallbacks["muteToggle"]) this._pauseCallbacks["muteToggle"](this._isMuted);
  }

  _updateSliderFill(slider) {
    const pct = slider.value + "%";
    slider.style.background = `linear-gradient(to right, #8a8a9a 0%, #8a8a9a ${pct}, #2a2a35 ${pct}, #2a2a35 100%)`;
  }

  _injectStyles() {
    if (document.getElementById("gameui-styles")) return;
    const style = document.createElement("style");
    style.id = "gameui-styles";
    style.textContent = `
      @keyframes fadeSlideDown {
        from { opacity:0; transform:translateY(-24px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes fadeSlideUp {
        from { opacity:0; transform:translateY(24px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity:0; }
        to   { opacity:1; }
      }

      /* ── Cursor customizado (Melhoria 2) ─────────────────────── */
      * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Ccircle cx='7' cy='7' r='3.5' fill='%23a8a49e' opacity='0.85'/%3E%3C/svg%3E") 7 7, default !important; }

      button, [role="button"], a, input[type="range"], label {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='6' fill='%23e8e4de' opacity='0.9'/%3E%3C/svg%3E") 10 10, pointer !important;
      }

      /* ── Menu buttons ─────────────────────────────────────────── */
      .menu-btn {
        position:relative; display:block; width:280px; padding:14px 0;
        background:transparent; border:none; border-bottom:1px solid transparent;
        color:#5a5a6a; font-family:'Cormorant Garamond',serif; font-size:1.1rem;
        font-weight:300; letter-spacing:0.2em; text-align:center;
        text-transform:uppercase; outline:none;
        transition: color 0.4s ease, letter-spacing 0.5s cubic-bezier(0.16,1,0.3,1);
      }
      .menu-btn::before {
        content:''; position:absolute; left:50%; bottom:0; width:0; height:1px;
        background:linear-gradient(to right,transparent,#a8a49e,transparent);
        transform:translateX(-50%);
        transition:width 0.5s cubic-bezier(0.16,1,0.3,1);
      }
      .menu-btn:hover { color:#c8c4be; letter-spacing:0.32em; }
      .menu-btn:hover::before { width:80%; }
      .menu-btn:active { color:#e8e4de; transform:translateY(1px); }

      /* Botão "Voltar ao Menu" — tom mais apagado para diferenciar (Melhoria 6) */
      .menu-btn--danger { color:#4a3a3a; }
      .menu-btn--danger:hover { color:#a87a7a; }

      /* ── Icon buttons ─────────────────────────────────────────── */
      .icon-btn {
        display:flex; align-items:center; justify-content:center;
        width:36px; height:36px; background:transparent;
        border:1px solid rgba(90,90,106,0.3); border-radius:50%;
        color:#5a5a6a;
        transition:color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
        outline:none;
      }
      .icon-btn:hover {
        color:#a8a49e; border-color:rgba(168,164,158,0.5);
        background:rgba(168,164,158,0.05);
      }

      /* ── Pause trigger button — Melhoria 7: apenas traços ──────── */
      #pause-trigger-btn {
        position:absolute; top:16px; left:50%; transform:translateX(-50%);
        z-index:150; display:none;
        background:rgba(10,10,14,0.7); border:1px solid rgba(90,90,106,0.35);
        border-radius:6px; padding:8px 14px;
        color:#6a6a7a;
        outline:none;
        transition:color 0.3s, border-color 0.3s, background 0.3s;
        backdrop-filter:blur(4px);
      }
      #pause-trigger-btn:hover {
        color:#a8a49e; border-color:rgba(138,138,154,0.5);
        background:rgba(15,15,20,0.85);
      }
      /* SVG traços dentro do botão */
      #pause-trigger-btn svg {
        display:block; pointer-events:none;
      }

      /* ── Hint bar (Bug 5 + Melhoria 3) ─────────────────────────── */
      #game-hint-bar {
        position:absolute; bottom:28px; left:50%; transform:translateX(-50%);
        z-index:150; display:none; align-items:center; gap:12px;
        background:rgba(8,8,12,0.75); border:1px solid rgba(90,90,106,0.25);
        border-radius:8px; padding:10px 22px;
        backdrop-filter:blur(6px);
        transition:opacity 0.3s ease;
        white-space:nowrap;
        pointer-events:none;
      }
      .hint-icon {
        font-family:'Courier Prime',monospace; font-size:0.75rem;
        color:#4a4a58; letter-spacing:0.1em; flex-shrink:0;
      }
      .hint-text {
        /* Melhoria 3: fonte maior */
        font-family:'Cormorant Garamond',serif; font-size:1.05rem;
        font-style:italic; color:#a8a49e; letter-spacing:0.08em;
      }

      /* ── Progress label (Bug 5 + Melhoria 3) ────────────────────── */
      #game-progress-label {
        position:absolute; top:56px; left:50%; transform:translateX(-50%);
        z-index:150; display:none;
        font-family:'Cormorant Garamond',serif; font-size:1.15rem;
        font-weight:300; font-style:italic; color:#7a7a8a;
        letter-spacing:0.3em; text-align:center;
        pointer-events:none;
        transition:opacity 0.3s ease;
      }

      /* ── Range slider thumb ───────────────────────────────────── */
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance:none; width:12px; height:12px;
        border-radius:50%; background:#a8a49e; border:1px solid #5a5a6a;
      }
      input[type=range]::-moz-range-thumb {
        width:12px; height:12px; border-radius:50%;
        background:#a8a49e; border:1px solid #5a5a6a;
      }

      /* ── Canvas desaturation (Bug 3) ─────────────────────────── */
      #game-container canvas {
        display:block;
        transition: filter 0.6s ease;
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────
  //  PAUSE TRIGGER BUTTON — Melhoria 7 (só traços)
  // ─────────────────────────────────────────────
  buildPauseTrigger() {
    if (document.getElementById("pause-trigger-btn")) {
      // já existe, garante que está visível
      this.showPauseTrigger();
      return document.getElementById("pause-trigger-btn");
    }

    const btn = document.createElement("button");
    btn.id = "pause-trigger-btn";
    // SVG hambúrguer estilo "pause" (dois traços verticais)
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5"  y="4" width="4" height="16" rx="1"/>
        <rect x="15" y="4" width="4" height="16" rx="1"/>
      </svg>
    `;
    btn.style.display = "block";
    btn.addEventListener("click", () => {
      if (this._pauseCallbacks["pause"]) this._pauseCallbacks["pause"]();
    });
    document.getElementById("app").appendChild(btn);
    return btn;
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
  //  HINT BAR & PROGRESS — builders chamados pela cena
  // ─────────────────────────────────────────────
  buildHintBar() {
    if (document.getElementById("game-hint-bar")) return;
    const el = document.createElement("div");
    el.id = "game-hint-bar";
    el.innerHTML = `
      <span class="hint-icon" id="hint-key-label">Dica</span>
      <span class="hint-text"></span>
    `;
    document.getElementById("app").appendChild(el);
  }

  buildProgressLabel() {
    if (document.getElementById("game-progress-label")) return;
    const el = document.createElement("div");
    el.id = "game-progress-label";
    document.getElementById("app").appendChild(el);
  }

  /** Atualiza o label da tecla no hint bar */
  setHintKey(label) {
    const el = document.getElementById("hint-key-label");
    if (el) el.textContent = label;
  }
}