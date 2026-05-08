import Phaser from "phaser";
import { PLAYER, PALETTE, FONTS } from "./constants.js";

export default class Player extends Phaser.Physics.Arcade.Sprite {

  constructor(scene, x, y) {
    super(scene, x, y, "player_frame_1");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(PLAYER.SCALE);
    this.setCollideWorldBounds(true);
    this.setPipeline("Light2D");
    this.setDepth(1);

    this.body.setSize(PLAYER.HITBOX_W, PLAYER.HITBOX_H);
    this.body.setOffset(PLAYER.OFFSET_RIGHT, 0);
  }

  static preload(scene) {
    for (let i = 1; i <= 4; i++) {
      scene.load.image(
        `player_frame_${i}`,
        `assets/Character/Character_Frame-0${i}.png`,
      );
    }
  }

  static createAnimations(scene) {
    if (!scene.anims.exists("walk")) {
      scene.anims.create({
        key: "walk",
        frames: [1, 2, 3, 4].map(i => ({ key: `player_frame_${i}` })),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!scene.anims.exists("idle")) {
      scene.anims.create({
        key: "idle",
        frames: [{ key: "player_frame_1" }],
        frameRate: 1,
      });
    }
  }
}