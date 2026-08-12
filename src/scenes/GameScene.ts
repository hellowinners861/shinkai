import Phaser from 'phaser';

import {
  readDiscoveryProgress,
  recordSpeciesCollection,
  recordSpeciesDiscovery,
  writeDiscoveryProgress,
} from '../catalog/discoveryStore';
import speciesCatalogData from '../data/generated/speciesCatalog.json';
import { APPROVED_SPECIES_ASSETS } from '../data/speciesAssets';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import {
  adjustDiveFuel,
  advanceDiveProgression,
  clampDiveFrameSeconds,
  createInitialDiveProgressionState,
  DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND,
  DIVE_MAX_FUEL,
  DIVE_TARGET_DEPTH_M,
  type DiveProgressionState,
} from '../game/diveProgression';
import {
  advanceEncounterSchedule,
  canTakeRockDamage,
  circlesOverlap,
  createInitialEncounterScheduleState,
  PLAYER_COLLISION_RADIUS,
  RECOVERY_COLLISION_RADIUS,
  RECOVERY_FUEL_GAIN,
  ROCK_FUEL_DAMAGE,
  ROCK_INVULNERABILITY_SECONDS,
  updateInvulnerability,
  type Circle,
  type EncounterLane,
  type EncounterSpawn,
} from '../game/encounterRules';
import {
  advanceSpeciesSpawnSchedule,
  canSpawnSpecies,
  chooseNonOverlappingSpeciesMotionPosition,
  createInitialSpeciesScheduleState,
  createSpeciesMotionPlan,
  getSpeciesMotionPatternForSpecies,
  getSpeciesMotionPosition,
  getSpeciesScrollSpeed,
  hasSpeciesMotionExited,
  MAX_ACTIVE_SPECIES,
  resolveSpeciesInteraction,
  selectSpeciesForDepth,
  SPECIES_COLLISION_RADIUS,
  type CatalogSpeciesRecord,
  type SpeciesInteractionState,
  type SpeciesMotionPlan,
  type SpeciesSpawnRequest,
  type SpawnableSpecies,
} from '../game/speciesRules';
import type { InputVector } from '../input/vector';
import { VirtualJoystick } from '../input/VirtualJoystick';
import type { MobileLifecycleStatus } from '../platform/mobileLifecycle';
import { announce, prefersReducedMotion } from '../platform/preferences';
import { createDiveResultSnapshot } from '../types/game';

