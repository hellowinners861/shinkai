import { describe, expect, it } from 'vitest';

import {
  advanceLargeCreatureEvent,
  advanceLargeCreatureEventIdentification,
  applyLargeCreatureEventCollision,
  createInitialLargeCreatureEventState,
  getLargeCreatureEventCandidate,
  LARGE_CREATURE_EVENT_CANDIDATES,
  LARGE_CREATURE_EVENT_CANDIDATE_IDS,
  LARGE_CREATURE_EVENT_COLLISION_DAMAGE,
  LARGE_CREATURE_EVENT_DURATION_SECONDS,
  LARGE_CREATURE_EVENT_END_DEPTH_M,
  LARGE_CREATURE_EVENT_EXCLUDED_SOURCE_CATALOG_IDS,
  LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
  LARGE_CREATURE_EVENT_SCORE,
  LARGE_CREATURE_EVENT_START_DEPTH_M,
  LARGE_CREATURE_EVENT_WARNING_DEPTH_M,
  isLargeCreatureEventExcludedFromNormalSpawn,
  shouldSuspendNormalSpeciesSpawn,
  selectLargeCreatureEventCandidate,
  validateLargeCreatureEventCandidate,
  validateLargeCreatureEventCandidates,
} from '../src/game/largeCreatureEventRules';

