import { describe, expect, it } from "vitest";
import { visibleLabelIds } from "../src/graph/label-layout";

describe("visibleLabelIds", () => {
  it("keeps the higher-priority label when measured bounds overlap", () => {
    const visible = visibleLabelIds([
      { id: "near", x: 10, y: 10, width: 80, height: 14, priority: 1 },
      { id: "active", x: 45, y: 10, width: 80, height: 14, priority: 2 },
    ]);
    expect(visible).toEqual(new Set(["active"]));
  });

  it("keeps labels whose measured bounds only meet at an edge", () => {
    const visible = visibleLabelIds([
      { id: "left", x: 0, y: 0, width: 40, height: 14, priority: 1 },
      { id: "right", x: 40, y: 0, width: 40, height: 14, priority: 1 },
    ]);
    expect(visible).toEqual(new Set(["left", "right"]));
  });

  it("culls a label that crosses another node circle", () => {
    const visible = visibleLabelIds(
      [{ id: "label", x: 20, y: 10, width: 50, height: 14, priority: 1 }],
      [{ id: "node", x: 40, y: 8, width: 16, height: 16, priority: 4 }],
    );
    expect(visible).toEqual(new Set());
  });

  it("keeps a hovered label over a node obstacle", () => {
    const visible = visibleLabelIds(
      [{ id: "hovered", x: 20, y: 10, width: 50, height: 14, priority: 3 }],
      [{ id: "node", x: 40, y: 8, width: 16, height: 16, priority: 4 }],
    );
    expect(visible).toEqual(new Set(["hovered"]));
  });

  it("does not cull a label against its own node obstacle", () => {
    const visible = visibleLabelIds(
      [{ id: "same", x: 20, y: 10, width: 50, height: 14, priority: 1 }],
      [{ id: "same", x: 20, y: 10, width: 16, height: 16, priority: 4 }],
    );
    expect(visible).toEqual(new Set(["same"]));
  });
});
