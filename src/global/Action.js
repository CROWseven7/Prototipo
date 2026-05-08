import { PLAYER } from "./constants.js";

export function setupControls(scene) {
  scene.keys    = scene.input.keyboard.addKeys("W,A,S,D");
  scene.cursors = scene.input.keyboard.createCursorKeys();
}

export function handleMovement(scene) {
  const { player, keys, speed } = scene;
  if (!player) return;

  const textureW     = player.width;
  const offsetRight  = PLAYER.OFFSET_RIGHT;
  const offsetLeft   = PLAYER.offsetLeft(textureW);

  if (keys.A.isDown) {
    player.setVelocityX(-speed);
    player.setFlipX(true);
    player.anims.play("walk", true);
    player.body.setOffset(offsetLeft, 0);

  } else if (keys.D.isDown) {
    player.setVelocityX(speed);
    player.setFlipX(false);
    player.anims.play("walk", true);
    player.body.setOffset(offsetRight, 0);

  } else {
    player.setVelocityX(0);
    player.body.setOffset(player.flipX ? offsetLeft : offsetRight, 0);

    if (player.anims.isPlaying && player.anims.currentAnim?.key === "walk") {
      player.anims.stop();
      player.setTexture("player_frame_1");
    }
  }

  if (keys.W.isDown && player.body.blocked.down) {
    player.setVelocityY(PLAYER.JUMP_VELOCITY);
  }
}