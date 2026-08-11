import { vectorFromDelta, type InputVector } from "./vector";

export interface VirtualJoystickOptions {
  maxDistance?: number;
  deadZone?: number;
  onChange?: (vector: InputVector) => void;
}

const DEFAULT_MAX_DISTANCE = 48;
const DEFAULT_DEAD_ZONE = 0.12;

/**
 * A reusable, floating pointer joystick for the mobile shell.
 *
 * The visual element is deliberately HTML/CSS so its 120px touch target stays
 * a CSS size even when the Phaser canvas is FIT-scaled to a 320px viewport.
 * Pointer coordinates are measured against the element's current client rect,
 * which keeps the input aligned after browser resize and orientation changes.
 */
export class VirtualJoystick {
  private readonly element: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly maxDistance: number;
  private readonly deadZone: number;
  private readonly onChange?: (vector: InputVector) => void;
  private pointerId: number | null = null;
  private vector: InputVector = { x: 0, y: 0, magnitude: 0 };

  public constructor(
    element: HTMLElement,
    options: VirtualJoystickOptions = {},
  ) {
    const knob = element.querySelector<HTMLElement>("[data-joystick-knob]");
    if (!knob) {
      throw new Error("VirtualJoystick requires a [data-joystick-knob] element");
    }

    this.element = element;
    this.knob = knob;
    this.maxDistance = options.maxDistance ?? DEFAULT_MAX_DISTANCE;
    this.deadZone = options.deadZone ?? DEFAULT_DEAD_ZONE;
    this.onChange = options.onChange;

    this.element.style.touchAction = "none";
    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerUp);
    this.element.addEventListener("pointercancel", this.handlePointerCancel);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleWindowBlur);

    this.reset();
  }

  public getVector(): InputVector {
    return { ...this.vector };
  }

  public reset(): void {
    this.pointerId = null;
    this.vector = { x: 0, y: 0, magnitude: 0 };
    this.element.classList.remove("is-active");
    this.knob.style.transform = "translate3d(0, 0, 0)";
    this.onChange?.(this.getVector());
  }

  public destroy(): void {
    this.element.removeEventListener("pointerdown", this.handlePointerDown);
    this.element.removeEventListener("pointermove", this.handlePointerMove);
    this.element.removeEventListener("pointerup", this.handlePointerUp);
    this.element.removeEventListener("pointercancel", this.handlePointerCancel);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("blur", this.handleWindowBlur);
    this.reset();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.pointerId !== null || !event.isPrimary) {
      return;
    }

    event.preventDefault();
    this.pointerId = event.pointerId;
    this.element.classList.add("is-active");
    this.updateFromPointer(event);

    if (this.element.setPointerCapture) {
      this.element.setPointerCapture(event.pointerId);
    }
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    event.preventDefault();
    this.updateFromPointer(event);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) {
      this.reset();
    }
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) {
      this.reset();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.reset();
    }
  };

  private readonly handleWindowBlur = (): void => {
    this.reset();
  };

  private updateFromPointer(event: PointerEvent): void {
    const bounds = this.element.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const nextVector = vectorFromDelta(
      event.clientX - centerX,
      event.clientY - centerY,
      this.maxDistance,
      this.deadZone,
    );

    this.vector = nextVector;
    const knobX = nextVector.x * this.maxDistance;
    const knobY = nextVector.y * this.maxDistance;
    this.knob.style.transform = `translate3d(${knobX}px, ${knobY}px, 0)`;
    this.onChange?.(this.getVector());
  }
}