interface KeyboardSet {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

interface MarineSnowParticle {
  sprite: Phaser.GameObjects.Arc;
  speedPxPerSecond: number;
}

interface EncounterObject {
  display: Phaser.GameObjects.Container;
  kind: EncounterSpawn['kind'];
  lane: EncounterLane;
  spawnAtSeconds: number;
  speedPxPerSecond: number;
  radius: number;
  sequence: number;
  damageIgnored: boolean;
}

interface SpeciesObject {
  display: Phaser.GameObjects.Container;
  species: SpawnableSpecies;
  spawnAtSeconds: number;
  motionPlan: SpeciesMotionPlan;
  radius: number;
  sequence: number;
  interactionState: SpeciesInteractionState;
}

interface HudSnapshot {
  depthText: string;
  fuelText: string;
  fuelMeterValue: string;
  scoreText: string;
  statusPrimary: string;
  statusSecondary: string;
}

const MARINE_SNOW_TOP = 112;
const MARINE_SNOW_BOTTOM = GAME_HEIGHT - 158;
const ENCOUNTER_SPAWN_Y = 680;
const ENCOUNTER_DESPAWN_Y = 96;
const ROCK_SPEED_PX_PER_SECOND = 78;
const RECOVERY_SPEED_PX_PER_SECOND = 70;
const MAX_ROCKS = 6;
const MAX_RECOVERY_ITEMS = 2;
const ENCOUNTER_EVENT_DURATION_SECONDS = 1.1;
const PLAYER_IMPACT_DISPLAY_SECONDS = 0.45;
const IMPACT_FEEDBACK_DURATION_MS = 280;
const NORMAL_HULL_COLOR = 0x74f2d0;
const IMPACT_HULL_COLOR = 0xff6b5e;
const LANE_X_BY_NAME: Record<EncounterLane, number> = {
  center: GAME_WIDTH / 2,
  leftOuter: 78,
  rightOuter: GAME_WIDTH - 78,
  leftInner: 150,
  rightInner: GAME_WIDTH - 150,
};
const ROCK_RADIUS_BY_LANE: Record<EncounterLane, number> = {
  center: 26,
  leftOuter: 24,
  rightOuter: 28,
  leftInner: 23,
  rightInner: 25,
};
const MARINE_SNOW_LAYOUT = [
  { x: 24, y: 148, radius: 2, speed: 12, alpha: 0.1, color: 0x6bd9e8 },
  { x: 77, y: 237, radius: 1, speed: 12, alpha: 0.12, color: 0x6bd9e8 },
  { x: 129, y: 366, radius: 2, speed: 12, alpha: 0.08, color: 0x6bd9e8 },
  { x: 188, y: 176, radius: 1, speed: 12, alpha: 0.14, color: 0x6bd9e8 },
  { x: 231, y: 542, radius: 2, speed: 12, alpha: 0.1, color: 0x6bd9e8 },
  { x: 276, y: 294, radius: 1, speed: 12, alpha: 0.16, color: 0x6bd9e8 },
  { x: 323, y: 456, radius: 2, speed: 12, alpha: 0.1, color: 0x6bd9e8 },
  { x: 369, y: 204, radius: 1, speed: 12, alpha: 0.12, color: 0x6bd9e8 },
  { x: 414, y: 598, radius: 2, speed: 12, alpha: 0.08, color: 0x6bd9e8 },
  { x: 438, y: 328, radius: 1, speed: 12, alpha: 0.14, color: 0x6bd9e8 },
  { x: 46, y: 421, radius: 2, speed: 34, alpha: 0.16, color: 0x74f2d0 },
  { x: 101, y: 154, radius: 1, speed: 34, alpha: 0.2, color: 0x74f2d0 },
  { x: 148, y: 509, radius: 2, speed: 34, alpha: 0.14, color: 0x74f2d0 },
  { x: 202, y: 269, radius: 1, speed: 34, alpha: 0.22, color: 0x74f2d0 },
  { x: 254, y: 624, radius: 2, speed: 34, alpha: 0.18, color: 0x74f2d0 },
  { x: 302, y: 392, radius: 1, speed: 34, alpha: 0.12, color: 0x74f2d0 },
  { x: 348, y: 181, radius: 2, speed: 34, alpha: 0.2, color: 0x74f2d0 },
  { x: 391, y: 475, radius: 1, speed: 34, alpha: 0.16, color: 0x74f2d0 },
  { x: 421, y: 252, radius: 2, speed: 34, alpha: 0.14, color: 0x74f2d0 },
  { x: 12, y: 570, radius: 1, speed: 34, alpha: 0.22, color: 0x74f2d0 },
] as const;

const SPECIES_CATALOG = speciesCatalogData as readonly CatalogSpeciesRecord[];

/** Playfield presentation for the Abyssal Field Console shell. */
export class GameScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Container | undefined;
  private playerHull: Phaser.GameObjects.Rectangle | undefined;
  private joystick: VirtualJoystick | undefined;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: KeyboardSet | undefined;
  private paused = false;
  private terminalTransitionStarted = false;
  private lifecyclePaused = false;
  private reducedMotion = false;
  private diveProgression: DiveProgressionState =
    createInitialDiveProgressionState();
  private encounterScheduleState = createInitialEncounterScheduleState();
  private encounters: EncounterObject[] = [];
  private encounterSequence = 0;
  private speciesScheduleState = createInitialSpeciesScheduleState();
  private speciesEncounters: SpeciesObject[] = [];
  private speciesSequence = 0;
  private discoveredSpecies = new Set<string>();
  private collectedSpecies: Record<string, number> = {};
  private speciesScore = 0;
  private invulnerabilityRemainingSeconds = 0;
  private playerImpactRemainingSeconds = 0;
  private encounterEventRemainingSeconds = 0;
  private impactFeedbackTimer: number | undefined;
  private marineSnow: MarineSnowParticle[] = [];
  private hudSnapshot: HudSnapshot | undefined;

  public constructor() {
    super('GameScene');
  }

  public preload(): void {
    for (const asset of APPROVED_SPECIES_ASSETS) {
      if (!this.textures.exists(asset.textureKey)) {
        this.load.image(asset.textureKey, asset.url);
      }
    }
  }

