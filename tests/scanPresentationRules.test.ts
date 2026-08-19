import { describe, expect, it } from 'vitest';

import {
  isScanRailCompletionHoldActive,
  SCAN_RAIL_COMPLETION_HOLD_SECONDS,
  selectScanRailPresentation,
} from '../src/game/scanPresentationRules';

describe('HTML scan rail presentation selection', () => {
  const base = {
    normalTargetSelected: false,
    largeTargetSelected: false,
    largeStatus: 'idle' as const,
    normalCompletionHold: false,
    largeCompletionHold: false,
  };

  it('keeps a selected normal scan visible when the large event is not active', () => {
    for (const largeStatus of ['idle', 'warned', 'completed', 'lost'] as const) {
      expect(selectScanRailPresentation({
        ...base,
        largeStatus,
        normalTargetSelected: true,
      })).toBe('normal-active');
    }
  });

  it('prefers the active large target only while the event is active', () => {
    expect(selectScanRailPresentation({
      ...base,
      largeStatus: 'active',
      largeTargetSelected: true,
    })).toBe('large-active');
    expect(selectScanRailPresentation({
      ...base,
      largeStatus: 'completed',
      largeTargetSelected: true,
    })).not.toBe('large-active');
  });

  it('holds a normal completion before falling back to clear', () => {
    expect(selectScanRailPresentation({
      ...base,
      normalCompletionHold: true,
    })).toBe('normal-completed');
    expect(selectScanRailPresentation(base)).toBe('none');
  });

  it('holds a completed large event only while its status is completed', () => {
    expect(selectScanRailPresentation({
      ...base,
      largeStatus: 'completed',
      largeCompletionHold: true,
    })).toBe('large-completed');
    expect(selectScanRailPresentation({
      ...base,
      largeStatus: 'active',
      largeCompletionHold: true,
    })).toBe('none');
  });

  it('lets a newly selected normal target take precedence over a large hold', () => {
    expect(selectScanRailPresentation({
      ...base,
      normalTargetSelected: true,
      largeStatus: 'completed',
      largeCompletionHold: true,
    })).toBe('normal-active');
  });
});

describe('HTML scan rail completion hold timing', () => {
  it('matches the world gauge window and expires at 0.30 seconds', () => {
    expect(SCAN_RAIL_COMPLETION_HOLD_SECONDS).toBe(0.30);
    expect(isScanRailCompletionHoldActive(2, 2)).toBe(true);
    expect(isScanRailCompletionHoldActive(2, 2.29)).toBe(true);
    expect(isScanRailCompletionHoldActive(2, 2.30)).toBe(false);
    expect(isScanRailCompletionHoldActive(2, 2.31)).toBe(false);
  });

  it('rejects a future, missing, or invalid completion timestamp', () => {
    expect(isScanRailCompletionHoldActive(2, 1.99)).toBe(false);
    expect(isScanRailCompletionHoldActive(undefined, 2)).toBe(false);
    expect(isScanRailCompletionHoldActive(Number.NaN, 2)).toBe(false);
    expect(isScanRailCompletionHoldActive(2, Number.NaN)).toBe(false);
  });
});
