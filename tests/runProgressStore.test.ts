import { describe, expect, it } from "vitest";

import {
  createEmptyRunProgress,
  createRunProgressUpdateGuard,
  parseRunProgress,
  readRunProgress,
  updateRunProgress,
  updateRunProgressOnce,
  writeRunProgress,
  RUN_PROGRESS_STORAGE_KEY,
} from "../src/platform/runProgressStore";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("run progress store", () => {
  it("reads and writes the versioned localStorage record", () => {
    const storage = new MemoryStorage();
    expect(readRunProgress(storage)).toEqual(createEmptyRunProgress());

    expect(writeRunProgress({
      diveCount: 2,
      clearCount: 1,
      bestScore: 1_493,
      bestDepthM: 6_000,
    }, storage)).toBe(true);
    expect(storage.getItem(RUN_PROGRESS_STORAGE_KEY)).toBe(
      '{"version":1,"diveCount":2,"clearCount":1,"bestScore":1493,"bestDepthM":6000}',
    );
    expect(readRunProgress(storage)).toEqual({
      diveCount: 2,
      clearCount: 1,
      bestScore: 1_493,
      bestDepthM: 6_000,
    });
  });

  it("resets malformed, unknown-version, negative, and non-finite payloads", () => {
    const empty = createEmptyRunProgress();
    expect(parseRunProgress("not json")).toEqual(empty);
    expect(parseRunProgress(JSON.stringify({
      version: 2,
      diveCount: 2,
      clearCount: 1,
      bestScore: 10,
      bestDepthM: 100,
    }))).toEqual(empty);
    expect(parseRunProgress(JSON.stringify({
      version: 1,
      diveCount: -1,
      clearCount: 1,
      bestScore: 10,
      bestDepthM: 100,
    }))).toEqual(empty);
    expect(parseRunProgress(JSON.stringify({
      version: 1,
      diveCount: 2,
      clearCount: 1,
      bestScore: null,
      bestDepthM: 100,
    }))).toEqual(empty);
  });

  it("updates dive/clear counts and keeps personal bests monotonic", () => {
    const initial = createEmptyRunProgress();
    const cleared = updateRunProgress(initial, {
      outcome: "cleared",
      score: 1_493,
      reachedDepthM: 6_000,
    });
    expect(cleared).toEqual({
      diveCount: 1,
      clearCount: 1,
      bestScore: 1_493,
      bestDepthM: 6_000,
    });

    expect(updateRunProgress(cleared, {
      outcome: "depleted",
      score: 50,
      reachedDepthM: 800,
    })).toEqual({
      diveCount: 2,
      clearCount: 1,
      bestScore: 1_493,
      bestDepthM: 6_000,
    });
  });

  it("applies one keyed result exactly once through a pure guard", () => {
    const result = {
      sessionId: "session-1",
      resultId: "result-1",
      outcome: "cleared",
      score: 500,
      reachedDepthM: 6_000,
    };
    const first = updateRunProgressOnce(
      createEmptyRunProgress(),
      result,
      createRunProgressUpdateGuard(),
    );
    expect(first.updated).toBe(true);
    expect(first.progress.diveCount).toBe(1);

    const repeated = updateRunProgressOnce(first.progress, result, first.guard);
    expect(repeated.updated).toBe(false);
    expect(repeated.progress).toEqual(first.progress);
    expect(repeated.guard).toBe(first.guard);
  });
});
