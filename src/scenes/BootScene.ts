import Phaser from "phaser";

/** Minimal boot hand-off; asset loading is intentionally deferred to a later stage. */
export class BootScene extends Phaser.Scene {
  public constructor() {
    super("BootScene");
  }

  public create(): void {
    this.registry.set("shinkai.bootReady", true);
    this.game.events.emit("shinkai:boot-ready");
    this.scene.start("TitleScene");
  }
}
