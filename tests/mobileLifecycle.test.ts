import { describe, expect, it } from "vitest";

import {
  createMobileLifecycleState,
  getMobileLifecycleStatus,
  getOrientationFromViewport,
  reduceMobileLifecycleState,
  type MobileLifecycleEvent,
  type MobileLifecycleState,
} from "../src/platform/mobileLifecycle";

function transition(
  state: MobileLifecycleState,
  event: MobileLifecycleEvent,
): MobileLifecycleState {
  return reduceMobileLifecycleState(state, event);
}

describe("mobile lifecycle state", () => {
  it("derives portrait and landscape from viewport dimensions", () => {
    expect(getOrientationFromViewport(450, 800)).toBe("portrait");
    expect(getOrientationFromViewport(800, 450)).toBe("landscape");
    expect(getOrientationFromViewport(500, 500)).toBe("portrait");
  });

  it("starts runnable by default and can derive the initial orientation", () => {
    const state = createMobileLifecycleState({
      viewportWidth: 800,
      viewportHeight: 450,
    });

    expect(state).toEqual({
      visibility: "visible",
      windowFocused: true,
      orientation: "landscape",
      landscapeOverride: false,
      resumeRequired: false,
    });
    expect(getMobileLifecycleStatus(state)).toMatchObject({
      isLandscape: true,
      showLandscapeGuidance: true,
      shouldPauseGame: true,
      canRunGame: false,
    });
  });

  it("pauses when the page becomes hidden and waits for an explicit resume", () => {
    const initial = createMobileLifecycleState();
    const hidden = transition(initial, {
      type: "visibilitychange",
      visibility: "hidden",
    });
    const visible = transition(hidden, {
      type: "visibilitychange",
      visibility: "visible",
    });

    expect(hidden.resumeRequired).toBe(true);
    expect(getMobileLifecycleStatus(hidden).shouldPauseGame).toBe(true);
    expect(visible.resumeRequired).toBe(true);
    expect(getMobileLifecycleStatus(visible).canRunGame).toBe(false);

    const resumed = transition(visible, { type: "resume" });
    expect(resumed.resumeRequired).toBe(false);
    expect(getMobileLifecycleStatus(resumed).canRunGame).toBe(true);
  });

  it("pauses on window blur and focus alone does not resume the game", () => {
    const initial = createMobileLifecycleState();
    const blurred = transition(initial, { type: "blur" });
    const focused = transition(blurred, { type: "focus" });

    expect(blurred.windowFocused).toBe(false);
    expect(blurred.resumeRequired).toBe(true);
    expect(getMobileLifecycleStatus(blurred).shouldPauseGame).toBe(true);
    expect(focused.windowFocused).toBe(true);
    expect(focused.resumeRequired).toBe(true);
    expect(getMobileLifecycleStatus(focused).canRunGame).toBe(false);

    const resumed = transition(focused, { type: "resume" });
    expect(getMobileLifecycleStatus(resumed).canRunGame).toBe(true);
  });

  it("shows landscape guidance, allows continuation, and resets it in portrait", () => {
    const initial = createMobileLifecycleState();
    const landscape = transition(initial, {
      type: "orientationchange",
      width: 800,
      height: 450,
    });

    expect(landscape.orientation).toBe("landscape");
    expect(landscape.landscapeOverride).toBe(false);
    expect(getMobileLifecycleStatus(landscape)).toMatchObject({
      showLandscapeGuidance: true,
      shouldPauseGame: true,
      canRunGame: false,
    });

    const continued = transition(landscape, { type: "continue-landscape" });
    expect(continued.landscapeOverride).toBe(true);
    expect(getMobileLifecycleStatus(continued)).toMatchObject({
      showLandscapeGuidance: false,
      shouldPauseGame: false,
      canRunGame: true,
    });

    const portrait = transition(continued, {
      type: "orientationchange",
      width: 450,
      height: 800,
    });
    expect(portrait.orientation).toBe("portrait");
    expect(portrait.landscapeOverride).toBe(false);
    expect(getMobileLifecycleStatus(portrait).showLandscapeGuidance).toBe(false);
  });

  it("does not allow resume or landscape continuation while the action is invalid", () => {
    const hiddenLandscape = createMobileLifecycleState({
      visibility: "hidden",
      viewportWidth: 800,
      viewportHeight: 450,
    });

    const resumedWhileHidden = transition(hiddenLandscape, { type: "resume" });
    expect(resumedWhileHidden.resumeRequired).toBe(true);
    expect(resumedWhileHidden.landscapeOverride).toBe(false);

    const continuedWhileHidden = transition(hiddenLandscape, {
      type: "continue-landscape",
    });
    expect(continuedWhileHidden.landscapeOverride).toBe(true);
    expect(getMobileLifecycleStatus(continuedWhileHidden).shouldPauseGame).toBe(true);

    const portrait = transition(hiddenLandscape, {
      type: "orientationchange",
      width: 450,
      height: 800,
    });
    expect(transition(portrait, { type: "continue-landscape" })).toEqual(portrait);
  });
});
