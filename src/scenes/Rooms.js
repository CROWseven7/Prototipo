/**
 * Rooms.js — Cômodos secundários do jogo.
 *
 * Cada cômodo herda de BaseScene e implementa:
 *   - _buildRoom(): cenário com chão, paredes e mobília placeholder
 *   - _buildBackDoor(): porta de volta ao Corredor (spawn left = entrada)
 *   - _onUpdate(): detecta proximidade da porta e transita
 *
 * Para adicionar cenário real: substitua os retângulos placeholder
 * por sprites/tilemaps e adicione objetos interativos conforme necessário.
 */

import Phaser from "phaser";
import { BaseScene } from "../global/BaseScene.js";
import { PALETTE, FONTS, PHYSICS } from "../global/constants.js";

// ── Helper compartilhado ───────────────────────────────────────────────────

/**
 * Mixin de porta de volta — injeta lógica comum de "porta de entrada" em
 * qualquer subclasse de BaseScene.
 *
 * Uso: chame _initBackDoor(targetScene) em _onRoomReady()
 *      e     _checkBackDoor()           em _onUpdate()
 */
function applyBackDoorMixin(SceneClass) {
  SceneClass.prototype._initBackDoor = function (targetScene) {
    this._backScene  = targetScene;
    this._backEKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this._backNear   = false;
    this._backPrompt = null;
  };

  SceneClass.prototype._buildBackDoor = function (floorY) {
    const doorX = 80;
    const doorW = 90;
    const doorH = 200;

    this.add.rectangle(doorX, floorY - doorH / 2, doorW, doorH, 0x0c0c14)
      .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

    this.add.text(doorX, floorY - doorH - 28, "←", {
      fontFamily: FONTS.MONO, fontSize: "14px", color: "#3a3a48",
    }).setOrigin(0.5).setDepth(2);

    const crack = this.add.rectangle(doorX, floorY - 2, doorW - 10, 3, 0x3a3020, 0.6)
      .setOrigin(0.5).setDepth(2);
    this.tweens.add({
      targets: crack, alpha: { from: 0.3, to: 0.85 },
      duration: 4500, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    this.lights.addLight(doorX, floorY, 160, PALETTE.WARM, 0.2);

    this._backPrompt = this.add.text(doorX, floorY - doorH - 52, "[E]", {
      fontFamily: FONTS.MONO, fontSize: "14px", color: "#888888",
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: this._backPrompt, alpha: { from: 0, to: 1 },
      duration: 800, yoyo: true, repeat: -1, paused: true,
    });

    this._backDoorX = doorX;
    this._backDoorY = floorY - doorH / 2;
  };

  SceneClass.prototype._checkBackDoor = function () {
    if (!this.player || !this._backPrompt) return;

    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this._backDoorX, this._backDoorY,
    );
    const close = dist < 160;

    if (close && !this._backNear) {
      this._backNear = true;
      this.tweens.getTweensOf(this._backPrompt).forEach(t => t.restart());
    } else if (!close && this._backNear) {
      this._backNear = false;
      this.tweens.getTweensOf(this._backPrompt).forEach(t => t.pause());
      this._backPrompt.setAlpha(0);
    }

    if (this._backNear && Phaser.Input.Keyboard.JustDown(this._backEKey)) {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start(this._backScene));
    }
  };

  return SceneClass;
}

// ═══════════════════════════════════════════════════════════════
//  SALA DE ESTAR
// ═══════════════════════════════════════════════════════════════
export class SalaDeEstar extends BaseScene {
  constructor() { super("SalaDeEstar"); }

  _onRoomReady() {
    applyBackDoorMixin(SalaDeEstar);
    this._initBackDoor("Corredor");
  }

  _getSpawnX(width) { return 200; }   // entra pela direita (porta 1)

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    this.add.rectangle(0, 0, width, height, PALETTE.INK).setOrigin(0, 0).setDepth(-1);

