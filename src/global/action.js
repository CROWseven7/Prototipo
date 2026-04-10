export function setupControls(scene) {
    // Define as teclas na cena passada por argumento
    scene.keys = scene.input.keyboard.addKeys("W,A,S,D");
    scene.cursors = scene.input.keyboard.createCursorKeys();
}

export function handleMovement(scene) {
    const player = scene.player;
    const cursors = scene.cursors;
    const keys = scene.keys;
    const speed = scene.speed;

    // Reset da velocidade horizontal
    player.setVelocityX(0);

    // Movimentação Lateral (Unindo as condições para evitar conflitos)
    if (cursors.left.isDown || keys.A.isDown) {
        player.setVelocityX(-speed);
    } else if (cursors.right.isDown || keys.D.isDown) {
        player.setVelocityX(speed);
    }

    // Pulo (W ou Seta para Cima)
    const isJumpPressed = cursors.up.isDown || keys.W.isDown;
    
    if (isJumpPressed && player.body.blocked.down) {
        player.setVelocityY(-500); // Força do pulo
    }
}