type ResizeOptions = {
  readonly split: HTMLElement;
  readonly handle: HTMLElement;
  readonly axis: "horizontal" | "vertical";
  readonly ratio: () => number;
  readonly set: (ratio: number) => void;
};

const minimum = 0.15;
const maximum = 0.85;

function clamp(value: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function setValue(options: ResizeOptions, ratio: number): void {
  const value = clamp(ratio);
  options.handle.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  options.set(value);
}

export function installPaneResize(options: ResizeOptions): void {
  const horizontal = options.axis === "horizontal";
  options.handle.setAttribute("role", "separator");
  options.handle.tabIndex = 0;
  options.handle.setAttribute("aria-orientation", horizontal ? "vertical" : "horizontal");
  options.handle.setAttribute("aria-label", horizontal ? "가로 분할 비율" : "세로 분할 비율");
  options.handle.setAttribute("aria-valuemin", String(minimum * 100));
  options.handle.setAttribute("aria-valuemax", String(maximum * 100));
  options.handle.setAttribute("aria-valuenow", String(Math.round(options.ratio() * 100)));
  options.handle.addEventListener("keydown", (event) => {
    const increase = horizontal ? event.key === "ArrowRight" : event.key === "ArrowDown";
    const decrease = horizontal ? event.key === "ArrowLeft" : event.key === "ArrowUp";
    if (increase || decrease) {
      event.preventDefault();
      setValue(options, options.ratio() + (increase ? 0.05 : -0.05));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setValue(options, minimum);
    }
    if (event.key === "End") {
      event.preventDefault();
      setValue(options, maximum);
    }
  });
  options.handle.addEventListener("dblclick", () => setValue(options, 0.5));
  options.handle.addEventListener("pointerdown", (event) => {
    const box = options.split.getBoundingClientRect();
    const size = horizontal ? box.width : box.height;
    if (size <= 0) return;
    options.handle.setPointerCapture(event.pointerId);
    const move = (pointer: PointerEvent) => {
      const point = horizontal ? pointer.clientX - box.left : pointer.clientY - box.top;
      setValue(options, point / size);
    };
    const end = () => {
      options.handle.removeEventListener("pointermove", move);
      options.handle.removeEventListener("pointerup", end);
      options.handle.removeEventListener("pointercancel", end);
    };
    options.handle.addEventListener("pointermove", move);
    options.handle.addEventListener("pointerup", end);
    options.handle.addEventListener("pointercancel", end);
  });
}
