export type PageVisibility = "visible" | "hidden";
export type MobileOrientation = "portrait" | "landscape";

export interface MobileLifecycleState {
  visibility: PageVisibility;
  windowFocused: boolean;
  orientation: MobileOrientation;
  landscapeOverride: boolean;
  resumeRequired: boolean;
}

export interface MobileLifecycleOptions {
  visibility?: PageVisibility;
  windowFocused?: boolean;
  orientation?: MobileOrientation;
  viewportWidth?: number;
  viewportHeight?: number;
}

export type MobileLifecycleEvent =
  | { type: "visibilitychange"; visibility: PageVisibility }
  | { type: "blur" }
  | { type: "focus" }
  | { type: "orientationchange"; width: number; height: number }
  | { type: "continue-landscape" }
  | { type: "resume" };

export interface MobileLifecycleStatus {
  pageIsVisible: boolean;
  windowIsFocused: boolean;
  isLandscape: boolean;
  showLandscapeGuidance: boolean;
  shouldPauseGame: boolean;
  canRunGame: boolean;
}

/**
 * Treat a square viewport as portrait so the guidance remains conservative at
 * the exact point where the browser has not settled on an orientation yet.
 */
export function getOrientationFromViewport(
  width: number,
  height: number,
): MobileOrientation {
  return width > height ? "landscape" : "portrait";
}

/** Creates the initial lifecycle state without reading browser globals. */
export function createMobileLifecycleState(
  options: MobileLifecycleOptions = {},
): MobileLifecycleState {
  const visibility = options.visibility ?? "visible";
  const windowFocused = options.windowFocused ?? true;
  const hasViewport =
    options.viewportWidth !== undefined && options.viewportHeight !== undefined;
  const orientation = options.orientation ??
    (hasViewport
      ? getOrientationFromViewport(options.viewportWidth!, options.viewportHeight!)
      : "portrait");

  return {
    visibility,
    windowFocused,
    orientation,
    landscapeOverride: false,
    resumeRequired: visibility === "hidden" || !windowFocused,
  };
}

/**
 * Applies one browser-lifecycle action and returns a new state. The reducer has
 * no DOM or Scene dependencies, so the platform shell can connect it later.
 */
export function reduceMobileLifecycleState(
  state: MobileLifecycleState,
  event: MobileLifecycleEvent,
): MobileLifecycleState {
  switch (event.type) {
    case "visibilitychange":
      return {
        ...state,
        visibility: event.visibility,
        resumeRequired: event.visibility === "hidden" || state.resumeRequired,
      };

    case "blur":
      return {
        ...state,
        windowFocused: false,
        resumeRequired: true,
      };

    case "focus":
      return {
        ...state,
        windowFocused: true,
      };

    case "orientationchange": {
      const orientation = getOrientationFromViewport(event.width, event.height);
      return {
        ...state,
        orientation,
        landscapeOverride: orientation === "landscape"
          ? state.landscapeOverride
          : false,
      };
    }

    case "continue-landscape":
      return state.orientation === "landscape"
        ? { ...state, landscapeOverride: true }
        : state;

    case "resume":
      return {
        ...state,
        resumeRequired: state.visibility !== "visible" || !state.windowFocused,
      };
  }
}

/** Converts state into the decisions needed by a future game-shell adapter. */
export function getMobileLifecycleStatus(
  state: MobileLifecycleState,
): MobileLifecycleStatus {
  const pageIsVisible = state.visibility === "visible";
  const isLandscape = state.orientation === "landscape";
  const showLandscapeGuidance = isLandscape && !state.landscapeOverride;
  const shouldPauseGame =
    !pageIsVisible ||
    !state.windowFocused ||
    state.resumeRequired ||
    showLandscapeGuidance;

  return {
    pageIsVisible,
    windowIsFocused: state.windowFocused,
    isLandscape,
    showLandscapeGuidance,
    shouldPauseGame,
    canRunGame: !shouldPauseGame,
  };
}
