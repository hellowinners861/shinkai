import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VirtualJoystick } from "../src/input/VirtualJoystick";
import { vectorFromDelta, type InputVector } from "../src/input/vector";

type Listener = (event: unknown) => void;

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<Listener>>();

  public addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public dispatch(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class FakeClassList {
  private readonly names = new Set<string>();

  public add(name: string): void {
    this.names.add(name);
  }

  public remove(name: string): void {
    this.names.delete(name);
  }

  public contains(name: string): boolean {
    return this.names.has(name);
  }
}

class FakeKnob {
  public readonly style = { transform: "" };
}

class FakeElement extends FakeEventTarget {
  public readonly classList = new FakeClassList();
  public readonly knob = new FakeKnob();
  public readonly style = { touchAction: "" };
  public capturedPointerId: number | null = null;

  public querySelector<T>(selector: string): T | null {
    if (selector !== "[data-joystick-knob]") {
      return null;
    }

    return this.knob as unknown as T;
  }

  public getBoundingClientRect(): DOMRect {
    return {
      bottom: 264,
      height: 128,
      left: 100,
      right: 228,
      top: 136,
      width: 128,
      x: 100,
      y: 136,
      toJSON: () => ({}),
    } as DOMRect;
  }

  public setPointerCapture(pointerId: number): void {
    this.capturedPointerId = pointerId;
  }
}

class FakeDocument extends FakeEventTarget {
  public visibilityState: DocumentVisibilityState = "visible";
}

interface PointerFixture {
  clientX: number;
  clientY: number;
  isPrimary: boolean;
  pointerId: number;
  preventDefault: () => void;
}

function pointer(overrides: Partial<PointerFixture> = {}): PointerFixture {
  return {
    clientX: 164,
    clientY: 200,
    isPrimary: true,
    pointerId: 1,
    preventDefault: () => undefined,
    ...overrides,
  };
}

describe("VirtualJoystick", () => {
  let fakeDocument: FakeDocument;
  let fakeWindow: FakeEventTarget;

  beforeEach(() => {
    fakeDocument = new FakeDocument();
    fakeWindow = new FakeEventTarget();
    vi.stubGlobal("document", fakeDocument);
    vi.stubGlobal("window", fakeWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calculates a normalized vector from pointer movement and clamps travel", () => {
    const element = new FakeElement();
    const joystick = new VirtualJoystick(element as unknown as HTMLElement, {
      deadZone: 0,
      maxDistance: 48,
    });

    element.dispatch("pointerdown", pointer({ clientX: 200 }));

    expect(joystick.getVector()).toEqual({ x: 0.75, y: 0, magnitude: 0.75 });

    element.dispatch("pointermove", pointer({ clientX: 300 }));

    expect(joystick.getVector()).toEqual({ x: 1, y: 0, magnitude: 1 });

    joystick.destroy();
  });

  it("keeps the pure vector calculation independent from the DOM", () => {
    const vector = vectorFromDelta(-24, 24, 48, 0);

    expect(vector.magnitude).toBeCloseTo(Math.SQRT1_2);
    expect(vector.x).toBeCloseTo(-0.5);
    expect(vector.y).toBeCloseTo(0.5);
  });

  it.each(["pointerup", "pointercancel"] as const)(
    "resets to a neutral vector on %s",
    (releaseEvent) => {
      const element = new FakeElement();
      const changes: InputVector[] = [];
      const joystick = new VirtualJoystick(element as unknown as HTMLElement, {
        deadZone: 0,
        onChange: (vector) => changes.push(vector),
      });

      element.dispatch("pointerdown", pointer({ clientX: 200 }));
      expect(joystick.getVector().magnitude).toBeGreaterThan(0);
      expect(element.classList.contains("is-active")).toBe(true);

      element.dispatch(releaseEvent, pointer());

      expect(joystick.getVector()).toEqual({ x: 0, y: 0, magnitude: 0 });
      expect(element.classList.contains("is-active")).toBe(false);
      expect(element.knob.style.transform).toBe("translate3d(0, 0, 0)");
      expect(changes.at(-1)).toEqual({ x: 0, y: 0, magnitude: 0 });

      joystick.destroy();
    },
  );

  it("accepts a non-primary pointer for two-finger controls", () => {
    const element = new FakeElement();
    const joystick = new VirtualJoystick(element as unknown as HTMLElement, {
      deadZone: 0,
    });

    element.dispatch("pointerdown", pointer({
      clientX: 200,
      pointerId: 2,
      isPrimary: false,
    }));

    expect(joystick.getVector().magnitude).toBeGreaterThan(0);
    expect(element.capturedPointerId).toBe(2);

    joystick.destroy();
  });
  it("does not release the active pointer for another pointer id", () => {
    const element = new FakeElement();
    const joystick = new VirtualJoystick(element as unknown as HTMLElement, {
      deadZone: 0,
    });

    element.dispatch("pointerdown", pointer({ clientX: 200 }));
    element.dispatch("pointerup", pointer({ pointerId: 2 }));

    expect(joystick.getVector().magnitude).toBeGreaterThan(0);

    joystick.destroy();
  });
});
