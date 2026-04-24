export function setupControls(scene) {
    scene.keys = scene.input.keyboard.addKeys("W,A,S,D");
    scene.cursors = scene.input.keyboard.createCursorKeys();
}

export function handleMovement(scene) {
    const player = scene.player;
    const { keys, speed } = scene;

    if (!player) return;

    // Deve bater com os valores definidos em Player.js
    const larguraHitbox = 190;
    const offsetDireita = 550;

    // player.width é a largura da textura SEM escala.
    // Para o offset funcionar corretamente com flipX, usamos a largura real da textura.
    const larguraTotalImagem = player.width;

    // Offset para a esquerda: espelha o offset da direita em relação à textura
    const offsetEsquerda = larguraTotalImagem - larguraHitbox - offsetDireita;

    // 1. DETERMINAR DIREÇÃO
    if (keys.A.isDown) {
        player.setVelocityX(-speed);
        player.setFlipX(true);
        player.anims.play("walk", true);
        player.body.setOffset(offsetEsquerda, 0);
    } 
    else if (keys.D.isDown) {
        player.setVelocityX(speed);
        player.setFlipX(false);
        player.anims.play("walk", true);
        player.body.setOffset(offsetDireita, 0);
    } 
    // 2. SÓ RESETAR SE NENHUMA TECLA DE MOVIMENTO ESTIVER PRESSIONADA
    else {
        player.setVelocityX(0);

        // Restaura o offset correto de acordo com a direção atual
        if (player.flipX) {
            player.body.setOffset(offsetEsquerda, 0);
        } else {
            player.body.setOffset(offsetDireita, 0);
        }
        
        // Verifica se a animação de andar está rodando para pará-la
        if (player.anims.isPlaying && player.anims.currentAnim.key === 'walk') {
            player.anims.stop();
            player.setTexture("player_frame_1"); // Volta ao frame parado
        }
    }

    // Pulo (Independente do movimento lateral)
    if (keys.W.isDown && player.body.blocked.down) {
        player.setVelocityY(-750);
    }
}