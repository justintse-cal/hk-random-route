import { loadGraph, type Graph } from "./graph";

let cached: Graph | null = null;

export function serverGraph(): Graph {
  if (!cached) {
    cached = loadGraph(`${process.cwd()}/public/graph.bin`);
  }
  return cached;
}
