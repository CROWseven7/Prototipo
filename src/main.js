import "./style.css";
import Phaser from "phaser";
import { GameUI } from "./ui/GameUI.js";

import { Menu }     from "./mainMenu/menu";
import { Tutorial } from "./scenes/Tutorial/tutorial";
import { Ranking }  from "./mainMenu/ranking/ranking";

// Instancia UI global uma única vez — exposta para as cenas via window.GameUI
window.GameUI = new GameUI();

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 1920,
  height: 1080,
  backgroundColor: "#111112",

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 2000 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  scene: [Menu, Tutorial, Ranking],
};

const game = new Phaser.Game(config);