import type { CreateGraphOptions, GraphView } from "./graph-controller";
import { createGraphController } from "./graph-controller";

export type { CreateGraphOptions, GraphView } from "./graph-controller";

export function createGraph(options: CreateGraphOptions): GraphView {
  return createGraphController(options);
}
