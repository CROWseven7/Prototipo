import "./style.css";
import Phaser from "phaser";

import { GameUI }          from "./ui/GameUI.js";
import { Menu }            from "./mainMenu/menu.js";
import { Tutorial }        from "./scenes/Tutorial/tutorial.js";
import { Ranking }         from "./mainMenu/ranking/ranking.js";
import { QuartoPrincipal } from "./scenes/QuartoPrincipal.js";
import { Corredor }        from "./scenes/Corredor.js";
import { SalaDeEstar, Cozinha, QuartoDosPais, Banheiro } from "./scenes/Rooms.js";
import { BattleScene }     from "./scenes/BattleScene.js";

const ui = new GameUI();

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width:  1920,
  height: 1080,
  backgroundColor: "#111112",
  physics: {
    default: "arcade",
    arcade:  { gravity: { y: 2000 }, debug: false },
  },
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    Menu,
    Tutorial,
    Ranking,
    // ── Cômodos ──────────────────────────
    QuartoPrincipal,   // Checkpoint / hub do jogador
    Corredor,          // Hub com 4 portas + NPC
    SalaDeEstar,       // Porta 1
    Cozinha,           // Porta 2
    QuartoDosPais,     // Porta 3
    Banheiro,          // Porta 4
    // ── Batalha ──────────────────────────
    BattleScene,       // Universal — ativada via scene.start("BattleScene", data)
  ],
  callbacks: {
    preBoot(game) {
      game.registry.set("ui", ui);
    },
  },
};

new Phaser.Game(config);