  public create(): void {
    this.reducedMotion = prefersReducedMotion();
    this.paused = false;
    this.terminalTransitionStarted = false;
    this.diveProgression = createInitialDiveProgressionState();
    this.destroyEncounterObjects();
    this.encounterScheduleState = createInitialEncounterScheduleState();
    this.encounterSequence = 0;
    this.destroySpeciesObjects();
    this.speciesScheduleState = createInitialSpeciesScheduleState();
    this.speciesSequence = 0;
    this.discoveredSpecies = new Set<string>();
    this.collectedSpecies = {};
    this.speciesScore = 0;
    this.invulnerabilityRemainingSeconds = 0;
    this.playerImpactRemainingSeconds = 0;
    this.encounterEventRemainingSeconds = 0;
    this.marineSnow = [];
    this.hudSnapshot = undefined;
    this.clearImpactFeedback();
    const lifecycleStatus = this.game.registry.get(
      'shinkai.lifecycleStatus',
    ) as MobileLifecycleStatus | undefined;
    this.lifecyclePaused = lifecycleStatus?.shouldPauseGame ?? false;
    this.game.events.on('shinkai:lifecycle', this.handleLifecycleStatus);

    document.getElementById('title-ui')?.setAttribute('hidden', '');
    document.getElementById('game-ui')?.removeAttribute('hidden');
    document.getElementById('result-ui')?.setAttribute('hidden', '');
    document.getElementById('game-container')?.removeAttribute('data-paused');
    document.getElementById('pause-overlay')?.setAttribute('hidden', '');
    this.clearEncounterEvent();

    const background = this.add.graphics();
    background.fillGradientStyle(
      0x0a2b36,
      0x071f2a,
      0x02070b,
      0x02070b,
      1,
    );
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.createMarineSnow();
    this.add
      .rectangle(0, 108, GAME_WIDTH, 1, 0x27606a)
      .setOrigin(0)
      .setAlpha(0.5);
    this.add
      .rectangle(0, GAME_HEIGHT - 154, GAME_WIDTH, 1, 0x27606a)
      .setOrigin(0)
      .setAlpha(0.5);

    const sonarCenterX = GAME_WIDTH / 2;
    const sonarCenterY = 402;
    for (const radius of [92, 154, 216]) {
      this.add
        .circle(sonarCenterX, sonarCenterY, radius, 0x04121a)
        .setAlpha(0.08)
        .setStrokeStyle(1, 0x6bd9e8, 0.2);
    }

    this.add
      .line(
        0,
        0,
        sonarCenterX - 216,
        sonarCenterY,
        sonarCenterX + 216,
        sonarCenterY,
        0x6bd9e8,
        0.12,
      )
      .setOrigin(0);
    this.add
      .line(
        0,
        0,
        sonarCenterX,
        sonarCenterY - 216,
        sonarCenterX,
        sonarCenterY + 216,
        0x6bd9e8,
        0.12,
      )
      .setOrigin(0);

    const sweep = this.add
      .rectangle(sonarCenterX, sonarCenterY, 2, 208, 0x74f2d0)
      .setOrigin(0.5, 1)
      .setAlpha(this.reducedMotion ? 0.06 : 0.12)
      .setAngle(-35);
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: sweep,
        angle: 325,
        duration: 4000,
        ease: 'Linear',
        repeat: -1,
      });
    }

    for (let index = 0; index < 8; index += 1) {
      const y = 168 + index * 58;
      const length = index % 2 === 0 ? 16 : 9;
      this.add
        .line(0, 0, GAME_WIDTH - 28 - length, y, GAME_WIDTH - 28, y, 0x6bd9e8, 0.34)
        .setOrigin(0);
    }

    const hull = this.add
      .rectangle(0, 0, 68, 36, 0x0a2b36)
      .setStrokeStyle(2, NORMAL_HULL_COLOR, 0.86);
    const tail = this.add
      .rectangle(-29, 0, 12, 7, 0x27606a)
      .setStrokeStyle(1, 0x6bd9e8, 0.62);
    const fin = this.add.rectangle(-4, -21, 20, 4, 0x27606a).setAlpha(0.86);
    const observationWindow = this.add
      .circle(19, 0, 8, 0x02070b)
      .setStrokeStyle(1, 0x6bd9e8, 0.94);
    const forwardLight = this.add.circle(31, 0, 3, 0xf1b955).setAlpha(0.9);
    const player = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    player.add([hull, tail, fin, observationWindow, forwardLight]);
    this.player = player;
    this.playerHull = hull;

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as KeyboardSet;
      this.input.keyboard.on('keydown-P', this.handlePauseKey);
      this.input.keyboard.on('keydown-ESC', this.handlePauseKey);
    }

    const joystickElement = document.getElementById('virtual-joystick');
    if (joystickElement) {
      this.joystick = new VirtualJoystick(joystickElement);
    }

    this.events.once('shutdown', this.cleanup);
    this.updateHud();
    announce('潜航計器を起動しました。操舵環またはキーボードで操作します。');
  }

  public update(_time: number, delta: number): void {
    if (!this.player || this.paused || this.lifecyclePaused || this.terminalTransitionStarted) {
      return;
    }

    const frameSeconds = clampDiveFrameSeconds(delta / 1000);
    this.updateEncounterEvent(frameSeconds);
    this.invulnerabilityRemainingSeconds = updateInvulnerability(
      this.invulnerabilityRemainingSeconds,
      frameSeconds,
    );
    this.updatePlayerImpact(frameSeconds);

    if (this.diveProgression.status !== 'descending') {
      return;
    }

    const previousStatus = this.diveProgression.status;
    const nextProgression = advanceDiveProgression(
      this.diveProgression,
      frameSeconds,
    );
    const progressionChanged = nextProgression !== this.diveProgression;
    this.diveProgression = nextProgression;

    if (progressionChanged) {
      this.updateHud();
    }

    if (previousStatus !== nextProgression.status) {
      this.announceTerminalStatus(nextProgression.status);
      this.transitionToResult();
      return;
    }

    if (nextProgression.status !== 'descending') {
      return;
    }

    if (!this.reducedMotion) {
      this.updateMarineSnow(frameSeconds);
    }

    const scheduleUpdate = advanceEncounterSchedule(
      this.encounterScheduleState,
      nextProgression.elapsedSeconds,
    );
    this.encounterScheduleState = scheduleUpdate.state;
    this.updateEncounterObjects(nextProgression.elapsedSeconds);
    for (const spawn of scheduleUpdate.spawns) {
      this.spawnEncounter(spawn, nextProgression.elapsedSeconds);
    }
    this.updateEncounterObjects(nextProgression.elapsedSeconds);

    const speciesScheduleUpdate = advanceSpeciesSpawnSchedule(
      this.speciesScheduleState,
      nextProgression.elapsedSeconds,
    );
    this.speciesScheduleState = speciesScheduleUpdate.state;
    this.updateSpeciesObjects(nextProgression.elapsedSeconds);
    for (const request of speciesScheduleUpdate.spawns) {
      this.spawnSpecies(request, nextProgression.depthM, nextProgression.elapsedSeconds);
    }
    this.updateSpeciesObjects(nextProgression.elapsedSeconds);

    const joystickVector = this.joystick?.getVector();
    const input = joystickVector && joystickVector.magnitude > 0
      ? joystickVector
      : this.readKeyboardVector();
    const speed = 180;
    const seconds = Math.min(delta, 50) / 1000;

    this.player.x = Phaser.Math.Clamp(
      this.player.x + input.x * speed * seconds,
      34,
      GAME_WIDTH - 34,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + input.y * speed * seconds,
      134,
      GAME_HEIGHT - 198,
    );

    this.resolveSpeciesInteractions();
    this.resolveEncounterCollisions();
  }

  public togglePaused(): void {
    this.paused = !this.paused;
    const pauseButton = document.getElementById('pause-button');
    const pauseGlyph = document.getElementById('pause-glyph');
    const pauseOverlay = document.getElementById('pause-overlay');
    const container = document.getElementById('game-container');

    pauseButton?.setAttribute('aria-pressed', String(this.paused));
    pauseButton?.setAttribute(
      'aria-label',
      this.paused ? '潜航を再開' : '一時停止',
    );
    pauseButton?.setAttribute('data-paused', String(this.paused));
    pauseGlyph?.replaceChildren(this.paused ? '▶' : 'II');
    pauseOverlay?.toggleAttribute('hidden', !this.paused);
    if (this.paused) {
      container?.setAttribute('data-paused', 'true');
      announce('潜航を停止しました。');
      this.scene.pause();
    } else {
      container?.removeAttribute('data-paused');
      announce('潜航を再開しました。');
      this.scene.resume();
    }
  }

  private spawnEncounter(
    spawn: EncounterSpawn,
    elapsedSeconds: number,
  ): void {
    this.updateEncounterObjects(elapsedSeconds);

    const limit = spawn.kind === 'rock' ? MAX_ROCKS : MAX_RECOVERY_ITEMS;
    const activeCount = this.encounters.filter(
      (encounter) => encounter.kind === spawn.kind,
    ).length;
    if (activeCount >= limit) {
      this.removeOldestEncounter(spawn.kind);
    }

    const radius = spawn.kind === 'rock'
      ? ROCK_RADIUS_BY_LANE[spawn.lane]
      : RECOVERY_COLLISION_RADIUS;
    const display = spawn.kind === 'rock'
      ? this.createRockDisplay(radius)
      : this.createRecoveryDisplay();
    const encounter: EncounterObject = {
      display,
      kind: spawn.kind,
      lane: spawn.lane,
      spawnAtSeconds: spawn.atSeconds,
      speedPxPerSecond: spawn.kind === 'rock'
        ? ROCK_SPEED_PX_PER_SECOND
        : RECOVERY_SPEED_PX_PER_SECOND,
      radius,
      sequence: this.encounterSequence,
      damageIgnored: false,
    };
    this.encounterSequence += 1;
    this.encounters.push(encounter);
    display.x = LANE_X_BY_NAME[spawn.lane];
    display.y = ENCOUNTER_SPAWN_Y;
  }

  private spawnSpecies(
    request: SpeciesSpawnRequest,
    depthM: number,
    elapsedSeconds: number,
  ): void {
    const species = selectSpeciesForDepth(
      SPECIES_CATALOG,
      APPROVED_SPECIES_ASSETS,
      depthM,
      request.ordinal,
    );
    if (
      !species ||
      !canSpawnSpecies(this.speciesEncounters.length, MAX_ACTIVE_SPECIES)
    ) {
      return;
    }

    const pattern = getSpeciesMotionPatternForSpecies(species, request.ordinal);
    const position = chooseNonOverlappingSpeciesMotionPosition(
      request.ordinal,
      pattern,
      SPECIES_COLLISION_RADIUS,
      this.getOccupiedSpawnCircles(),
    );
    if (!position) {
      return;
    }

    const laneCoordinate = pattern === 'left_to_right' || pattern === 'right_to_left'
      ? position.y
      : position.x;
    const motionPlan = createSpeciesMotionPlan(
      pattern,
      laneCoordinate,
      getSpeciesScrollSpeed(species.behavior),
      position.radius,
    );
    const display = this.createSpeciesDisplay(species, motionPlan.direction.x);
    const encounter: SpeciesObject = {
      display,
      species,
      spawnAtSeconds: request.atSeconds,
      motionPlan,
      radius: position.radius,
      sequence: this.speciesSequence,
      interactionState: {
        discovered: false,
        collected: false,
      },
    };
    this.speciesSequence += 1;
    this.speciesEncounters.push(encounter);
    display.x = motionPlan.start.x;
    display.y = motionPlan.start.y;
    this.updateSpeciesObjects(elapsedSeconds);
  }

  private createSpeciesDisplay(
    species: SpawnableSpecies,
    horizontalDirection: number,
  ): Phaser.GameObjects.Container {
    const halo = this.add
      .circle(0, 0, SPECIES_COLLISION_RADIUS + 7, 0x04121a)
      .setAlpha(0.38)
      .setStrokeStyle(1, 0x6bd9e8, 0.68);
    const image = this.add
      .image(0, 0, species.textureKey)
      .setAlpha(0.96);
    const imageWidth = Math.max(1, image.width);
    const imageHeight = Math.max(1, image.height);
    image.setScale(Math.min(48 / imageWidth, 48 / imageHeight));
    image.setFlipX(horizontalDirection < 0);

    const display = this.add.container(0, 0);
    display.add([halo, image]);
    display.setName(species.acceptedScientificName);
    return display;
  }

  private getOccupiedSpawnCircles(): Circle[] {
    return [
      ...this.encounters.map((encounter) => ({
        x: encounter.display.x,
        y: encounter.display.y,
        radius: encounter.radius,
      })),
      ...this.speciesEncounters.map((encounter) => ({
        x: encounter.display.x,
        y: encounter.display.y,
        radius: encounter.radius,
      })),
    ];
  }

  private updateSpeciesObjects(elapsedSeconds: number): void {
    for (let index = this.speciesEncounters.length - 1; index >= 0; index -= 1) {
      const encounter = this.speciesEncounters[index];
      if (!encounter) {
        continue;
      }

      const ageSeconds = Math.max(
        0,
        elapsedSeconds - encounter.spawnAtSeconds,
      );
      const position = getSpeciesMotionPosition(
        encounter.motionPlan,
        ageSeconds,
      );
      encounter.display.x = position.x;
      encounter.display.y = position.y;

      if (hasSpeciesMotionExited(encounter.motionPlan, position)) {
        this.removeSpeciesAt(index);
      }
    }
  }

  private resolveSpeciesInteractions(): void {
    if (!this.player) {
      return;
    }

    const playerCircle: Circle = {
      x: this.player.x,
      y: this.player.y,
      radius: PLAYER_COLLISION_RADIUS,
    };

    for (let index = this.speciesEncounters.length - 1; index >= 0; index -= 1) {
      const encounter = this.speciesEncounters[index];
      if (!encounter) {
        continue;
      }

      const result = resolveSpeciesInteraction(
        encounter.interactionState,
        playerCircle,
        {
          x: encounter.display.x,
          y: encounter.display.y,
          radius: encounter.radius,
        },
        encounter.species.score,
      );
      encounter.interactionState = result.nextState;
      const key = encounter.species.acceptedScientificName;
      const displayName = encounter.species.displayName;

      if (result.discoveredNow) {
        const isNewDiscovery = !this.discoveredSpecies.has(key);
        this.discoveredSpecies.add(key);
        this.persistSpeciesDiscovery(key);
        if (isNewDiscovery) {
          this.showEncounterEvent('SPECIES DETECTED / ' + displayName, 'species');
          announce('生物を発見しました。' + displayName + '。');
        }
      }

      if (!result.collectedNow) {
        continue;
      }

      this.collectedSpecies[key] = (this.collectedSpecies[key] ?? 0) + 1;
      this.persistSpeciesCollection(key);
      this.speciesScore += result.scoreDelta;
      this.updateHud();
      this.showEncounterEvent(
        'SPECIES ACQUIRED / +' + String(result.scoreDelta),
        'species',
      );
      announce(
        '生物を獲得しました。' + displayName + '、' +
          String(result.scoreDelta) + '点。',
      );
      this.removeSpeciesAt(index);
    }
  }

  private persistSpeciesDiscovery(acceptedScientificName: string): void {
    const progress = recordSpeciesDiscovery(
      readDiscoveryProgress(),
      acceptedScientificName,
    );
    writeDiscoveryProgress(progress);
    this.game.events.emit('shinkai:discovery-progress', progress);
  }

  private persistSpeciesCollection(acceptedScientificName: string): void {
    const progress = recordSpeciesCollection(
      readDiscoveryProgress(),
      acceptedScientificName,
    );
    writeDiscoveryProgress(progress);
    this.game.events.emit('shinkai:discovery-progress', progress);
  }

  private removeSpeciesAt(index: number): void {
    const encounter = this.speciesEncounters[index];
    if (!encounter) {
      return;
    }

    this.speciesEncounters.splice(index, 1);
    encounter.display.destroy();
  }

  private destroySpeciesObjects(): void {
    for (const encounter of this.speciesEncounters) {
      encounter.display.destroy();
    }
    this.speciesEncounters.length = 0;
  }

  private createRockDisplay(
    radius: number,
  ): Phaser.GameObjects.Container {
    const points = [
      { x: -radius * 0.86, y: -radius * 0.48 },
      { x: -radius * 0.38, y: -radius * 0.96 },
      { x: radius * 0.42, y: -radius * 0.78 },
      { x: radius * 0.9, y: -radius * 0.08 },
      { x: radius * 0.62, y: radius * 0.68 },
      { x: radius * 0.02, y: radius * 0.96 },
      { x: -radius * 0.74, y: radius * 0.62 },
    ];
    const shadow = this.add.graphics();
    shadow.fillStyle(0x02070b, 0.72);
    this.drawFilledPolygon(
      shadow,
      points.map((point) => ({ x: point.x + 3, y: point.y + 4 })),
    );
    const body = this.add.graphics();
    body.fillStyle(0x07131a, 0.94);
    body.lineStyle(2, IMPACT_HULL_COLOR, 0.72);
    this.drawOutlinedPolygon(body, points);

    const container = this.add.container(0, 0);
    container.add([shadow, body]);
    return container;
  }

  private createRecoveryDisplay(): Phaser.GameObjects.Container {
    const glow = this.add.graphics();
    glow.fillStyle(0x74f2d0, 0.08);
    glow.fillRect(-16, -11, 32, 22);

    const capsule = this.add.graphics();
    capsule.fillStyle(0x74f2d0, 0.08);
    capsule.lineStyle(2, 0x74f2d0, 0.92);
    capsule.strokeRect(-13, -8, 26, 16);
    capsule.beginPath();
    capsule.moveTo(13, -4);
    capsule.lineTo(18, -4);
    capsule.moveTo(13, 4);
    capsule.lineTo(18, 4);
    capsule.moveTo(-4, 0);
    capsule.lineTo(4, 0);
    capsule.moveTo(0, -4);
    capsule.lineTo(0, 4);
    capsule.strokePath();

    const container = this.add.container(0, 0);
    container.add([glow, capsule]);
    return container;
  }

  private updateEncounterObjects(elapsedSeconds: number): void {
    for (let index = this.encounters.length - 1; index >= 0; index -= 1) {
      const encounter = this.encounters[index];
      if (!encounter) {
        continue;
      }

      const ageSeconds = Math.max(
        0,
        elapsedSeconds - encounter.spawnAtSeconds,
      );
      encounter.display.x = LANE_X_BY_NAME[encounter.lane];
      encounter.display.y = ENCOUNTER_SPAWN_Y -
        encounter.speedPxPerSecond * ageSeconds;

      if (encounter.display.y <= ENCOUNTER_DESPAWN_Y) {
        this.removeEncounterAt(index);
      }
    }
  }

  private resolveEncounterCollisions(): void {
    if (!this.player) {
      return;
    }

    const playerCircle = {
      x: this.player.x,
      y: this.player.y,
      radius: PLAYER_COLLISION_RADIUS,
    };

    for (let index = this.encounters.length - 1; index >= 0; index -= 1) {
      const encounter = this.encounters[index];
      if (!encounter) {
        continue;
      }

      if (!circlesOverlap(playerCircle, {
        x: encounter.display.x,
        y: encounter.display.y,
        radius: encounter.radius,
      })) {
        continue;
      }

      if (encounter.kind === 'rock') {
        if (encounter.damageIgnored) {
          continue;
        }

        if (!canTakeRockDamage(this.invulnerabilityRemainingSeconds)) {
          encounter.damageIgnored = true;
          continue;
        }

        this.removeEncounterAt(index);
        const previousStatus = this.diveProgression.status;
        this.diveProgression = adjustDiveFuel(
          this.diveProgression,
          -ROCK_FUEL_DAMAGE,
        );
        this.invulnerabilityRemainingSeconds = ROCK_INVULNERABILITY_SECONDS;
        this.playerImpactRemainingSeconds = PLAYER_IMPACT_DISPLAY_SECONDS;
        this.playerHull?.setStrokeStyle(2, IMPACT_HULL_COLOR, 1);
        this.triggerImpactFeedback();
        this.showEncounterEvent('HULL IMPACT / FUEL -10', 'impact');
        this.updateHud();
        announce('船体に衝突しました。燃料が10減少しました。');
        if (previousStatus !== this.diveProgression.status) {
          this.announceTerminalStatus(this.diveProgression.status);
          this.transitionToResult();
          return;
        }
        continue;
      }

      this.removeEncounterAt(index);
      const previousStatus = this.diveProgression.status;
      this.diveProgression = adjustDiveFuel(
        this.diveProgression,
        RECOVERY_FUEL_GAIN,
      );
      if (previousStatus === this.diveProgression.status) {
        const message = this.diveProgression.fuel >= DIVE_MAX_FUEL
          ? 'FUEL FULL / 100%'
          : 'FUEL RECOVERED / +25';
        this.showEncounterEvent(message, 'recovery');
        this.updateHud();
        announce(
          this.diveProgression.fuel >= DIVE_MAX_FUEL
            ? '燃料が満タンになりました。'
            : '燃料を25回復しました。',
        );
      }
    }
  }

  private removeOldestEncounter(kind: EncounterObject['kind']): void {
    let oldestIndex = -1;
    let oldestSequence = Number.POSITIVE_INFINITY;
    for (let index = 0; index < this.encounters.length; index += 1) {
      const encounter = this.encounters[index];
      if (encounter?.kind === kind && encounter.sequence < oldestSequence) {
        oldestIndex = index;
        oldestSequence = encounter.sequence;
      }
    }

    if (oldestIndex >= 0) {
      this.removeEncounterAt(oldestIndex);
    }
  }

  private removeEncounterAt(index: number): void {
    const encounter = this.encounters[index];
    if (!encounter) {
      return;
    }

    this.encounters.splice(index, 1);
    encounter.display.destroy();
  }

  private destroyEncounterObjects(): void {
    for (const encounter of this.encounters) {
      encounter.display.destroy();
    }
    this.encounters.length = 0;
  }

  private updateEncounterEvent(seconds: number): void {
    if (this.encounterEventRemainingSeconds <= 0) {
      return;
    }

    this.encounterEventRemainingSeconds = Math.max(
      0,
      this.encounterEventRemainingSeconds - seconds,
    );
    if (this.encounterEventRemainingSeconds === 0) {
      this.clearEncounterEvent();
    }
  }

  private showEncounterEvent(
    message: string,
    kind: 'impact' | 'recovery' | 'species',
  ): void {
    this.encounterEventRemainingSeconds = ENCOUNTER_EVENT_DURATION_SECONDS;
    const eventElement = document.getElementById('encounter-event');
    eventElement?.setAttribute('data-kind', kind);
    eventElement?.replaceChildren(message);
    eventElement?.removeAttribute('hidden');
  }

  private clearEncounterEvent(): void {
    this.encounterEventRemainingSeconds = 0;
    const eventElement = document.getElementById('encounter-event');
    eventElement?.setAttribute('hidden', '');
    eventElement?.removeAttribute('data-kind');
    eventElement?.replaceChildren();
  }

  private triggerImpactFeedback(): void {
    this.clearImpactFeedback();

    const feedbackElement = document.getElementById('impact-feedback');
    if (feedbackElement) {
      void feedbackElement.offsetWidth;
      feedbackElement.classList.add('is-active');
    }

    if (!this.reducedMotion) {
      const targets = document.querySelectorAll<HTMLElement>(
        '#game-container > canvas, #game-ui .game-hud, #game-ui .game-actions, ' +
        '#game-ui .dive-status, #game-ui .encounter-event',
      );
      targets.forEach((target) => {
        void target.offsetWidth;
        target.classList.add('impact-shake');
      });
    }

    this.impactFeedbackTimer = window.setTimeout(() => {
      this.clearImpactFeedback();
    }, IMPACT_FEEDBACK_DURATION_MS);
  }

  private clearImpactFeedback(): void {
    if (this.impactFeedbackTimer !== undefined) {
      window.clearTimeout(this.impactFeedbackTimer);
      this.impactFeedbackTimer = undefined;
    }

    document.getElementById('impact-feedback')?.classList.remove('is-active');
    document.querySelectorAll<HTMLElement>(
      '#game-container > canvas, #game-ui .game-hud, #game-ui .game-actions, ' +
      '#game-ui .dive-status, #game-ui .encounter-event',
    ).forEach((target) => target.classList.remove('impact-shake'));
  }

  private updatePlayerImpact(seconds: number): void {
    this.playerImpactRemainingSeconds = Math.max(
      0,
      this.playerImpactRemainingSeconds - seconds,
    );
    this.playerHull?.setStrokeStyle(
      2,
      this.playerImpactRemainingSeconds > 0
        ? IMPACT_HULL_COLOR
        : NORMAL_HULL_COLOR,
      this.playerImpactRemainingSeconds > 0 ? 1 : 0.86,
    );
  }

  private drawFilledPolygon(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { x: number; y: number }[],
  ): void {
    const first = points[0];
    if (!first) {
      return;
    }

    graphics.beginPath();
    graphics.moveTo(first.x, first.y);
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private drawOutlinedPolygon(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { x: number; y: number }[],
  ): void {
    this.drawFilledPolygon(graphics, points);
    graphics.strokePath();
  }

  private readKeyboardVector(): InputVector {
    let x = 0;
    let y = 0;

    if (this.cursors?.left.isDown || this.wasd?.left.isDown) {
      x -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.right.isDown) {
      x += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.up.isDown) {
      y -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.down.isDown) {
      y += 1;
    }

    const magnitude = Math.hypot(x, y);
    if (magnitude === 0) {
      return { x: 0, y: 0, magnitude: 0 };
    }

    const scale = Math.min(1, 1 / magnitude);
    return { x: x * scale, y: y * scale, magnitude: Math.min(1, magnitude) };
  }

  private updateHud(): void {
    const depth = Number.isFinite(this.diveProgression.depthM)
      ? Math.max(0, Math.floor(this.diveProgression.depthM))
      : 0;
    const fuel = Number.isFinite(this.diveProgression.fuel)
      ? Phaser.Math.Clamp(this.diveProgression.fuel, 0, DIVE_MAX_FUEL)
      : 0;
    const statusText = this.getStatusText();
    const snapshot: HudSnapshot = {
      depthText: `${String(depth).padStart(4, '0')} m`,
      fuelText: `${fuel.toFixed(1)}%`,
      fuelMeterValue: String(fuel),
      scoreText: String(Math.max(0, Math.floor(this.speciesScore))),
      statusPrimary: statusText.primary,
      statusSecondary: statusText.secondary,
    };

    if (!this.hudSnapshot || this.hudSnapshot.depthText !== snapshot.depthText) {
      document.getElementById('depth-readout')?.replaceChildren(snapshot.depthText);
    }
    if (!this.hudSnapshot || this.hudSnapshot.fuelText !== snapshot.fuelText) {
      document.getElementById('fuel-readout')?.replaceChildren(snapshot.fuelText);
    }
    if (
      !this.hudSnapshot ||
      this.hudSnapshot.fuelMeterValue !== snapshot.fuelMeterValue
    ) {
      document
        .getElementById('fuel-meter')
        ?.setAttribute('aria-valuenow', snapshot.fuelMeterValue);
      const fuelFill = document.getElementById('fuel-meter-fill');
      if (fuelFill instanceof HTMLElement) {
        fuelFill.style.width = `${snapshot.fuelMeterValue}%`;
      }
    }

    if (!this.hudSnapshot || this.hudSnapshot.scoreText !== snapshot.scoreText) {
      document.getElementById('score-readout')?.replaceChildren(snapshot.scoreText);
    }

    if (
      !this.hudSnapshot ||
      this.hudSnapshot.statusPrimary !== snapshot.statusPrimary ||
      this.hudSnapshot.statusSecondary !== snapshot.statusSecondary
    ) {
      const statusElement = document.getElementById('dive-status');
      statusElement?.children.item(0)?.replaceChildren(snapshot.statusPrimary);
      statusElement?.children.item(1)?.replaceChildren(snapshot.statusSecondary);
    }

    this.hudSnapshot = snapshot;
  }

  private getStatusText(): { primary: string; secondary: string } {
    switch (this.diveProgression.status) {
      case 'cleared':
        return { primary: 'TARGET REACHED', secondary: '' };
      case 'depleted':
        return { primary: 'FUEL EMPTY', secondary: '' };
      case 'descending':
        return {
          primary: 'DESCENDING',
          secondary: `AUTO / ${DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND} M/S`,
        };
    }
  }

  private transitionToResult(): void {
    if (this.terminalTransitionStarted) {
      return;
    }

    const status = this.diveProgression.status;
    if (status === 'descending') {
      return;
    }

    this.terminalTransitionStarted = true;
    this.paused = true;
    this.resetInput();
    this.destroyEncounterObjects();
    this.clearEncounterEvent();

    const result = createDiveResultSnapshot(this.diveProgression, {
      score: this.speciesScore,
      discoveredCount: this.discoveredSpecies.size,
      collectedCount: Object.values(this.collectedSpecies).reduce(
        (total, count) => total + count,
        0,
      ),
    });
    this.scene.start('ResultScene', { result });
  }

  private announceTerminalStatus(status: DiveProgressionState['status']): void {
    if (status === 'cleared') {
      announce(`目標深度${DIVE_TARGET_DEPTH_M.toLocaleString('en-US')}mに到達しました。`);
    } else if (status === 'depleted') {
      announce('燃料が空になったため、潜航を停止しました。');
    }
  }

  private createMarineSnow(): void {
    for (const particle of MARINE_SNOW_LAYOUT) {
      this.marineSnow.push({
        sprite: this.add.circle(
          particle.x,
          particle.y,
          particle.radius,
          particle.color,
        ).setAlpha(particle.alpha),
        speedPxPerSecond: particle.speed,
      });
    }
  }

  private updateMarineSnow(seconds: number): void {
    if (seconds <= 0) {
      return;
    }

    const wrapHeight = MARINE_SNOW_BOTTOM - MARINE_SNOW_TOP;
    for (const particle of this.marineSnow) {
      particle.sprite.y -= particle.speedPxPerSecond * seconds;
      while (particle.sprite.y < MARINE_SNOW_TOP) {
        particle.sprite.y += wrapHeight;
      }
    }
  }

  private readonly handlePauseKey = (): void => {
    this.togglePaused();
  };

  private readonly handleLifecycleStatus = (status: MobileLifecycleStatus): void => {
    this.lifecyclePaused = status.shouldPauseGame;
    if (this.lifecyclePaused) {
      this.resetInput();
    }
  };

  private resetInput(): void {
    this.joystick?.reset();
    this.input.keyboard?.resetKeys();
  }

  private readonly cleanup = (): void => {
    this.game.events.off('shinkai:lifecycle', this.handleLifecycleStatus);
    this.destroyEncounterObjects();
    this.destroySpeciesObjects();
    this.clearEncounterEvent();
    this.clearImpactFeedback();
    this.player = undefined;
    this.playerHull = undefined;
    this.resetInput();
    this.joystick?.destroy();
    this.joystick = undefined;
    this.input.keyboard?.off('keydown-P', this.handlePauseKey);
    this.input.keyboard?.off('keydown-ESC', this.handlePauseKey);
    document.getElementById('game-ui')?.setAttribute('hidden', '');
    document.getElementById('title-ui')?.removeAttribute('hidden');
    document.getElementById('result-ui')?.setAttribute('hidden', '');
    document.getElementById('pause-overlay')?.setAttribute('hidden', '');
    document.getElementById('game-container')?.removeAttribute('data-paused');
    const pauseGlyph = document.getElementById('pause-glyph');
    pauseGlyph?.replaceChildren('II');
    document.getElementById('pause-button')?.setAttribute('aria-label', '一時停止');
    document.getElementById('pause-button')?.setAttribute('aria-pressed', 'false');
    document.getElementById('pause-button')?.removeAttribute('data-paused');
  };
}
