import type { Graph } from "./graph";
import { createMinHeap } from "./min-heap";

const UNREACHABLE = 1e9;

/**
 * Compute shortest-path distances from `origin` to every node within
 * `maxRadiusM` metres, using edge lengths as weights and only traversing
 * edges that pass `edgeOk`.  Returns a Float32Array of size `g.nodeCount`
 * where unreachable nodes are `UNREACHABLE`.
 */
export function dijkstraToOrigin(
  g: Graph,
  origin: number,
  edgeOk: (edgeId: number) => boolean,
  maxRadiusM: number,
): Float32Array {
  const dist = new Float32Array(g.nodeCount);
  dist.fill(UNREACHABLE);
  dist[origin] = 0;

  const heap = createMinHeap();
  heap.push(origin, 0);

  while (heap.size > 0) {
    const entry = heap.pop()!;
    const d = entry.dist;
    if (d > dist[entry.node]) continue;
    if (d > maxRadiusM) continue;

    const u = entry.node;
    for (let i = g.adjStart[u]; i < g.adjStart[u + 1]; i++) {
      const edge = g.adjEdge[i];
      const v = g.adjNeighbor[i];
      if (!edgeOk(edge)) continue;
      const nd = d + g.length[edge];
      if (nd < dist[v] && nd <= maxRadiusM) {
        dist[v] = nd;
        heap.push(v, nd);
      }
    }
  }

  return dist;
}
