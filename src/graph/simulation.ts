import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphNode } from "../core/types";
import type { GraphSettings } from "./settings";

export type RenderNode = GraphNode & SimulationNodeDatum;
export type RenderEdge = SimulationLinkDatum<RenderNode>;
export type GraphDimensions = { readonly x: number; readonly y: number };
export type GraphSimulation = {
  readonly instance: Simulation<RenderNode, undefined>;
  setDimensions(dimensions: GraphDimensions): void;
  centerImmediately(): void;
};
type SimulationOptions = {
  readonly nodes: RenderNode[];
  readonly edges: RenderEdge[];
  readonly dimensions: GraphDimensions;
  readonly settings: GraphSettings;
  readonly onTick: () => void;
};

export function createGraphSimulation(options: SimulationOptions): GraphSimulation {
  const center = forceCenter(options.dimensions.x / 2, options.dimensions.y / 2).strength(
    options.settings.center,
  );
  const instance = forceSimulation(options.nodes)
    .force("center", center)
    .force("charge", forceManyBody().strength(-options.settings.repel))
    .force("collide", forceCollide<RenderNode>().radius(16 * options.settings.nodeScale))
    .force(
      "link",
      forceLink<RenderNode, RenderEdge>(options.edges)
        .id((node) => node.id)
        .distance(options.settings.linkDistance)
        .strength(options.settings.linkStrength),
    )
    .on("tick", options.onTick);

  return {
    instance,
    setDimensions(dimensions) {
      center.x(dimensions.x / 2).y(dimensions.y / 2);
    },
    centerImmediately() {
      const strength = center.strength();
      center.strength(1);
      instance.tick();
      center.strength(strength);
    },
  };
}