describe('large creature event candidates', () => {
  it('keeps the approved two taxa and catalog-backed finite depth evidence', () => {
    expect(LARGE_CREATURE_EVENT_CANDIDATE_IDS).toEqual(['I021', 'I022']);
    expect(LARGE_CREATURE_EVENT_CANDIDATES.map((candidate) => [
      candidate.sourceCatalogId,
      candidate.acceptedScientificName,
      candidate.spawnDepthMinM,
      candidate.spawnDepthMaxM,
    ])).toEqual([
      ['I021', 'Architeuthis dux', 200, 1585],
      ['I022', 'Mesonychoteuthis hamiltoni', 200, 3111],
    ]);

    for (const candidate of LARGE_CREATURE_EVENT_CANDIDATES) {
      expect(validateLargeCreatureEventCandidate(candidate)).toEqual({
        valid: true,
        errors: [],
      });
      expect(Number.isFinite(candidate.spawnDepthMinM)).toBe(true);
      expect(Number.isFinite(candidate.spawnDepthMaxM)).toBe(true);
      expect(candidate.depthSourceUrl).toMatch(/^https:\/\//u);
      expect(candidate.spawnDepthMinM).toBeLessThanOrEqual(
        LARGE_CREATURE_EVENT_START_DEPTH_M,
      );
      expect(candidate.spawnDepthMaxM).toBeGreaterThanOrEqual(
        LARGE_CREATURE_EVENT_END_DEPTH_M,
      );
    }

    expect(validateLargeCreatureEventCandidates()).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('selects an unknown candidate first, then alternates when both are known', () => {
    const bothKnown = new Set([
      'Architeuthis dux',
      'Mesonychoteuthis hamiltoni',
    ]);
    expect(selectLargeCreatureEventCandidate(new Set())).toMatchObject({
      sourceCatalogId: 'I021',
    });
    expect(selectLargeCreatureEventCandidate(new Set(['Architeuthis dux']))).
      toMatchObject({ sourceCatalogId: 'I022' });
    expect(selectLargeCreatureEventCandidate(bothKnown, 0).sourceCatalogId).
      toBe('I021');
    expect(selectLargeCreatureEventCandidate(bothKnown, 1).sourceCatalogId).
      toBe('I022');
    expect(selectLargeCreatureEventCandidate(bothKnown, 2).sourceCatalogId).
      toBe('I021');
    expect(selectLargeCreatureEventCandidate(new Set(['I021']))).toMatchObject({
      sourceCatalogId: 'I022',
    });
  });

  it('excludes both event IDs from ordinary species spawning', () => {
    expect(LARGE_CREATURE_EVENT_EXCLUDED_SOURCE_CATALOG_IDS).toEqual(['I021', 'I022']);
    expect(isLargeCreatureEventExcludedFromNormalSpawn('I021')).toBe(true);
    expect(isLargeCreatureEventExcludedFromNormalSpawn('I022')).toBe(true);
    expect(isLargeCreatureEventExcludedFromNormalSpawn('I023')).toBe(false);
    expect(getLargeCreatureEventCandidate('I021')?.displayName).toBe('ダイオウイカ');
    expect(getLargeCreatureEventCandidate('I999')).toBeUndefined();
  });

  it('suspends ordinary spawns through warning and until the completed object exits', () => {
    const state = createInitialLargeCreatureEventState();
    expect(shouldSuspendNormalSpeciesSpawn({ ...state, status: 'idle' }, false)).toBe(false);
    expect(shouldSuspendNormalSpeciesSpawn({ ...state, status: 'warned' }, false)).toBe(true);
    expect(shouldSuspendNormalSpeciesSpawn({ ...state, status: 'active' }, true)).toBe(true);
    expect(shouldSuspendNormalSpeciesSpawn({ ...state, status: 'completed' }, true)).toBe(true);
    expect(shouldSuspendNormalSpeciesSpawn({ ...state, status: 'completed' }, false)).toBe(false);
    expect(shouldSuspendNormalSpeciesSpawn({ ...state, status: 'lost' }, false)).toBe(false);
  });
});

describe('large creature event schedule and state', () => {
  it('exposes the V3 warning, start, duration, identification, and damage constants', () => {
    expect(LARGE_CREATURE_EVENT_WARNING_DEPTH_M).toBe(1250);
    expect(LARGE_CREATURE_EVENT_START_DEPTH_M).toBe(1350);
    expect(LARGE_CREATURE_EVENT_DURATION_SECONDS).toBe(8.5);
    expect(LARGE_CREATURE_EVENT_REQUIRED_SECONDS).toBe(2.4);
    expect(LARGE_CREATURE_EVENT_SCORE).toBe(300);
    expect(LARGE_CREATURE_EVENT_COLLISION_DAMAGE).toBe(20);
    expect(LARGE_CREATURE_EVENT_END_DEPTH_M).toBe(1562.5);
  });

  it('crosses the warning boundary exactly once and then starts at 1350m', () => {
    const initial = createInitialLargeCreatureEventState();
    const before = advanceLargeCreatureEvent(initial, {
      previousDepthM: 1249,
      currentDepthM: 1249.9,
      elapsedSeconds: 0.1,
    });
    expect(before.state.status).toBe('idle');
    expect(before.warningStarted).toBe(false);

    const warning = advanceLargeCreatureEvent(before.state, {
      previousDepthM: 1249.9,
      currentDepthM: 1250,
      elapsedSeconds: 0.1,
    });
    expect(warning.state.status).toBe('warned');
    expect(warning.warningStarted).toBe(true);
    expect(warning.eventStarted).toBe(false);
    expect(warning.state.runConsumed).toBe(true);

    const repeatedWarning = advanceLargeCreatureEvent(warning.state, {
      previousDepthM: 1250,
      currentDepthM: 1300,
      elapsedSeconds: 2,
    });
    expect(repeatedWarning.state.status).toBe('warned');
    expect(repeatedWarning.warningStarted).toBe(false);

    const started = advanceLargeCreatureEvent(repeatedWarning.state, {
      previousDepthM: 1300,
      currentDepthM: 1350,
      elapsedSeconds: 2,
    });
    expect(started.state.status).toBe('active');
    expect(started.eventStarted).toBe(true);
    expect(started.state.eventElapsedSeconds).toBe(0);

    const repeatedStart = advanceLargeCreatureEvent(started.state, {
      previousDepthM: 1350,
      currentDepthM: 1360,
      elapsedSeconds: 0.4,
    });
    expect(repeatedStart.eventStarted).toBe(false);
    expect(repeatedStart.state.eventElapsedSeconds).toBeCloseTo(0.4);
  });

  it('emits both boundaries on a large deterministic depth step', () => {
    const result = advanceLargeCreatureEvent(
      createInitialLargeCreatureEventState(),
      {
        previousDepthM: 0,
        currentDepthM: 1600,
        elapsedSeconds: 64,
      },
    );
    expect(result.warningStarted).toBe(true);
    expect(result.eventStarted).toBe(true);
    expect(result.state.status).toBe('lost');
    expect(result.state.eventElapsedSeconds).toBe(
      LARGE_CREATURE_EVENT_DURATION_SECONDS,
    );
    expect(result.eventLost).toBe(true);
    expect(result.state.status).toBe('lost');
  });

  it('loses an unobserved event once after 8.5 active seconds', () => {
    let state = createInitialLargeCreatureEventState();
    state = advanceLargeCreatureEvent(state, {
      previousDepthM: 0,
      currentDepthM: 1350,
      elapsedSeconds: 54,
    }).state;
    expect(state.status).toBe('active');

    const almostLost = advanceLargeCreatureEvent(state, {
      previousDepthM: 1350,
      currentDepthM: 1355,
      elapsedSeconds: 8.49,
    });
    expect(almostLost.state.status).toBe('active');
    expect(almostLost.eventLost).toBe(false);

    const lost = advanceLargeCreatureEvent(almostLost.state, {
      previousDepthM: 1355,
      currentDepthM: 1360,
      elapsedSeconds: 0.01,
    });
    expect(lost.state.status).toBe('lost');
    expect(lost.eventLost).toBe(true);

    const repeated = advanceLargeCreatureEvent(lost.state, {
      previousDepthM: 1360,
      currentDepthM: 1400,
      elapsedSeconds: 10,
    });
    expect(repeated.state).toEqual(lost.state);
    expect(repeated.eventLost).toBe(false);
  });
});

describe('large creature event observation and collision', () => {
  it('awards 300 exactly once after 2.40 seconds of illumination', () => {
    let state = createInitialLargeCreatureEventState();
    state = advanceLargeCreatureEvent(state, {
      previousDepthM: 1300,
      currentDepthM: 1350,
      elapsedSeconds: 2,
    }).state;

    const first = advanceLargeCreatureEventIdentification(state, true, 1.2);
    expect(first.state.status).toBe('active');
    expect(first.state.identificationSeconds).toBe(1.2);
    expect(first.completedNow).toBe(false);
    expect(first.scoreAwarded).toBe(0);

    const completed = advanceLargeCreatureEventIdentification(first.state, true, 1.2);
    expect(completed.state.status).toBe('completed');
    expect(completed.state.identificationSeconds).toBe(2.4);
    expect(completed.completedNow).toBe(true);
    expect(completed.scoreAwarded).toBe(300);
    expect(completed.state.scoreAwarded).toBe(true);

    const repeated = advanceLargeCreatureEventIdentification(completed.state, true, 10);
    expect(repeated.state).toEqual(completed.state);
    expect(repeated.completedNow).toBe(false);
    expect(repeated.scoreAwarded).toBe(0);
  });

  it('does not progress while dark and does not complete after the event is lost', () => {
    let state = createInitialLargeCreatureEventState();
    state = advanceLargeCreatureEvent(state, {
      previousDepthM: 1300,
      currentDepthM: 1350,
      elapsedSeconds: 2,
    }).state;
    const dark = advanceLargeCreatureEventIdentification(state, false, 2);
    expect(dark.state.identificationSeconds).toBe(0);

    const lost = advanceLargeCreatureEvent(state, {
      previousDepthM: 1350,
      currentDepthM: 1400,
      elapsedSeconds: LARGE_CREATURE_EVENT_DURATION_SECONDS,
    }).state;
    const late = advanceLargeCreatureEventIdentification(lost, true, 10);
    expect(late.state.status).toBe('lost');
    expect(late.scoreAwarded).toBe(0);
  });

  it('applies collision damage once and permits the event to continue', () => {
    let state = createInitialLargeCreatureEventState();
    state = advanceLargeCreatureEvent(state, {
      previousDepthM: 1300,
      currentDepthM: 1350,
      elapsedSeconds: 2,
    }).state;

    const first = applyLargeCreatureEventCollision(state);
    expect(first.collidedNow).toBe(true);
    expect(first.damageApplied).toBe(20);
    expect(first.state.collisionApplied).toBe(true);
    expect(first.state.status).toBe('active');

    const repeated = applyLargeCreatureEventCollision(first.state);
    expect(repeated.collidedNow).toBe(false);
    expect(repeated.damageApplied).toBe(0);
    expect(repeated.state).toEqual(first.state);

    const beforeEvent = applyLargeCreatureEventCollision(
      createInitialLargeCreatureEventState(),
    );
    expect(beforeEvent.collidedNow).toBe(false);
    expect(beforeEvent.damageApplied).toBe(0);
    expect(LARGE_CREATURE_EVENT_COLLISION_DAMAGE).toBe(20);
  });
});
