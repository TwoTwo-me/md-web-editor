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
type SimulationOptions = {
  readonly nodes: RenderNode[];
  readonly edges: RenderEdge[];
  readonly dimensions: GraphDimensions;
  readonly settings: GraphSettings;
  readonly onTick: () => void;
};

export function createGraphSimulation(
  options: SimulationOptions,
): Simulation<RenderNode, undefined> {
  return forceSimulation(options.nodes)
    .force(
      "center",
      forceCenter(options.dimensions.x / 2, options.dimensions.y / 2).strength(
        options.settings.center,
      ),
    )
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
}
