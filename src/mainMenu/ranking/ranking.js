import Phaser from "phaser";
import { getRanking } from "../../../lib/firebase.js";

export class Ranking extends Phaser.Scene {

  constructor() {
    super({ key: "Ranking" });
    this._currentTab  = "score";
    this._loadAbort   = null; // AbortController para cancelar carregamentos anteriores
    this._rootEl      = null;
  }

  create() {
    this._buildDOM();
    this._loadData();
  }

  // ─────────────────────────────────────────────
  //  DOM
  // ─────────────────────────────────────────────

  _buildDOM() {
    document.getElementById("ranking-root")?.remove();

    const menuUI = document.getElementById("main-menu-ui");
    if (!menuUI) return;

    const root  = document.createElement("div");
    root.id     = "ranking-root";
    root.innerHTML = `
      <h2 class="ranking-title">Ranking</h2>
      <div class="ranking-divider"></div>
      <div class="ranking-tabs">
        <button id="btn-score" class="ranking-tab active">Pontuação</button>
        <button id="btn-time"  class="ranking-tab">Tempo</button>
      </div>
      <div id="ranking-list"><p class="ranking-status">·</p></div>
      <button id="btn-back" class="menu-btn ranking-back">← Voltar</button>`;

    menuUI.appendChild(root);
    this._rootEl = root;

    // Esconde nav do menu enquanto ranking está aberto
    document.getElementById("menu-nav")?.style.setProperty("display", "none");

    root.querySelector("#btn-score").onclick = () => this._switchTab("score");
    root.querySelector("#btn-time").onclick  = () => this._switchTab("time");
    root.querySelector("#btn-back").onclick  = () => this._goBack();
  }

  _goBack() {
    this._loadAbort?.abort();
    this._rootEl?.remove();
    this._rootEl = null;
    document.getElementById("menu-nav")?.style.removeProperty("display");
    this.scene.stop();
  }

  _switchTab(tab) {
    if (this._currentTab === tab) return;
    this._currentTab = tab;

    this._rootEl?.querySelectorAll(".ranking-tab").forEach(btn => {
      btn.classList.toggle("active",
        (btn.id === "btn-score" && tab === "score") ||
        (btn.id === "btn-time"  && tab === "time"),
      );
    });

    this._loadData();
  }

  // ─────────────────────────────────────────────
  //  DADOS
  // ─────────────────────────────────────────────

  async _loadData() {
    const listEl = this._rootEl?.querySelector("#ranking-list");
    if (!listEl) return;

    // Cancela requisição anterior
    this._loadAbort?.abort();
    this._loadAbort = new AbortController();
    const { signal } = this._loadAbort;

    const loadingTimer = setTimeout(() => {
      if (!signal.aborted) {
        listEl.innerHTML = `<p class="ranking-status">Carregando...</p>`;
      }
    }, 400);

    try {
      const data = await getRanking(this._currentTab);
      clearTimeout(loadingTimer);
      if (signal.aborted) return;
      this._renderList(data, listEl);
    } catch (err) {
      clearTimeout(loadingTimer);
      if (signal.aborted) return;
      console.error(err);
      listEl.innerHTML = `<p class="ranking-status ranking-status--error">Erro ao carregar dados.</p>`;
    }
  }

  _renderList(data, listEl) {
    if (!data?.length) {
      listEl.innerHTML = `<p class="ranking-status">Nenhum registro ainda.</p>`;
      return;
    }

    const medals = ["gold", "silver", "bronze"];

    listEl.innerHTML = data.map((user, i) => `
      <div class="ranking-row">
        <div class="ranking-row-left">
          <span class="ranking-index ${medals[i] ?? ""}">#${String(i + 1).padStart(2, "0")}</span>
          <span class="ranking-name">${user.userName || "Anônimo"}</span>
        </div>
        <span class="ranking-value">
          ${this._currentTab === "score"
            ? `${user.userScore.toLocaleString("pt-BR")} pts`
            : this._formatTime(user.userTime)}
        </span>
      </div>`).join("");
  }

  _formatTime(ms) {
    if (typeof ms !== "number") return "00m 00s 00ms";
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    const s  = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return (h > 0 ? `${String(h).padStart(2, "0")}h ` : "")
      + `${String(m).padStart(2, "0")}m `
      + `${String(s).padStart(2, "0")}s `
      + `${String(cs).padStart(2, "0")}ms`;
  }
}