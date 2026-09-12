import type { PaneLayout, PaneTab } from "../core/pane-layout";
import type { EditorMode } from "../core/types";

export type PaneSurfaceActions = {
  readonly select: (tabId: string) => void;
  readonly focus: (groupId: string) => void;
  readonly close: (tabId: string) => void;
  readonly create: (groupId: string) => void;
  readonly menu: (context: {
    readonly group: string;
    readonly tab?: string;
    readonly anchor: HTMLElement;
    readonly point?: { readonly x: number; readonly y: number };
  }) => void;
  readonly mode: (tabId: string, mode: EditorMode) => void;
  readonly graph: (groupId: string) => void;
  readonly move: (
    tabId: string,
    target: {
      readonly group: string;
      readonly position: "center" | "left" | "right" | "top" | "bottom";
      readonly index?: number;
    },
  ) => void;
  readonly resize: (splitId: string, ratio: number) => void;
  readonly toggleExplorer: () => void;
  readonly toggleInspector: () => void;
};

export type PaneSurfaceOptions = {
  readonly parent: HTMLElement;
  readonly layout: PaneLayout;
  readonly content: (tab: PaneTab) => HTMLElement | undefined;
  readonly mode: (tab: PaneTab) => EditorMode;
  readonly actions: PaneSurfaceActions;
};
