import {
  isSpeciesScanGaugeCompletionHoldElapsed,
  SPECIES_SCAN_GAUGE_COMPLETION_HOLD_SECONDS,
} from './speciesScanGauge';
import type { LargeCreatureEventStatus } from './largeCreatureEventRules';

export const SCAN_RAIL_COMPLETION_HOLD_SECONDS =
  SPECIES_SCAN_GAUGE_COMPLETION_HOLD_SECONDS;

export type ScanRailPresentation =
  | 'none'
  | 'normal-active'
  | 'large-active'
  | 'normal-completed'
  | 'large-completed';

export interface ScanRailPresentationInput {
  readonly normalTargetSelected: boolean;
  readonly largeTargetSelected: boolean;
  readonly largeStatus: LargeCreatureEventStatus;
  readonly normalCompletionHold: boolean;
  readonly largeCompletionHold: boolean;
}

/**
 * Chooses only the HTML presentation. It never changes target selection or
 * scan state, and a non-active large event cannot mask a normal target.
 */
export function selectScanRailPresentation(
  input: ScanRailPresentationInput,
): ScanRailPresentation {
  if (input.largeStatus === 'active' && input.largeTargetSelected) {
    return 'large-active';
  }
  if (input.normalTargetSelected) {
    return 'normal-active';
  }
  if (input.normalCompletionHold) {
    return 'normal-completed';
  }
  if (input.largeStatus === 'completed' && input.largeCompletionHold) {
    return 'large-completed';
  }
  return 'none';
}

/** Mirrors the world gauge's fixed 0.30 second completion window. */
export function isScanRailCompletionHoldActive(
  completedAtSeconds: number | undefined,
  elapsedSeconds: number,
): boolean {
  if (completedAtSeconds === undefined ||
    !Number.isFinite(completedAtSeconds) ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < completedAtSeconds) {
    return false;
  }

  return !isSpeciesScanGaugeCompletionHoldElapsed(
    completedAtSeconds,
    elapsedSeconds,
  );
}
