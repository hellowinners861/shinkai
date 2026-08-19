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
  canTakeRockDamage,
  circlesOverlap,
  PLAYER_COLLISION_RADIUS,
  RECOVERY_COLLISION_RADIUS,
  RECOVERY_FUEL_GAIN,
  ROCK_FUEL_DAMAGE,
  ROCK_INVULNERABILITY_SECONDS,
  updateInvulnerability,
  type EncounterLane,
  type EncounterSpawn,
} from '../game/encounterRules';
import {
  generateHazardWaves,
  getDepthBandNumber,
  scheduleRecoverySpawns,
  type HazardBand,
  type HazardWave,
  type RecoverySpawn,
} from '../game/hazardWaveRules';
import {
  advanceSpeciesSpawnSchedule,
  canSpawnSpecies,
  createInitialSpeciesScheduleState,
  getPixelSpeciesAtDepth,
  MAX_ACTIVE_SPECIES,
  SPECIES_COLLISION_RADIUS,
  type CatalogSpeciesRecord,
  type SpeciesSpawnRequest,
  type SpawnableSpecies,
} from '../game/speciesRules';
import {
  createSpeciesBehaviorPlan,
  getSpeciesBehaviorPosition,
  getSpeciesBehaviorVisualState,
  hasSpeciesBehaviorExited,
  type SpeciesBehaviorPlan,
} from '../game/speciesBehaviorRules';
import {
  getDepthChapter,
  getDepthChapterNumber,
  getChapterTransitions,
  type DepthChapterNumber,
} from '../game/chapterRules';
import { selectPixelSpeciesForDepthWithOptions } from '../game/speciesSelectionRules';
import {
  advanceLargeCreatureEvent,
  advanceLargeCreatureEventIdentification,
  applyLargeCreatureEventCollision,
  createInitialLargeCreatureEventState,
  getLargeCreatureEventCandidate,
  LARGE_CREATURE_EVENT_CANDIDATE_IDS,
  LARGE_CREATURE_EVENT_DURATION_SECONDS,
  LARGE_CREATURE_EVENT_PATH_Y,
  LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
  LARGE_CREATURE_EVENT_SCORE,
  shouldSuspendNormalSpeciesSpawn,
  type LargeCreatureEventState,
} from '../game/largeCreatureEventRules';
import {
  drawSpeciesPixelIcon,
  getSpeciesPixelIconDefinitionForSpecies,
} from '../game/speciesPixelIcons';
import {
  advanceScanTarget,
  getScanProgressPercent,
  getScanRequiredSeconds,
  type ScanTarget,
} from '../game/scanRules';
import {
  awardFixedScanScore,
  applyRockDamage,
  calculateScoreBreakdown,
  completeScan,
  createInitialScoreState,
  type ScoreState,
} from '../game/scoreRules';
import type { InputVector } from '../input/vector';
import {
  advanceSearchlightAngle,
  SEARCHLIGHT_HALF_ANGLE_RADIANS,
  SEARCHLIGHT_RANGE_PX,
  selectSearchlightTargetWithPriority,
  type SearchlightTarget,
} from '../game/searchlightRules';
import {
  createSubmarineView,
  destroySubmarineView,
  drawSearchlightBeam,
  updateSubmarineView as updateSubmarineRendererView,
  type SubmarineView,
} from '../game/submarineRenderer';
import {
  createSpeciesScanGaugeView,
  destroySpeciesScanGaugeView,
  isSpeciesScanGaugeCompletionHoldElapsed,
  updateSpeciesScanGaugeView,
  type SpeciesScanGaugeView,
} from '../game/speciesScanGauge';
import {
  isScanRailCompletionHoldActive,
  selectScanRailPresentation,
} from '../game/scanPresentationRules';
import { VirtualJoystick } from '../input/VirtualJoystick';
import type { MobileLifecycleStatus } from '../platform/mobileLifecycle';
import { announce, prefersReducedMotion } from '../platform/preferences';
import {
  createEmptyRunProgress,
  readRunProgress,
  updateRunProgress,
  writeRunProgress,
} from '../platform/runProgressStore';
import {
  createDiveResultSnapshot,
  type DiveResultNewDiscovery,
} from '../types/game';

