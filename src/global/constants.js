// ─────────────────────────────────────────────────────────
//  FRAGMENTOS DO LAR — Constantes globais
//  Fonte única de verdade para magic numbers e paleta Phaser.
//  Importe daqui; nunca duplique valores em arquivos de cena.
// ─────────────────────────────────────────────────────────

// ── Player ───────────────────────────────────────────────
export const PLAYER = Object.freeze({
  SCALE:          0.4,
  HITBOX_W:       190,
  HITBOX_H:       720,
  OFFSET_RIGHT:   550,
  /** Offset esquerdo espelhado a partir da largura total da textura */
  offsetLeft(textureWidth) {
    return textureWidth - this.HITBOX_W - this.OFFSET_RIGHT;
  },
  SPEED:          400,
  JUMP_VELOCITY: -750,
  /** Y de spawn: floorY menos metade da hitbox escalada */
  spawnY(floorY) {
    return floorY - (this.HITBOX_H * this.SCALE * 0.5);
  },
});

// ── Física ───────────────────────────────────────────────
export const PHYSICS = Object.freeze({
  GRAVITY_Y: 2000,
  FLOOR_HEIGHT: 120,   // altura do bloco de chão
  FLOOR_OFFSET:  60,   // distância do fundo da tela até o topo do chão
});

// ── LightCompanion ───────────────────────────────────────
export const COMPANION = Object.freeze({
  TEXTURE_SIZE:        300,
  SCALE_LOCKED:        0.6,
  SCALE_UNLOCKED:      1.0,
  ALPHA_LOCKED:        0.3,
  ALPHA_UNLOCKED:      1.0,
  LIGHT_RADIUS_LOCKED: 200,
  LIGHT_RADIUS_UNLOCK: 500,
  LIGHT_INTENSITY_LOCKED: 0.8,
  LIGHT_INTENSITY_UNLOCK: 2.5,
  FOLLOW_LERP:         0.1,
  FOLLOW_OFFSET_X:      80,
  FOLLOW_OFFSET_Y:     120,
  COOP_SPEED:          400,
});

// ── Tutorial ─────────────────────────────────────────────
export const TUTORIAL = Object.freeze({
  PAPER_X_RATIO:      0.38,
  PAPER_Y_FROM_FLOOR: 90,    // px acima do chão
  PAPER_INTERACT_RADIUS: 220,
  COMPANION_X_RATIO:  0.80,
  COMPANION_Y_FROM_TOP: 220, // px a partir do topo da tela
  COOP_MOVE_TARGET_MS: 6000,
});

// ── Paleta Phaser (hex numérico) ─────────────────────────
// Espelha as variáveis CSS de style.css para uso dentro do Phaser.
export const PALETTE = Object.freeze({
  INK:     0x0a0a0c,
  ASH:     0x1a1a20,
  FOG:     0x2e2e38,
  DUST:    0x5a5a6a,
  BONE:    0xa8a49e,
  VELLUM:  0xc8c4be,
  PAPER:   0xe8e4de,
  ACCENT:  0x7a9e8a,
  ACCENT2: 0x8a7a6a,
  WHITE:   0xffffff,
  CYAN:    0x00ffff,
  WARM:    0xffe0aa,
});

// ── Fontes (nomes CSS para uso no Phaser) ────────────────
export const FONTS = Object.freeze({
  DISPLAY: "'Cormorant Garamond', serif",
  MONO:    "'Courier Prime', monospace",
});