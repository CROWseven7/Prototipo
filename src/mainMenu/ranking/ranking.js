import Phaser from "phaser";
import { getRanking } from "../../../lib/firebase.js";

export class Ranking extends Phaser.Scene {
  constructor() {
    super({ key: "Ranking" });
    this.currentTab = "score";
    this.loadingTimeout = null;
  }

  create() {
    const menuUI = document.getElementById("main-menu-ui");
    if (menuUI) menuUI.style.display = "flex";

    this.renderRankingUI();
    this.loadData();
  }

  async loadData() {
    const listContainer = document.getElementById("ranking-list");
    if (!listContainer) return;

    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    listContainer.innerHTML = "";

    this.loadingTimeout = setTimeout(() => {
      listContainer.innerHTML =
        "<p class='text-cyan-400 animate-pulse font-mono tracking-widest'>CARREGANDO...</p>";
    }, 2000);

    try {
      const data = await getRanking(this.currentTab);

      clearTimeout(this.loadingTimeout);
      this.updateList(data);
    } catch (error) {
      clearTimeout(this.loadingTimeout);
      console.error(error);
      listContainer.innerHTML =
        "<p class='text-red-500'>ERRO AO CARREGAR DADOS</p>";
    }
  }

  // No seu método updateList dentro do ranking.js
  updateList(data) {
    const listContainer = document.getElementById("ranking-list");
    if (!listContainer) return;

    listContainer.innerHTML = data
      .map(
        (user, index) => `
    <div class="flex justify-between items-center border-b border-cyan-900/30 py-3 group hover:bg-cyan-400/5 transition-all">
      <div class="flex items-center gap-4">
        <span class="text-cyan-500/50 font-mono w-6">#${(index + 1).toString().padStart(2, "0")}</span>
        <span class="text-cyan-100 uppercase tracking-wider text-sm">${user.userName || "Anônimo"}</span>
      </div>
      <span class="text-cyan-400 font-mono text-lg shadow-cyan-500/50 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
        ${
          this.currentTab === "score"
            ? `${user.userScore.toLocaleString("pt-BR")} pts` // Adicionado aqui
            : this.formatTime(user.userTime)
        }
      </span>
    </div>
  `,
      )
      .join("");
  }
  
  formatTime(ms) {
    if (typeof ms !== "number") return "00h 00m 00s 00ms";
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    const hDisplay = hours > 0 ? `${hours.toString().padStart(2, "0")}h ` : "";
    const mDisplay = `${mins.toString().padStart(2, "0")}m `;
    const sDisplay = `${secs.toString().padStart(2, "0")}s `;
    const csDisplay = `${centiseconds.toString().padStart(2, "0")}ms`;

    return hDisplay + mDisplay + sDisplay + csDisplay;
  }

  renderRankingUI() {
    const menuUI = document.getElementById("main-menu-ui");
    if (!menuUI) return;

    menuUI.innerHTML = `
      <h1 class="text-5xl font-thin text-cyan-100 tracking-[1rem] mb-10 opacity-80 uppercase italic">RANKING</h1>
      
      <div class="flex gap-4 mb-8 pointer-events-auto">
        <button id="btn-score" class="menu-btn ${this.currentTab === "score" ? "border-cyan-400 text-cyan-300" : ""}">Pontos</button>
        <button id="btn-time" class="menu-btn ${this.currentTab === "time" ? "border-cyan-400 text-cyan-300" : ""}">Tempo</button>
      </div>

      <div id="ranking-list" class="w-full max-w-md h-64 overflow-y-auto pr-4 custom-scrollbar pointer-events-auto font-sans"></div>

      <button id="btn-back" class="menu-btn mt-10 pointer-events-auto text-sm">Voltar ao Menu</button>
    `;

    document.getElementById("btn-score").onclick = () => {
      if (this.currentTab === "score") return;
      this.currentTab = "score";
      this.renderRankingUI();
      this.loadData();
    };

    document.getElementById("btn-time").onclick = () => {
      if (this.currentTab === "time") return;
      this.currentTab = "time";
      this.renderRankingUI();
      this.loadData();
    };

    document.getElementById("btn-back").onclick = () => {
      this.scene.start("MainMenu");
    };
  }
}