interface KeyboardSet {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

interface LightKeyboardSet {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

interface MarineSnowParticle {
  sprite: Phaser.GameObjects.Arc;
  baseSpeedPxPerSecond: number;
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
  scanGauge: SpeciesScanGaugeView;
  species: SpawnableSpecies;
  spawnAtSeconds: number;
  behaviorPlan: SpeciesBehaviorPlan;
  radius: number;
  sequence: number;
  scanId: string;
  progressSeconds: number;
  completed: boolean;
  globallyNew: boolean;
  illuminated: boolean;
  visualAlpha: number;
  completionStartedAtSeconds: number | undefined;
}

interface LargeCreatureObject {
  display: Phaser.GameObjects.Container;
  scanGauge: SpeciesScanGaugeView;
  species: SpawnableSpecies;
  radius: number;
  scanId: string;
  ageSeconds: number;
  illuminated: boolean;
  visualAlpha: number;
  completionStartedAtSeconds: number | undefined;
}

interface ActiveScanStatus {
  sourceCatalogId: string;
  displayName: string;
  progressSeconds: number;
  requiredSeconds: number;
  progressPercent: number;
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
const LARGE_CONTACT_FEEDBACK_DURATION_MS = 360;
const GAME_OBJECT_DEPTH = Object.freeze({
  background: -100,
  predictionPath: 5,
  largeCreature: 10,
  species: 20,
  searchlightBeam: 30,
  dimOverlay: 35,
  player: 40,
  chapterOverlay: 50,
});
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
  private submarineView: SubmarineView | undefined;
  private joystick: VirtualJoystick | undefined;
  private searchlightJoystick: VirtualJoystick | undefined;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: KeyboardSet | undefined;
  private lightKeys: LightKeyboardSet | undefined;
  private searchlightAngleRadians = 0;
  private searchlightTargetAngleRadians = 0;
  private searchlightBeam: Phaser.GameObjects.Graphics | undefined;
  private paused = false;
  private terminalTransitionStarted = false;
  private lifecyclePaused = false;
  private reducedMotion = false;
  private diveProgression: DiveProgressionState =
    createInitialDiveProgressionState();
  private encounters: EncounterObject[] = [];
  private encounterSequence = 0;
  private hazardWaves: readonly HazardWave[] = [];
  private hazardRockSpawns: readonly EncounterSpawn[] = [];
  private hazardRockSpawnIndex = 0;
  private recoverySpawns: readonly RecoverySpawn[] = [];
  private recoverySpawnIndex = 0;
  private warnedHazardWaveIndices = new Set<number>();
  private hazardWarningWaveIndex: number | undefined;
  private hazardWarningGraphics: Phaser.GameObjects.Graphics | undefined;
  private hazardWarningLabel: Phaser.GameObjects.Text | undefined;
  private currentZone: HazardBand = 1;
  private currentChapter: DepthChapterNumber = 1;
  private lastChapterDepthM = 0;
  private backgroundGraphics: Phaser.GameObjects.Graphics | undefined;
  private chapterTransitionOverlay: Phaser.GameObjects.Rectangle | undefined;
  private chapterBandRemainingSeconds = 0;
  private speciesScheduleState = createInitialSpeciesScheduleState();
  private speciesEncounters: SpeciesObject[] = [];
  private speciesSequence = 0;
  private knownSpecies = new Set<string>();
  private discoveredSpecies = new Set<string>();
  private collectedSpecies: Record<string, number> = {};
  private scoreState: ScoreState = createInitialScoreState();
  private activeScanStatus: ActiveScanStatus | undefined;
  private largeCreatureState: LargeCreatureEventState =
    createInitialLargeCreatureEventState();
  private largeCreature: LargeCreatureObject | undefined;
  private largeCreaturePathGraphics: Phaser.GameObjects.Graphics | undefined;
  private largeCreatureDimOverlay: Phaser.GameObjects.Rectangle | undefined;
  private largeContactFeedbackTimer: number | undefined;
  private encounterEventPriority = 0;
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
    this.destroyLargeCreatureObjects();
    this.clearHazardWarning();
    this.searchlightAngleRadians = 0;
    this.searchlightTargetAngleRadians = 0;
    this.encounterSequence = 0;
    this.hazardWaves = generateHazardWaves({ seed: 11 });
    const rockTravelSeconds =
      (ENCOUNTER_SPAWN_Y - GAME_HEIGHT / 2) / ROCK_SPEED_PX_PER_SECOND;
    this.hazardRockSpawns = this.hazardWaves
      .flatMap((wave) => wave.rocks.map((rock) => ({
        kind: 'rock' as const,
        lane: rock.lane,
        atSeconds: Math.max(0, rock.atSeconds - rockTravelSeconds),
      })))
      .sort((first, second) => first.atSeconds - second.atSeconds);
    this.hazardRockSpawnIndex = 0;
    this.recoverySpawns = scheduleRecoverySpawns({
      hazardWaves: this.hazardWaves,
    }).spawns;
    this.recoverySpawnIndex = 0;
    this.warnedHazardWaveIndices.clear();
    this.hazardWarningWaveIndex = undefined;
    this.currentZone = getDepthBandNumber(0);
    this.currentChapter = getDepthChapterNumber(0);
    this.lastChapterDepthM = 0;
    this.chapterBandRemainingSeconds = 0;
    this.game.registry.set('shinkai.zone', this.currentZone);
    this.game.registry.set('shinkai.chapter', this.currentChapter);
    this.destroySpeciesObjects();
    this.clearActiveScanPresentation();
    this.speciesScheduleState = createInitialSpeciesScheduleState();
    this.speciesSequence = 0;
    this.knownSpecies = new Set(readDiscoveryProgress().discoveredSpecies);
    let diveCount = 0;
    try {
      diveCount = readRunProgress().diveCount;
    } catch {
      diveCount = 0;
    }
    this.largeCreatureState = createInitialLargeCreatureEventState({
      knownSpecies: this.knownSpecies,
      diveCount,
    });
    this.discoveredSpecies = new Set<string>();
    this.collectedSpecies = {};
    this.scoreState = createInitialScoreState();
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
    background.setDepth(GAME_OBJECT_DEPTH.background);
    this.backgroundGraphics = background;
    this.drawChapterBackground(getDepthChapter(this.currentChapter), true);
    this.chapterTransitionOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d3440)
      .setOrigin(0)
      .setDepth(GAME_OBJECT_DEPTH.chapterOverlay)
      .setAlpha(0);
    this.largeCreatureDimOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02070b)
      .setOrigin(0)
      .setDepth(GAME_OBJECT_DEPTH.dimOverlay)
      .setAlpha(0);
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

    this.searchlightBeam = this.add.graphics().setDepth(
      GAME_OBJECT_DEPTH.searchlightBeam,
    );

