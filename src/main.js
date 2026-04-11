import "./style.css";
import Phaser from "phaser";

import { Menu } from "./mainMenu/menu";
import { Tutorial } from "./scenes/tutorial";
import { Ranking } from "./mainMenu/ranking/ranking";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 1920,
  height: 1080,
  backgroundColor: "#111112",

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1500 },
      debug: true,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  scene: [Menu, Tutorial, Ranking],
};

const game = new Phaser.Game(config);