    // Paredes
    [[0, 0, 14, height], [width - 14, 0, 14, height], [0, 0, width, 10]]
      .forEach(([x, y, w, h]) =>
        this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0, 0).setPipeline("Light2D"));

    // Sofá
    const sofaW = 280, sofaH = 70;
    const sofa = this.add.rectangle(width * 0.45, floorY - sofaH / 2, sofaW, sofaH, 0x161620).setOrigin(0.5);
    sofa.setPipeline("Light2D");
    this.physics.add.existing(sofa, true);
    this._furnitureGroup.add(sofa);

    // Encosto do sofá
    const backH = 90;
    const sofaBack = this.add.rectangle(width * 0.45, floorY - sofaH - backH / 2, sofaW, backH, 0x121218).setOrigin(0.5);
    sofaBack.setPipeline("Light2D");
    this.physics.add.existing(sofaBack, true);
    this._furnitureGroup.add(sofaBack);

    // Mesa de centro
    const tableW = 120, tableH = 30;
    const table = this.add.rectangle(width * 0.60, floorY - tableH / 2, tableW, tableH, 0x18181e).setOrigin(0.5);
    table.setPipeline("Light2D");
    this.physics.add.existing(table, true);
    this._furnitureGroup.add(table);

    // TV (parede direita)
    this.add.rectangle(width * 0.85, floorY - 160, 180, 100, 0x0a0a10)
      .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

    // Porta de volta (esquerda)
    this._buildBackDoor(floorY);

    // Luzes
    this.lights.addLight(width * 0.45, height * 0.4, 280, PALETTE.WARM, 0.3);
    this.lights.addLight(width * 0.85, height * 0.5, 200, PALETTE.WHITE, 0.2);
  }

  _onUpdate(_time, _delta) { this._checkBackDoor(); }
}

// ═══════════════════════════════════════════════════════════════
//  COZINHA
// ═══════════════════════════════════════════════════════════════
export class Cozinha extends BaseScene {
  constructor() { super("Cozinha"); }

  _onRoomReady() {
    applyBackDoorMixin(Cozinha);
    this._initBackDoor("Corredor");
  }

  _getSpawnX(width) { return 200; }

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    this.add.rectangle(0, 0, width, height, PALETTE.INK).setOrigin(0, 0).setDepth(-1);

    [[0, 0, 14, height], [width - 14, 0, 14, height], [0, 0, width, 10]]
      .forEach(([x, y, w, h]) =>
        this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0, 0).setPipeline("Light2D"));

    // Balcão / pia (parede direita)
    const counterW = 350, counterH = 80;
    const counter = this.add.rectangle(width * 0.75, floorY - counterH / 2, counterW, counterH, 0x151520).setOrigin(0.5);
    counter.setPipeline("Light2D");
    this.physics.add.existing(counter, true);
    this._furnitureGroup.add(counter);

    // Armários acima do balcão
    this.add.rectangle(width * 0.75, floorY - counterH - 100, counterW - 30, 80, 0x101018)
      .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

    // Mesa de jantar
    const diningW = 200, diningH = 20;
    const dining = this.add.rectangle(width * 0.38, floorY - diningH / 2, diningW, diningH, 0x18181e).setOrigin(0.5);
    dining.setPipeline("Light2D");
    this.physics.add.existing(dining, true);
    this._furnitureGroup.add(dining);

    // Pernas da mesa
    [-70, 70].forEach(ox => {
      this.add.rectangle(width * 0.38 + ox, floorY - 30, 10, 60, 0x14141a).setOrigin(0.5).setPipeline("Light2D");
    });

    this._buildBackDoor(floorY);

    this.lights.addLight(width * 0.75, height * 0.4, 250, PALETTE.WHITE, 0.3);
    this.lights.addLight(width * 0.38, height * 0.5, 180, PALETTE.WARM,  0.2);
  }

  _onUpdate(_time, _delta) { this._checkBackDoor(); }
}

// ═══════════════════════════════════════════════════════════════
//  QUARTO DOS PAIS
// ═══════════════════════════════════════════════════════════════
export class QuartoDosPais extends BaseScene {
  constructor() { super("QuartoDosPais"); }

  _onRoomReady() {
    applyBackDoorMixin(QuartoDosPais);
    this._initBackDoor("Corredor");
  }

  _getSpawnX(width) { return 200; }

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    this.add.rectangle(0, 0, width, height, PALETTE.INK).setOrigin(0, 0).setDepth(-1);

