import Phaser from "phaser";
import { BaseScene } from "../global/BaseScene.js";
import { PALETTE, PHYSICS } from "../global/constants.js";

/**
 * SceneTemplate — template para novas cenas de sala.
 *
 * Como usar:
 *   1. Copie este arquivo para src/scenes/NomeDaSala.js
 *   2. Renomeie a classe e a chave da cena
 *   3. Implemente _buildRoom() com o cenário específico
 *   4. Adicione a cena em main.js
 *
 * Herda de BaseScene:
 *   - Player criado automaticamente
 *   - LightCompanion criado automaticamente
 *   - Física, luzes, pausa — tudo configurado
 *   - Só precisa implementar os hooks abaixo
 */
export class SceneTemplate extends BaseScene {

  constructor() {
    // TODO: troque "SceneTemplate" pela chave real da cena (ex: "Banheiro")
    super("SceneTemplate");
  }

  // ─────────────────────────────────────────────
  //  HOOKS (sobrescreva conforme necessário)
  // ─────────────────────────────────────────────

  /** Chamado em init() antes de tudo. Use para resetar estado local. */
  _onInit(data) {
    // TODO: inicialize variáveis de estado da sala aqui
  }

  /** Chamado em preload(). Carregue assets específicos da sala. */
  _onPreload() {
    // TODO: this.load.image("meuAsset", "assets/...");
  }

  /**
   * Chamado após create() da BaseScene.
   * Player, companion, física e luzes já estão prontos aqui.
   */
  _onRoomReady() {
    // TODO: adicione lógica de gameplay específica da sala
    // Ex: objetos interagíveis, diálogos, triggers de narrativa
  }

  /** Chamado em update(), após movimento do player e companion. */
  _onUpdate(time, delta) {
    // TODO: lógica de update da sala (ex: checar condições de vitória)
  }

  /** Posição X de spawn do player. Padrão: 130px da esquerda. */
  _getSpawnX(_width) {
    // TODO: ajuste para o ponto de entrada correto da sala
    return 130;
  }

  /**
   * Constrói o cenário visual da sala.
   * Popule this._groundGroup e this._furnitureGroup com objetos estáticos.
   *
   * Chamado automaticamente por BaseScene.create() antes de criar o player.
   */
  _buildRoom(width, height) {
    const floorY = this._createFloor(width, height);

    // Fundo
    this.add.rectangle(0, 0, width, height, PALETTE.INK)
      .setOrigin(0, 0).setDepth(-1);

    // TODO: adicione paredes, móveis, adereços específicos da sala.
    // Exemplo de objeto estático com colisão:
    //
    // const obj = this.add.rectangle(x, y, w, h, PALETTE.ASH).setOrigin(0.5);
    // obj.setPipeline("Light2D");
    // this.physics.add.existing(obj, true);
    // this._furnitureGroup.add(obj);

    // TODO: adicione luzes ambientes
    // this.lights.addLight(x, y, radius, color, intensity);
  }
}