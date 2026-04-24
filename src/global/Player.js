import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player_frame_1");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.4);
    this.setCollideWorldBounds(true);
    this.setPipeline("Light2D");
    this.setDepth(1);

    // --- AJUSTE DA HITBOX ---
    const larguraHitbox = 190;
    const alturaHitbox = 720;
    this.body.setSize(larguraHitbox, alturaHitbox);
    this.body.setOffset(550, 0);
  }

  static preload(scene) {
    // Cada imagem PRECISA de uma chave única (player_frame_1, 2, 3, 4, 5...)
    scene.load.image(
      "player_frame_1",
      "assets/Character/Character_Frame-01.png",
    );
    scene.load.image(
      "player_frame_2",
      "assets/Character/Character_Frame-02.png",
    );
    scene.load.image(
      "player_frame_3",
      "assets/Character/Character_Frame-03.png",
    );
    scene.load.image(
      "player_frame_4",
      "assets/Character/Character_Frame-04.png",
    );
    }

  static createAnimations(scene) {
    // Verifica se a animação já existe para não criar duplicado ao trocar de cena
    if (!scene.anims.exists("walk")) {
      scene.anims.create({
        key: "walk",
        frames: [
          { key: "player_frame_1" },
          { key: "player_frame_2" },
          { key: "player_frame_3" },
          { key: "player_frame_4" },
        ],
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