    this.submarineView = createSubmarineView(this);
    this.submarineView.root.setDepth(GAME_OBJECT_DEPTH.player);
    this.player = this.submarineView.root;

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as KeyboardSet;
      this.lightKeys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.I,
        down: Phaser.Input.Keyboard.KeyCodes.K,
        left: Phaser.Input.Keyboard.KeyCodes.J,
        right: Phaser.Input.Keyboard.KeyCodes.L,
      }) as LightKeyboardSet;
      this.input.keyboard.on('keydown-P', this.handlePauseKey);
      this.input.keyboard.on('keydown-ESC', this.handlePauseKey);
    }

    const joystickElement = document.getElementById('virtual-joystick');
    if (joystickElement) {
      this.joystick = new VirtualJoystick(joystickElement);
    }
    const searchlightJoystickElement = document.getElementById(
      'searchlight-joystick',
    );
    if (searchlightJoystickElement) {
      this.searchlightJoystick = new VirtualJoystick(searchlightJoystickElement);
    }

    this.events.once('shutdown', this.cleanup);
    this.updateHud();
    announce('潜航計器を起動しました。操舵環またはキーボードで操作します。');
    this.updateZone(0, true);
  }

  public update(_time: number, delta: number): void {
    if (!this.player || this.paused || this.lifecyclePaused || this.terminalTransitionStarted) {
      return;
    }

    const frameSeconds = clampDiveFrameSeconds(delta / 1000);
    this.updateEncounterEvent(frameSeconds);
    this.updateChapterBand(frameSeconds);
    this.invulnerabilityRemainingSeconds = updateInvulnerability(
      this.invulnerabilityRemainingSeconds,
      frameSeconds,
    );
    this.updatePlayerImpact(frameSeconds);

    if (this.diveProgression.status !== 'descending') {
      return;
    }

    const previousStatus = this.diveProgression.status;
    const previousDepthM = this.diveProgression.depthM;
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
    this.updateZone(nextProgression.depthM);
    this.advanceLargeCreatureEventState(
      previousDepthM,
      nextProgression.depthM,
      frameSeconds,
      nextProgression.elapsedSeconds,
    );

    if (!this.reducedMotion) {
      this.updateMarineSnow(frameSeconds);
    }

    this.updateEncounterObjects(nextProgression.elapsedSeconds);
    this.spawnDueHazardEncounters(nextProgression.elapsedSeconds);
    this.spawnDueRecoveryEncounters(nextProgression.elapsedSeconds);
    this.updateEncounterObjects(nextProgression.elapsedSeconds);
    this.updateHazardWarning(nextProgression.elapsedSeconds);

    const speciesScheduleUpdate = advanceSpeciesSpawnSchedule(
      this.speciesScheduleState,
      nextProgression.elapsedSeconds,
    );
    this.speciesScheduleState = speciesScheduleUpdate.state;
    this.updateSpeciesObjects(nextProgression.elapsedSeconds);
    for (const request of speciesScheduleUpdate.spawns) {
      if (!shouldSuspendNormalSpeciesSpawn(
        this.largeCreatureState,
        this.largeCreature !== undefined,
      )) {
        this.spawnSpecies(
          request,
          nextProgression.depthM,
          nextProgression.elapsedSeconds,
        );
      }
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

    this.updateSearchlight(frameSeconds);
    this.updateSubmarinePresentation(nextProgression.elapsedSeconds);
    this.renderSearchlightBeam();
    this.updateLargeCreatureObjects(frameSeconds);
    this.updateSpeciesScans(frameSeconds);
    this.resolveEncounterCollisions();
    this.resolveLargeCreatureCollision();
  }

  private updateSearchlight(frameSeconds: number): void {
    const joystickVector = this.searchlightJoystick?.getVector();
    const input = joystickVector && joystickVector.magnitude > 0
      ? joystickVector
      : this.readSearchlightVector();

    if (input.magnitude > 0) {
      this.searchlightTargetAngleRadians = Math.atan2(input.y, input.x);
    }

    this.searchlightAngleRadians = this.reducedMotion
      ? this.searchlightTargetAngleRadians
      : advanceSearchlightAngle(
        this.searchlightAngleRadians,
        this.searchlightTargetAngleRadians,
        frameSeconds,
      );
  }

  private readSearchlightVector(): InputVector {
    let x = 0;
    let y = 0;
    if (this.lightKeys?.left.isDown) {
      x -= 1;
    }
    if (this.lightKeys?.right.isDown) {
      x += 1;
    }
    if (this.lightKeys?.up.isDown) {
      y -= 1;
    }
    if (this.lightKeys?.down.isDown) {
      y += 1;
    }

    const magnitude = Math.hypot(x, y);
    if (magnitude === 0) {
      return { x: 0, y: 0, magnitude: 0 };
    }

    const scale = Math.min(1, 1 / magnitude);
    return {
      x: x * scale,
      y: y * scale,
      magnitude: Math.min(1, magnitude),
    };
  }

  private renderSearchlightBeam(): void {
    if (!this.player || !this.searchlightBeam) {
      return;
    }

    drawSearchlightBeam(
      this.searchlightBeam,
      { x: this.player.x, y: this.player.y },
      this.searchlightAngleRadians,
    );
  }

  private advanceLargeCreatureEventState(
    previousDepthM: number,
    currentDepthM: number,
    frameSeconds: number,
    elapsedSeconds: number,
  ): void {
    const result = advanceLargeCreatureEvent(
      this.largeCreatureState,
      {
        previousDepthM,
        currentDepthM,
        elapsedSeconds: frameSeconds,
      },
    );
    this.largeCreatureState = result.state;

    if (result.warningStarted) {
      this.showEncounterEvent('MASSIVE CONTACT', 'impact', 4);
      this.drawLargeCreaturePath();
      this.startLargeCreatureWarningFeedback();
      announce('巨大生物の反応を検知しました。');
    }
    if (result.eventStarted) {
      this.startLargeCreatureEncounter(elapsedSeconds);
      this.showEncounterEvent('MASSIVE CONTACT', 'impact', 4);
    }
    if (result.eventLost) {
      this.showEncounterEvent('CONTACT LOST', 'impact', 4);
      this.destroyLargeCreatureObjects();
      announce('大型生物を見失いました。');
    }
  }

  private startLargeCreatureEncounter(elapsedSeconds: number): void {
    if (this.largeCreature) {
      return;
    }

    const candidate = getLargeCreatureEventCandidate(
      this.largeCreatureState.candidateId,
    );
    if (!candidate) {
      return;
    }
    const species = getPixelSpeciesAtDepth(
      SPECIES_CATALOG,
      Math.max(0, Math.min(candidate.spawnDepthMaxM, 1_350)),
    ).find((entry) => entry.sourceCatalogId === candidate.sourceCatalogId);
    if (!species) {
      return;
    }

    const display = this.createSpeciesDisplay(species, 1);
    display.setScale(2.8);
    display.setDepth(GAME_OBJECT_DEPTH.largeCreature);
    display.setAlpha(0.34);
    const scanGauge = createSpeciesScanGaugeView(this, 'large');
    this.largeCreature = {
      display,
      scanGauge,
      species,
      radius: SPECIES_COLLISION_RADIUS * 2.8,
      scanId: 'large-creature-' + candidate.sourceCatalogId,
      ageSeconds: this.largeCreatureState.eventElapsedSeconds,
      illuminated: false,
      visualAlpha: 1,
      completionStartedAtSeconds: undefined,
    };
    display.x = -this.largeCreature.radius;
    display.y = LARGE_CREATURE_EVENT_PATH_Y;
    this.updateLargeCreatureScanGauge();
    this.drawLargeCreaturePath();
    void elapsedSeconds;
  }

  private updateLargeCreatureObjects(frameSeconds: number): void {
    const creature = this.largeCreature;
    if (!creature) {
      return;
    }

    if (this.largeCreatureState.status === 'completed') {
      creature.ageSeconds = Math.min(
        LARGE_CREATURE_EVENT_DURATION_SECONDS,
        creature.ageSeconds + frameSeconds,
      );
    } else {
      creature.ageSeconds = this.largeCreatureState.eventElapsedSeconds;
    }
    const progress = Phaser.Math.Clamp(
      creature.ageSeconds / LARGE_CREATURE_EVENT_DURATION_SECONDS,
      0,
      1,
    );
    creature.display.x = -creature.radius +
      (GAME_WIDTH + creature.radius * 2) * progress;
    creature.display.y = LARGE_CREATURE_EVENT_PATH_Y;
    creature.display.setAlpha(creature.illuminated ? 0.96 : 0.34);
    this.updateLargeCreatureScanGauge();

    if (this.largeCreatureState.status === 'completed' &&
      creature.ageSeconds >= LARGE_CREATURE_EVENT_DURATION_SECONDS) {
      this.destroyLargeCreatureObjects();
    }
  }

  private updateLargeCreatureScanGauge(): void {
    const creature = this.largeCreature;
    if (!creature) {
      return;
    }

    const elapsedSeconds = this.diveProgression.elapsedSeconds;
    const completed = this.largeCreatureState.status === 'completed';
    if (completed && creature.completionStartedAtSeconds !== undefined &&
      isSpeciesScanGaugeCompletionHoldElapsed(
        creature.completionStartedAtSeconds,
        elapsedSeconds,
      )) {
      creature.scanGauge.root.setVisible(false);
      return;
    }

    updateSpeciesScanGaugeView(creature.scanGauge, {
      centerX: creature.display.x,
      centerY: creature.display.y,
      progressSeconds: this.largeCreatureState.identificationSeconds,
      requiredSeconds: LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
      illuminated: creature.illuminated,
      completed,
    });
  }

  private resolveLargeCreatureCollision(): void {
    if (!this.player || !this.largeCreature ||
      (this.largeCreatureState.status !== 'active' &&
        this.largeCreatureState.status !== 'completed')) {
      return;
    }

    if (!circlesOverlap(
      {
        x: this.player.x,
        y: this.player.y,
        radius: PLAYER_COLLISION_RADIUS,
      },
      {
        x: this.largeCreature.display.x,
        y: this.largeCreature.display.y,
        radius: this.largeCreature.radius,
      },
    )) {
      return;
    }

    const result = applyLargeCreatureEventCollision(this.largeCreatureState);
    this.largeCreatureState = result.state;
    if (!result.collidedNow) {
      return;
    }

    this.scoreState = applyRockDamage(this.scoreState);
    const previousStatus = this.diveProgression.status;
    this.diveProgression = adjustDiveFuel(
      this.diveProgression,
      -result.damageApplied,
    );
    this.invulnerabilityRemainingSeconds = ROCK_INVULNERABILITY_SECONDS;
    this.playerImpactRemainingSeconds = PLAYER_IMPACT_DISPLAY_SECONDS;
    this.updateSubmarinePresentation(this.diveProgression.elapsedSeconds);
    this.triggerImpactFeedback();
    this.showEncounterEvent(
      'MASSIVE IMPACT / FUEL -' + String(result.damageApplied),
      'impact',
      4,
    );
    this.updateHud();
    announce('大型生物に接触しました。燃料が20減少しました。');
    if (previousStatus !== this.diveProgression.status) {
      this.announceTerminalStatus(this.diveProgression.status);
      this.transitionToResult();
    }
  }

  private drawLargeCreaturePath(): void {
    if (!this.largeCreaturePathGraphics) {
      this.largeCreaturePathGraphics = this.add.graphics().setDepth(
        GAME_OBJECT_DEPTH.predictionPath,
      );
    }
    this.largeCreaturePathGraphics.clear();
    this.largeCreaturePathGraphics.lineStyle(1, 0xf1d58a, 0.24);
    this.largeCreaturePathGraphics.beginPath();
    this.largeCreaturePathGraphics.moveTo(0, LARGE_CREATURE_EVENT_PATH_Y);
    this.largeCreaturePathGraphics.lineTo(
      GAME_WIDTH,
      LARGE_CREATURE_EVENT_PATH_Y,
    );
    this.largeCreaturePathGraphics.strokePath();
  }

  private startLargeCreatureWarningFeedback(): void {
    if (this.largeCreatureDimOverlay) {
      this.tweens.killTweensOf(this.largeCreatureDimOverlay);
      this.largeCreatureDimOverlay.setAlpha(this.reducedMotion ? 0 : 0.14);
      if (!this.reducedMotion) {
        this.tweens.add({
          targets: this.largeCreatureDimOverlay,
          alpha: 0,
          duration: 700,
          ease: 'Sine.easeOut',
        });
      }
    }
    if (this.reducedMotion) {
      return;
    }

    this.clearLargeContactFeedback();
    const targets = document.querySelectorAll<HTMLElement>(
      '#game-container > canvas, #game-ui .game-hud, #game-ui .dive-status',
    );
    targets.forEach((target) => {
      void target.offsetWidth;
      target.classList.add('large-contact-shake');
    });
    this.largeContactFeedbackTimer = window.setTimeout(() => {
      this.clearLargeContactFeedback();
    }, LARGE_CONTACT_FEEDBACK_DURATION_MS);
  }

  private clearLargeContactFeedback(): void {
    if (this.largeContactFeedbackTimer !== undefined) {
      window.clearTimeout(this.largeContactFeedbackTimer);
      this.largeContactFeedbackTimer = undefined;
    }
    document.querySelectorAll<HTMLElement>(
      '#game-container > canvas, #game-ui .game-hud, #game-ui .dive-status',
    ).forEach((target) => target.classList.remove('large-contact-shake'));
  }

  private destroyLargeCreatureObjects(): void {
    destroySpeciesScanGaugeView(this.largeCreature?.scanGauge);
    this.largeCreature?.display.destroy();
    this.largeCreature = undefined;
    this.largeCreaturePathGraphics?.clear();
    this.largeCreaturePathGraphics?.destroy();
    this.largeCreaturePathGraphics = undefined;
  }

  private drawChapterBackground(
    chapter: ReturnType<typeof getDepthChapter>,
    initial = false,
  ): void {
    if (!this.backgroundGraphics) {
      return;
    }

    const bottomColor = chapter.number === 1
      ? 0x041016
      : chapter.number === 2
        ? 0x031019
        : chapter.number === 3
          ? 0x020b13
          : 0x010509;
    this.backgroundGraphics.clear();
    this.backgroundGraphics.fillGradientStyle(
      chapter.backgroundColor,
      chapter.backgroundColor,
      bottomColor,
      bottomColor,
      1,
    );
    this.backgroundGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.updateMarineSnowPresentation(chapter);

    if (!initial && this.chapterTransitionOverlay) {
      this.tweens.killTweensOf(this.chapterTransitionOverlay);
      this.chapterTransitionOverlay.setFillStyle(chapter.backgroundColor);
      this.chapterTransitionOverlay.setAlpha(this.reducedMotion ? 0 : 0.28);
      if (!this.reducedMotion) {
        this.tweens.add({
          targets: this.chapterTransitionOverlay,
          alpha: 0,
          duration: 750,
          ease: 'Sine.easeOut',
        });
      }
    }
  }

  private updateChapterBand(seconds: number): void {
    if (this.chapterBandRemainingSeconds <= 0) {
      return;
    }
    this.chapterBandRemainingSeconds = Math.max(
      0,
      this.chapterBandRemainingSeconds - seconds,
    );
    if (this.chapterBandRemainingSeconds === 0) {
      document.getElementById('chapter-band')?.setAttribute('hidden', '');
    }
  }

  private showChapterBand(
    chapter: ReturnType<typeof getDepthChapter>,
    depthM: number,
  ): void {
    const band = document.getElementById('chapter-band');
    const number = document.getElementById('chapter-band-number');
    const name = document.getElementById('chapter-band-name');
    const depth = document.getElementById('chapter-band-depth');
    number?.replaceChildren('CHAPTER ' + chapter.roman);
    name?.replaceChildren(chapter.displayNameJa);
    depth?.replaceChildren(
      String(chapter.minDepthM).padStart(4, '0') + '–' +
        String(chapter.maxDepthM).padStart(4, '0') + 'm',
    );
    band?.setAttribute('data-chapter', String(chapter.number));
    band?.removeAttribute('hidden');
    this.chapterBandRemainingSeconds = 1.4;
    void depthM;
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
      this.resetInput();
      container?.setAttribute('data-paused', 'true');
      announce('潜航を停止しました。');
      this.scene.pause();
    } else {
      container?.removeAttribute('data-paused');
      announce('潜航を再開しました。');
      this.scene.resume();
    }
  }

  private spawnDueHazardEncounters(elapsedSeconds: number): void {
    while (
      this.hazardRockSpawnIndex < this.hazardRockSpawns.length &&
      this.hazardRockSpawns[this.hazardRockSpawnIndex]!.atSeconds <=
        elapsedSeconds + 1e-9
    ) {
      const spawn = this.hazardRockSpawns[this.hazardRockSpawnIndex];
      this.hazardRockSpawnIndex += 1;
      if (spawn) {
        this.spawnEncounter(spawn, elapsedSeconds);
      }
    }
  }

  private spawnDueRecoveryEncounters(elapsedSeconds: number): void {
    while (
      this.recoverySpawnIndex < this.recoverySpawns.length &&
      this.recoverySpawns[this.recoverySpawnIndex]!.atSeconds <=
        elapsedSeconds + 1e-9
    ) {
      const spawn = this.recoverySpawns[this.recoverySpawnIndex];
      this.recoverySpawnIndex += 1;
      if (spawn) {
        this.spawnEncounter({
          kind: 'recovery',
          lane: spawn.lane,
          atSeconds: spawn.atSeconds,
        }, elapsedSeconds);
      }
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
    const species = selectPixelSpeciesForDepthWithOptions(
      SPECIES_CATALOG,
      depthM,
      request.ordinal,
      {
        chapter: this.currentChapter,
        excludeSourceCatalogIds: LARGE_CREATURE_EVENT_CANDIDATE_IDS,
      },
    );
    if (
      !species ||
      !canSpawnSpecies(this.speciesEncounters.length, MAX_ACTIVE_SPECIES)
    ) {
      return;
    }

    const behaviorPlan = createSpeciesBehaviorPlan(
      species,
      request.ordinal,
      SPECIES_COLLISION_RADIUS,
    );
    const display = this.createSpeciesDisplay(
      species,
      behaviorPlan.axis === 'horizontal' ? behaviorPlan.direction : 1,
    );
    const scanGauge = createSpeciesScanGaugeView(this, 'normal');
    const encounter: SpeciesObject = {
      display,
      scanGauge,
      species,
      spawnAtSeconds: request.atSeconds,
      behaviorPlan,
      radius: behaviorPlan.radius,
      sequence: this.speciesSequence,
      scanId: `species-${String(this.speciesSequence)}`,
      progressSeconds: 0,
      completed: false,
      globallyNew: false,
      illuminated: false,
      visualAlpha: 1,
      completionStartedAtSeconds: undefined,
    };
    this.speciesSequence += 1;
    this.speciesEncounters.push(encounter);
    display.x = behaviorPlan.start.x;
    display.y = behaviorPlan.start.y;
    this.updateSpeciesObjects(elapsedSeconds);
  }

  private createSpeciesDisplay(
    species: SpawnableSpecies,
    horizontalDirection: number,
  ): Phaser.GameObjects.Container {
    const icon = this.add.graphics();
    const definition = getSpeciesPixelIconDefinitionForSpecies({
      sourceCatalogId: species.sourceCatalogId,
      category: species.category,
    });
    if (definition) {
      drawSpeciesPixelIcon(icon, definition);
    }
    icon.setAlpha(1);
    icon.setScale(horizontalDirection < 0 ? -1 : 1, 1);

    const display = this.add.container(0, 0);
    display.add(icon);
    display.setDepth(GAME_OBJECT_DEPTH.species);
    display.setAlpha(0.58);
    display.setName(species.acceptedScientificName);
    return display;
  }

  private updateSpeciesObjects(elapsedSeconds: number): void {
    for (let index = this.speciesEncounters.length - 1; index >= 0; index -= 1) {
      const encounter = this.speciesEncounters[index];
      if (!encounter) {
        continue;
      }

      if (encounter.completed &&
        encounter.completionStartedAtSeconds !== undefined &&
        isSpeciesScanGaugeCompletionHoldElapsed(
          encounter.completionStartedAtSeconds,
          elapsedSeconds,
        )) {
        this.removeSpeciesAt(index);
        continue;
      }

      const ageSeconds = Math.max(
        0,
        elapsedSeconds - encounter.spawnAtSeconds,
      );
      const position = getSpeciesBehaviorPosition(
        encounter.behaviorPlan,
        ageSeconds,
      );
      encounter.display.x = position.x;
      encounter.display.y = position.y;
      const visualState = getSpeciesBehaviorVisualState(
        encounter.behaviorPlan,
        ageSeconds,
      );
      encounter.visualAlpha = visualState.alpha;
      encounter.display.setScale(visualState.scale);
      encounter.display.setAlpha(encounter.illuminated || encounter.completed
        ? Math.min(0.96, visualState.alpha)
        : Phaser.Math.Clamp(visualState.alpha * 0.64, 0.48, 0.68));
      this.updateSpeciesScanGauge(encounter);

      if (!encounter.completed &&
        hasSpeciesBehaviorExited(encounter.behaviorPlan, position)) {
        this.removeSpeciesAt(index);
      }
    }
  }

  private updateSpeciesScanGauge(encounter: SpeciesObject): void {
    updateSpeciesScanGaugeView(encounter.scanGauge, {
      centerX: encounter.display.x,
      centerY: encounter.display.y,
      progressSeconds: encounter.progressSeconds,
      requiredSeconds: getScanRequiredSeconds(encounter.species.rarity),
      illuminated: encounter.illuminated,
      completed: encounter.completed,
    });
  }

  private updateSpeciesScans(frameSeconds: number): void {
    if (!this.player) {
      this.clearActiveScanPresentation();
      return;
    }

    const origin = { x: this.player.x, y: this.player.y };
    const searchlightTargets: SearchlightTarget[] = [];
    for (const encounter of this.speciesEncounters) {
      encounter.illuminated = false;
      this.updateSpeciesScanGauge(encounter);
      if (encounter.completed) {
        continue;
      }
      searchlightTargets.push({
        id: encounter.scanId,
        spawnSequence: encounter.sequence,
        x: encounter.display.x,
        y: encounter.display.y,
      });
    }

    if (this.largeCreature &&
      this.largeCreatureState.status === 'active') {
      searchlightTargets.push({
        id: this.largeCreature.scanId,
        spawnSequence: Number.MAX_SAFE_INTEGER,
        x: this.largeCreature.display.x,
        y: this.largeCreature.display.y,
      });
    }

    const selectedTarget = selectSearchlightTargetWithPriority(
      origin,
      this.searchlightAngleRadians,
      searchlightTargets,
      this.largeCreature?.scanId,
      SEARCHLIGHT_RANGE_PX,
      SEARCHLIGHT_HALF_ANGLE_RADIANS,
    );
    const selectedTargetId = selectedTarget?.id;
    const completedNormalEncounters: SpeciesObject[] = [];
    const updatedTargets = new Map<string, ScanTarget>();

    for (const encounter of this.speciesEncounters) {
      if (encounter.completed) {
        continue;
      }

      const isSelected = encounter.scanId === selectedTargetId;
      encounter.illuminated = isSelected;
      const target: ScanTarget = {
        id: encounter.scanId,
        spawnSequence: encounter.sequence,
        centerDistance: Phaser.Math.Distance.Between(
          origin.x,
          origin.y,
          encounter.display.x,
          encounter.display.y,
        ),
        rarity: encounter.species.rarity,
        progressSeconds: encounter.progressSeconds,
        completed: encounter.completed,
      };
      const nextTarget = advanceScanTarget(
        target,
        isSelected,
        frameSeconds,
      );
      encounter.progressSeconds = nextTarget.progressSeconds;
      encounter.completed = nextTarget.completed;
      this.updateSpeciesScanGauge(encounter);
      if (nextTarget.completed) {
        encounter.completionStartedAtSeconds = this.diveProgression.elapsedSeconds;
      }
      updatedTargets.set(encounter.scanId, nextTarget);
      if (nextTarget.completed) {
        completedNormalEncounters.push(encounter);
      }
    }

    for (const encounter of completedNormalEncounters) {
      const key = encounter.species.acceptedScientificName;
      const displayName = encounter.species.displayName;
      const globallyNew = !this.knownSpecies.has(key);
      encounter.globallyNew = globallyNew;

      if (globallyNew) {
        this.knownSpecies.add(key);
        this.discoveredSpecies.add(key);
        this.persistSpeciesDiscovery(key);
      }

      const completion = completeScan(
        this.scoreState,
        encounter.species.score,
        globallyNew,
      );
      this.scoreState = completion.state;
      this.collectedSpecies[key] = (this.collectedSpecies[key] ?? 0) + 1;
      this.persistSpeciesCollection(key);

      if (globallyNew) {
        this.showEncounterEvent('NEW! / ' + displayName, 'species');
        announce('生物を発見しました。' + displayName + '。');
      } else {
        const scoreDelta = completion.scanScore + completion.firstDiscoveryBonus;
        this.showEncounterEvent(
          'SCAN COMPLETE / +' + String(scoreDelta),
          'species',
        );
        announce(
          'スキャンを完了しました。' + displayName + '、' +
            String(scoreDelta) + '点。',
        );
      }

      this.updateHud();
    }

    if (this.largeCreature &&
      this.largeCreatureState.status === 'active') {
      const illuminated = selectedTargetId === this.largeCreature.scanId;
      this.largeCreature.illuminated = illuminated;
      const identification = advanceLargeCreatureEventIdentification(
        this.largeCreatureState,
        illuminated,
        frameSeconds,
      );
      this.largeCreatureState = identification.state;
      if (identification.completedNow) {
        this.largeCreature.completionStartedAtSeconds =
          this.diveProgression.elapsedSeconds;
        const key = this.largeCreature.species.acceptedScientificName;
        const displayName = this.largeCreature.species.displayName;
        const globallyNew = !this.knownSpecies.has(key);
        if (globallyNew) {
          this.knownSpecies.add(key);
          this.discoveredSpecies.add(key);
          this.persistSpeciesDiscovery(key);
          this.showEncounterEvent('NEW! / ' + displayName, 'impact', 4);
          announce('大型生物を識別しました。' + displayName + '。');
        } else {
          this.showEncounterEvent(
            'SCAN COMPLETE / +' + String(LARGE_CREATURE_EVENT_SCORE),
            'impact',
            4,
          );
          announce('大型生物の識別を完了しました。');
        }
        const fixedAward = awardFixedScanScore(
          this.scoreState,
          identification.scoreAwarded,
        );
        this.scoreState = fixedAward.state;
        this.collectedSpecies[key] = (this.collectedSpecies[key] ?? 0) + 1;
        this.persistSpeciesCollection(key);
        this.updateHud();
      }
      this.updateLargeCreatureScanGauge();
    }

    const activeEncounter = selectedTargetId === undefined
      ? undefined
      : this.speciesEncounters.find((encounter) =>
        encounter.scanId === selectedTargetId && !encounter.completed);
    const activeTarget = activeEncounter === undefined
      ? undefined
      : updatedTargets.get(activeEncounter.scanId);
    const normalCompletionHold = this.speciesEncounters.find((encounter) =>
      encounter.completed &&
      isScanRailCompletionHoldActive(
        encounter.completionStartedAtSeconds,
        this.diveProgression.elapsedSeconds,
      ),
    );
    const largeCompletionHold = this.largeCreature !== undefined &&
      isScanRailCompletionHoldActive(
        this.largeCreature.completionStartedAtSeconds,
        this.diveProgression.elapsedSeconds,
      );
    const railPresentation = selectScanRailPresentation({
      normalTargetSelected: activeEncounter !== undefined &&
        activeTarget !== undefined,
      largeTargetSelected: this.largeCreature !== undefined &&
        selectedTargetId === this.largeCreature.scanId,
      largeStatus: this.largeCreatureState.status,
      normalCompletionHold: normalCompletionHold !== undefined,
      largeCompletionHold,
    });

    switch (railPresentation) {
      case 'large-active':
        this.updateLargeCreatureScanPresentation();
        return;
      case 'normal-active':
        this.updateActiveScanPresentation(activeEncounter, activeTarget);
        return;
      case 'normal-completed':
        if (normalCompletionHold) {
          this.updateCompletedSpeciesScanPresentation(normalCompletionHold);
        } else {
          this.clearActiveScanPresentation();
        }
        return;
      case 'large-completed':
        this.updateLargeCreatureScanPresentation(true);
        return;
      case 'none':
        this.clearActiveScanPresentation();
        return;
    }
  }
  private updateActiveScanPresentation(
    encounter: SpeciesObject | undefined,
    target: ScanTarget | undefined,
  ): void {
    if (!this.player || !encounter || !target || encounter.completed) {
      this.clearActiveScanPresentation();
      return;
    }

    const requiredSeconds = getScanRequiredSeconds(encounter.species.rarity);
    if (requiredSeconds <= 0) {
      this.clearActiveScanPresentation();
      return;
    }

    this.activeScanStatus = {
      sourceCatalogId: encounter.species.sourceCatalogId,
      displayName: this.knownSpecies.has(encounter.species.acceptedScientificName)
        ? encounter.species.displayName
        : 'UNKNOWN / ' + encounter.species.category,
      progressSeconds: target.progressSeconds ?? 0,
      requiredSeconds,
      progressPercent: getScanProgressPercent(target),
    };
    this.game.registry?.set('shinkai.activeScanStatus', this.activeScanStatus);
    this.updateScanRail(this.activeScanStatus);
  }

  private clearActiveScanPresentation(): void {
    this.activeScanStatus = undefined;
    this.game.registry?.set('shinkai.activeScanStatus', undefined);
    this.updateScanRail(undefined);
  }

  private updateLargeCreatureScanPresentation(
    completedHold = false,
  ): void {
    const largeCreatureIsActive = this.largeCreatureState.status === 'active';
    const largeCreatureIsCompletedHold = completedHold &&
      this.largeCreatureState.status === 'completed';
    if (!this.largeCreature ||
      (!largeCreatureIsActive && !largeCreatureIsCompletedHold)) {
      this.clearActiveScanPresentation();
      return;
    }

    const requiredSeconds = LARGE_CREATURE_EVENT_REQUIRED_SECONDS;
    const progressSeconds = largeCreatureIsCompletedHold
      ? requiredSeconds
      : this.largeCreatureState.identificationSeconds;
    this.activeScanStatus = {
      sourceCatalogId: this.largeCreature.species.sourceCatalogId,
      displayName: this.knownSpecies.has(
        this.largeCreature.species.acceptedScientificName,
      )
        ? this.largeCreature.species.displayName
        : 'UNKNOWN / ' + this.largeCreature.species.category,
      progressSeconds,
      requiredSeconds,
      progressPercent: (progressSeconds / requiredSeconds) * 100,
    };
    this.game.registry?.set('shinkai.activeScanStatus', this.activeScanStatus);
    this.updateScanRail(this.activeScanStatus);
  }

  private updateCompletedSpeciesScanPresentation(
    encounter: SpeciesObject,
  ): void {
    if (!this.player || !encounter.completed) {
      this.clearActiveScanPresentation();
      return;
    }

    const requiredSeconds = getScanRequiredSeconds(encounter.species.rarity);
    if (requiredSeconds <= 0) {
      this.clearActiveScanPresentation();
      return;
    }

    this.activeScanStatus = {
      sourceCatalogId: encounter.species.sourceCatalogId,
      displayName: encounter.species.displayName,
      progressSeconds: requiredSeconds,
      requiredSeconds,
      progressPercent: 100,
    };
    this.game.registry?.set('shinkai.activeScanStatus', this.activeScanStatus);
    this.updateScanRail(this.activeScanStatus);
  }

  /** Keeps the HTML scan rail in sync with the Phaser-only scan state. */
  private updateScanRail(status: ActiveScanStatus | undefined): void {
    const rail = document.getElementById('scan-rail');
    const targetName = document.getElementById('scan-target-name');
    const fill = document.getElementById('scan-meter-fill');

    if (!status) {
      rail?.setAttribute('hidden', '');
      targetName?.replaceChildren();
      if (fill instanceof HTMLElement) {
        fill.style.width = '0%';
      }
      this.setScanRailAria(rail, fill, '0', 'IDENTIFY / 0%');
      return;
    }

    const percent = Number.isFinite(status.progressPercent)
      ? Phaser.Math.Clamp(status.progressPercent, 0, 100)
      : 0;
    const roundedPercent = Math.round(percent * 10) / 10;
    const percentText = String(roundedPercent);
    const ariaText = 'IDENTIFY / ' + status.displayName + ' / ' +
      percentText + '%';

    rail?.removeAttribute('hidden');
    targetName?.replaceChildren(status.displayName);
    if (fill instanceof HTMLElement) {
      fill.style.width = `${percentText}%`;
    }
    this.setScanRailAria(rail, fill, percentText, ariaText);
  }

  private setScanRailAria(
    rail: HTMLElement | null,
    fill: HTMLElement | null,
    value: string,
    valueText: string,
  ): void {
    for (const element of [rail, fill]) {
      if (!element) {
        continue;
      }

      element.setAttribute('aria-valuemin', '0');
      element.setAttribute('aria-valuemax', '100');
      element.setAttribute('aria-valuenow', value);
      element.setAttribute('aria-valuetext', valueText);
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
    destroySpeciesScanGaugeView(encounter.scanGauge);
    encounter.display.destroy();
  }

  private destroySpeciesObjects(): void {
    for (const encounter of this.speciesEncounters) {
      destroySpeciesScanGaugeView(encounter.scanGauge);
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

  private updateHazardWarning(elapsedSeconds: number): void {
    const wave = this.hazardWaves.find((candidate) => {
      const lastRockAtSeconds = candidate.rocks.reduce(
        (latest, rock) => Math.max(latest, rock.atSeconds),
        candidate.atSeconds,
      );
      return elapsedSeconds >= candidate.warningAtSeconds &&
        elapsedSeconds < lastRockAtSeconds;
    });

    if (!wave) {
      this.clearHazardWarning();
      return;
    }

    if (this.hazardWarningWaveIndex === wave.waveIndex) {
      return;
    }

    this.clearHazardWarning();
    this.hazardWarningWaveIndex = wave.waveIndex;

    const graphics = this.add.graphics();
    graphics.lineStyle(2, IMPACT_HULL_COLOR, 0.78);
    for (const lane of wave.rockLanes) {
      const laneX = LANE_X_BY_NAME[lane];
      graphics.beginPath();
      graphics.moveTo(laneX - 14, 148);
      graphics.lineTo(laneX + 14, 148);
      graphics.strokePath();
    }
    this.hazardWarningGraphics = graphics;
    this.hazardWarningLabel = this.add
      .text(28, 124, 'HAZARD', {
        color: '#ff6b5e',
        fontFamily: 'monospace',
        fontSize: '12px',
      })
      .setAlpha(0.86);

    if (!this.warnedHazardWaveIndices.has(wave.waveIndex)) {
      this.warnedHazardWaveIndices.add(wave.waveIndex);
      this.showEncounterEvent('HAZARD', 'impact');
      announce('危険ウェーブを検知しました。');
    }
  }

  private clearHazardWarning(): void {
    this.hazardWarningGraphics?.clear();
    this.hazardWarningGraphics?.destroy();
    this.hazardWarningGraphics = undefined;
    this.hazardWarningLabel?.destroy();
    this.hazardWarningLabel = undefined;
    this.hazardWarningWaveIndex = undefined;
  }

  private updateZone(depthM: number, force = false): void {
    const zone = getDepthBandNumber(depthM);
    const chapter = getDepthChapter(depthM);
    const depth = Number.isFinite(depthM)
      ? Math.max(0, Math.floor(depthM))
      : 0;
    const transitions = getChapterTransitions(
      this.lastChapterDepthM,
      depth,
    );
    const chapterChanged = force ||
      chapter.number !== this.currentChapter ||
      transitions.length > 0;
    if (!force && zone === this.currentZone && !chapterChanged) {
      this.lastChapterDepthM = depth;
      return;
    }

    this.currentZone = zone;
    this.currentChapter = chapter.number;
    this.lastChapterDepthM = depth;
    this.game.registry?.set('shinkai.zone', zone);
    this.game.registry?.set('shinkai.chapter', chapter.number);
    const zoneReadout = document.getElementById('zone-readout');
    zoneReadout?.replaceChildren(String(chapter.number));
    zoneReadout?.setAttribute('data-zone', String(chapter.number));
    document.getElementById('game-ui')?.style.setProperty(
      '--chapter-accent',
      chapter.accentHex,
    );
    document.getElementById('dive-status-chapter')?.replaceChildren(
      'CH ' + chapter.roman + ' / ' + chapter.displayNameJa,
    );
    this.drawChapterBackground(chapter, force);
    this.showChapterBand(chapter, depth);
    const message = 'CHAPTER ' + chapter.roman + ' / ' +
      chapter.displayNameJa + ' / DEPTH ' +
      String(depth).padStart(4, '0') + 'm';
    announce(message);
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
        this.scoreState = applyRockDamage(this.scoreState);
        const previousStatus = this.diveProgression.status;
        this.diveProgression = adjustDiveFuel(
          this.diveProgression,
          -ROCK_FUEL_DAMAGE,
        );
        this.invulnerabilityRemainingSeconds = ROCK_INVULNERABILITY_SECONDS;
        this.playerImpactRemainingSeconds = PLAYER_IMPACT_DISPLAY_SECONDS;
        this.updateSubmarinePresentation(this.diveProgression.elapsedSeconds);
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
    kind: 'impact' | 'recovery' | 'species' | 'zone',
    priority = kind === 'zone' ? 3 : kind === 'impact' ? 2 : 1,
  ): void {
    if (
      this.encounterEventRemainingSeconds > 0 &&
      priority < this.encounterEventPriority
    ) {
      return;
    }
    this.encounterEventRemainingSeconds = ENCOUNTER_EVENT_DURATION_SECONDS;
    this.encounterEventPriority = priority;
    const eventElement = document.getElementById('encounter-event');
    eventElement?.setAttribute('data-kind', kind);
    eventElement?.replaceChildren(message);
    eventElement?.removeAttribute('hidden');
  }

  private clearEncounterEvent(): void {
    this.encounterEventRemainingSeconds = 0;
    this.encounterEventPriority = 0;
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
    this.updateSubmarinePresentation(this.diveProgression.elapsedSeconds);
  }

  private updateSubmarinePresentation(elapsedSeconds: number): void {
    if (!this.submarineView) {
      return;
    }

    updateSubmarineRendererView(this.submarineView, {
      angleRadians: this.searchlightAngleRadians,
      elapsedSeconds,
      impact: this.playerImpactRemainingSeconds > 0,
      reducedMotion: this.reducedMotion,
    });
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
      scoreText: String(this.getLiveScoreTotal()),
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
      document.getElementById('dive-status-primary')?.replaceChildren(
        snapshot.statusPrimary,
      );
      document.getElementById('dive-status-secondary')?.replaceChildren(
        snapshot.statusSecondary,
      );
    }

    this.hudSnapshot = snapshot;
  }

  private getLiveScoreTotal(): number {
    return Math.max(
      0,
      Math.floor(
        this.scoreState.scanScoreTotal + this.scoreState.firstDiscoveryBonusTotal,
      ),
    );
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

  private getNewDiscoverySnapshots(): readonly DiveResultNewDiscovery[] {
    const discoveries: DiveResultNewDiscovery[] = [];
    for (const acceptedScientificName of this.discoveredSpecies) {
      const catalogRecord = SPECIES_CATALOG.find(
        (record) => record.accepted_scientific_name === acceptedScientificName,
      );
      if (!catalogRecord) {
        continue;
      }

      discoveries.push({
        sourceCatalogId: catalogRecord.source_catalog_id,
        displayName: catalogRecord.display_name,
        acceptedScientificName: catalogRecord.accepted_scientific_name,
        category: catalogRecord.category,
      });
    }
    return discoveries;
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
    this.clearHazardWarning();
    this.destroySpeciesObjects();
    this.destroyLargeCreatureObjects();
    this.clearLargeContactFeedback();
    this.largeCreatureDimOverlay?.setAlpha(0);
    this.searchlightBeam?.clear();
    if (this.chapterTransitionOverlay) {
      this.tweens.killTweensOf(this.chapterTransitionOverlay);
    }
    this.chapterBandRemainingSeconds = 0;
    document.getElementById('chapter-band')?.setAttribute('hidden', '');
    this.clearActiveScanPresentation();
    this.clearEncounterEvent();

    const scoreBreakdown = calculateScoreBreakdown({
      scanScoreTotal: this.scoreState.scanScoreTotal,
      firstDiscoveryBonusTotal: this.scoreState.firstDiscoveryBonusTotal,
      reachedDepthM: this.diveProgression.depthM,
      remainingFuel: this.diveProgression.fuel,
    });
    let updatedProgress = createEmptyRunProgress();
    let isNewBest = false;
    try {
      const previousProgress = readRunProgress();
      isNewBest = scoreBreakdown.finalScore > previousProgress.bestScore;
      updatedProgress = updateRunProgress(previousProgress, {
        outcome: status,
        score: scoreBreakdown.finalScore,
        reachedDepthM: this.diveProgression.depthM,
      });
      writeRunProgress(updatedProgress);
    } catch {
      // Result presentation must remain available even when persistence fails.
    }

    const result = createDiveResultSnapshot(this.diveProgression, {
      score: scoreBreakdown.finalScore,
      scoreBreakdown,
      newDiscoveries: this.getNewDiscoverySnapshots(),
      isNewBest,
      bestScore: updatedProgress.bestScore,
      bestDepthM: updatedProgress.bestDepthM,
      diveCount: updatedProgress.diveCount,
      clearCount: updatedProgress.clearCount,
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
        baseSpeedPxPerSecond: particle.speed,
        speedPxPerSecond: particle.speed,
      });
    }
    this.updateMarineSnowPresentation(getDepthChapter(this.currentChapter));
  }

  private updateMarineSnowPresentation(
    chapter: ReturnType<typeof getDepthChapter>,
  ): void {
    const profile = chapter.particleProfile;
    const visibleCount = Math.round(
      MARINE_SNOW_LAYOUT.length * Phaser.Math.Clamp(profile.density, 0, 1),
    );
    for (const [index, particle] of this.marineSnow.entries()) {
      const base = MARINE_SNOW_LAYOUT[index];
      if (!base) {
        continue;
      }
      const alphaScale = base.alpha / 0.18;
      particle.sprite.setFillStyle(
        profile.color,
        Phaser.Math.Clamp(profile.alpha * alphaScale, 0.04, 0.22),
      );
      particle.sprite.setVisible(index < visibleCount);
      particle.speedPxPerSecond = profile.speedPxPerSecond *
        (base.speed / 34);
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
    this.searchlightJoystick?.reset();
    this.input.keyboard?.resetKeys();
  }

  private readonly cleanup = (): void => {
    this.game.events.off('shinkai:lifecycle', this.handleLifecycleStatus);
    this.destroyEncounterObjects();
    this.clearHazardWarning();
    this.destroySpeciesObjects();
    this.destroyLargeCreatureObjects();
    this.clearLargeContactFeedback();
    this.clearActiveScanPresentation();
    this.clearEncounterEvent();
    this.clearImpactFeedback();
    destroySubmarineView(this.submarineView);
    this.submarineView = undefined;
    this.player = undefined;
    this.resetInput();
    this.joystick?.destroy();
    this.joystick = undefined;
    this.searchlightJoystick?.destroy();
    this.searchlightJoystick = undefined;
    this.searchlightBeam?.clear();
    this.searchlightBeam?.destroy();
    this.searchlightBeam = undefined;
    if (this.chapterTransitionOverlay) {
      this.tweens.killTweensOf(this.chapterTransitionOverlay);
    }
    this.chapterTransitionOverlay?.destroy();
    this.chapterTransitionOverlay = undefined;
    this.largeCreatureDimOverlay?.destroy();
    this.largeCreatureDimOverlay = undefined;
    this.backgroundGraphics = undefined;
    this.chapterBandRemainingSeconds = 0;
    document.getElementById('chapter-band')?.setAttribute('hidden', '');
    this.searchlightAngleRadians = 0;
    this.searchlightTargetAngleRadians = 0;
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