    [[0, 0, 14, height], [width - 14, 0, 14, height], [0, 0, width, 10]]
      .forEach(([x, y, w, h]) =>
        this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0, 0).setPipeline("Light2D"));

    // Cama de casal (maior)
    const bedW = 360, bedH = 70;
    const bed = this.add.rectangle(width * 0.55, floorY - bedH / 2, bedW, bedH, 0x13131a).setOrigin(0.5);
    bed.setPipeline("Light2D");
    this.physics.add.existing(bed, true);
    this._furnitureGroup.add(bed);

    // Cabeceira
    const headH = 110;
    const head = this.add.rectangle(width * 0.55, floorY - bedH - headH / 2, bedW, headH, 0x0f0f16).setOrigin(0.5);
    head.setPipeline("Light2D");
    this.physics.add.existing(head, true);
    this._furnitureGroup.add(head);

    // Criados-mudos
    [-210, 210].forEach(ox => {
      const ns = this.add.rectangle(width * 0.55 + ox, floorY - 55, 60, 90, 0x151520).setOrigin(0.5);
      ns.setPipeline("Light2D");
      this.physics.add.existing(ns, true);
      this._furnitureGroup.add(ns);
    });

    // Guarda-roupas (parede esquerda, atrás da porta)
    const ward = this.add.rectangle(width * 0.22, floorY - 130, 120, 220, 0x0e0e14).setOrigin(0.5);
    ward.setPipeline("Light2D");
    this.physics.add.existing(ward, true);
    this._furnitureGroup.add(ward);

    this._buildBackDoor(floorY);

    this.lights.addLight(width * 0.55, height * 0.35, 300, PALETTE.WARM,  0.28);
    this.lights.addLight(width * 0.22, height * 0.5,  180, PALETTE.WHITE, 0.15);
  }

  _onUpdate(_time, _delta) { this._checkBackDoor(); }
}

// ═══════════════════════════════════════════════════════════════
//  BANHEIRO
// ═══════════════════════════════════════════════════════════════
export class Banheiro extends BaseScene {
  constructor() { super("Banheiro"); }

  _onRoomReady() {
    applyBackDoorMixin(Banheiro);
    this._initBackDoor("Corredor");
  }

  _getSpawnX(width) { return 200; }

  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    this.add.rectangle(0, 0, width, height, PALETTE.INK).setOrigin(0, 0).setDepth(-1);

    [[0, 0, 14, height], [width - 14, 0, 14, height], [0, 0, width, 10]]
      .forEach(([x, y, w, h]) =>
        this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0, 0).setPipeline("Light2D"));

    // Banheira (parede direita)
    const tubW = 220, tubH = 60;
    const tub = this.add.rectangle(width * 0.76, floorY - tubH / 2, tubW, tubH, 0x131318).setOrigin(0.5);
    tub.setPipeline("Light2D");
    this.physics.add.existing(tub, true);
    this._furnitureGroup.add(tub);

    // Borda superior da banheira
    this.add.rectangle(width * 0.76, floorY - tubH - 6, tubW + 10, 12, 0x1a1a22)
      .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

    // Pia / lavatório
    const sinkW = 90, sinkH = 40;
    const sink = this.add.rectangle(width * 0.38, floorY - sinkH / 2, sinkW, sinkH, 0x161620).setOrigin(0.5);
    sink.setPipeline("Light2D");
    this.physics.add.existing(sink, true);
    this._furnitureGroup.add(sink);

    // Espelho (decorativo, parede)
    this.add.rectangle(width * 0.38, floorY - sinkH - 80, 80, 100, 0x0d0d14)
      .setOrigin(0.5).setDepth(1).setPipeline("Light2D");

    this._buildBackDoor(floorY);

    // Luz fria de banheiro (branca azulada)
    this.lights.addLight(width * 0.5,  height * 0.3, 320, 0xd0e0ff, 0.3);
    this.lights.addLight(width * 0.38, height * 0.55, 160, PALETTE.WHITE, 0.25);
  }

  _onUpdate(_time, _delta) { this._checkBackDoor(); }
}