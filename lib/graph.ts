import { readFileSync } from "node:fs";

const EDGE_BYTES = 28;
const MAGIC = "HKGR";
const VERSION = 1;

export interface Graph {
  edgeCount: number;
  nodeCount: number;
  lat: Float32Array;
  lon: Float32Array;
  from: Int32Array;
  to: Int32Array;
  length: Float32Array;
  zDelta: Float32Array;
  mask: Uint8Array;
  compId: Uint16Array;
  nameIdxTc: Int32Array;
  nameIdxEn: Int32Array;
  namePoolTc: string[];
  namePoolEn: string[];
  adjStart: Int32Array;
  adjEdge: Int32Array;
  adjNeighbor: Int32Array;
  gridCols: number;
  gridRows: number;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
  cellLatDeg: number;
  cellLonDeg: number;
  gridStart: Int32Array;
  gridEdges: Int32Array;
}

export function loadGraph(path = "public/graph.bin"): Graph {
  const file = readFileSync(path);
  const buffer = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;
  const dv = new DataView(buffer);

  const magic = String.fromCharCode(
    ...new Uint8Array(buffer, 0, 4),
  );
  if (magic !== MAGIC) throw new Error("not a graph asset");
  const version = dv.getUint16(4, true);
  if (version !== VERSION) throw new Error(`unsupported graph version ${version}`);

  const edgeCount = dv.getUint32(10, true);
  const nodeCount = dv.getUint32(14, true);
  const gridCellCount = dv.getUint32(18, true);
  const gridCols = dv.getUint32(22, true);
  const gridRows = dv.getUint32(26, true);
  const minLat = dv.getFloat32(30, true);
  const minLon = dv.getFloat32(34, true);
  const maxLat = dv.getFloat32(38, true);
  const maxLon = dv.getFloat32(42, true);
  const cellLatDeg = dv.getFloat32(46, true);
  const cellLonDeg = dv.getFloat32(50, true);
  const poolTcCount = dv.getUint32(54, true);
  const poolEnCount = dv.getUint32(58, true);
  const poolTcLen = dv.getUint32(62, true);
  const poolEnLen = dv.getUint32(66, true);

  const nodeOffset = dv.getUint32(74, true);
  const edgeOffset = dv.getUint32(78, true);
  const gridStartOffset = dv.getUint32(82, true);
  const gridEdgesOffset = dv.getUint32(86, true);
  const poolTcOffset = dv.getUint32(90, true);
  const poolEnOffset = dv.getUint32(94, true);

  const lat = new Float32Array(buffer, nodeOffset, nodeCount);
  const lon = new Float32Array(
    buffer,
    nodeOffset + nodeCount * 4,
    nodeCount,
  );

  const from = new Int32Array(edgeCount);
  const to = new Int32Array(edgeCount);
  const length = new Float32Array(edgeCount);
  const zDelta = new Float32Array(edgeCount);
  const mask = new Uint8Array(edgeCount);
  const compId = new Uint16Array(edgeCount);
  const nameIdxTc = new Int32Array(edgeCount);
  const nameIdxEn = new Int32Array(edgeCount);

  for (let i = 0; i < edgeCount; i++) {
    const o = edgeOffset + i * EDGE_BYTES;
    from[i] = dv.getInt32(o, true);
    to[i] = dv.getInt32(o + 4, true);
    length[i] = dv.getFloat32(o + 8, true);
    zDelta[i] = dv.getFloat32(o + 12, true);
    mask[i] = dv.getUint8(o + 16);
    compId[i] = dv.getUint16(o + 17, true);
    nameIdxTc[i] = dv.getInt32(o + 20, true);
    nameIdxEn[i] = dv.getInt32(o + 24, true);
  }

  const gridStart = new Int32Array(
    buffer,
    gridStartOffset,
    gridCellCount + 1,
  );
  const gridEdges = new Int32Array(buffer, gridEdgesOffset, edgeCount);

  const readPool = (offset: number, len: number): string[] => {
    const bytes = new Uint8Array(buffer, offset, len);
    const text = new TextDecoder("utf-8").decode(bytes);
    return text.length > 0 ? text.split("\0") : [];
  };
  const namePoolTc = readPool(poolTcOffset, poolTcLen);
  const namePoolEn = readPool(poolEnOffset, poolEnLen);
  if (namePoolTc.length !== poolTcCount || namePoolEn.length !== poolEnCount) {
    throw new Error("graph string pool corrupt");
  }

  const adjStart = new Int32Array(nodeCount + 1);
  for (let i = 0; i < edgeCount; i++) {
    adjStart[from[i] + 1]++;
    adjStart[to[i] + 1]++;
  }
  for (let i = 0; i < nodeCount; i++) adjStart[i + 1] += adjStart[i];
  const adjEdge = new Int32Array(2 * edgeCount);
  const adjNeighbor = new Int32Array(2 * edgeCount);
  const cursor = adjStart.slice(0, nodeCount);
  for (let i = 0; i < edgeCount; i++) {
    const a = from[i];
    const b = to[i];
    let j = cursor[a]++;
    adjEdge[j] = i;
    adjNeighbor[j] = b;
    j = cursor[b]++;
    adjEdge[j] = i;
    adjNeighbor[j] = a;
  }

  return {
    edgeCount,
    nodeCount,
    lat,
    lon,
    from,
    to,
    length,
    zDelta,
    mask,
    compId,
    nameIdxTc,
    nameIdxEn,
    namePoolTc,
    namePoolEn,
    adjStart,
    adjEdge,
    adjNeighbor,
    gridCols,
    gridRows,
    minLat,
    minLon,
    maxLat,
    maxLon,
    cellLatDeg,
    cellLonDeg,
    gridStart,
    gridEdges,
  };
}

export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function cellOf(g: Graph, lat: number, lon: number): number {
  const col = Math.max(
    0,
    Math.min(
      g.gridCols - 1,
      Math.floor((lon - g.minLon) / g.cellLonDeg),
    ),
  );
  const row = Math.max(
    0,
    Math.min(
      g.gridRows - 1,
      Math.floor((lat - g.minLat) / g.cellLatDeg),
    ),
  );
  return row * g.gridCols + col;
}

export interface SnapResult {
  nodeId: number;
  edgeId: number;
  distanceM: number;
}

export function snap(
  g: Graph,
  lat: number,
  lon: number,
  maskOk: (edgeId: number) => boolean,
  maxDistanceM = 500,
): SnapResult | null {
  const cellLatM = g.cellLatDeg * 111320;
  const cellLonM = g.cellLonDeg * 111320;
  const rings = Math.ceil(maxDistanceM / Math.min(cellLatM, cellLonM)) + 1;
  const center = cellOf(g, lat, lon);
  const centerCol = center % g.gridCols;
  const centerRow = Math.floor(center / g.gridCols);

  let best: SnapResult | null = null;
  for (let dr = -rings; dr <= rings; dr++) {
    for (let dc = -rings; dc <= rings; dc++) {
      const row = centerRow + dr;
      const col = centerCol + dc;
      if (row < 0 || row >= g.gridRows || col < 0 || col >= g.gridCols) {
        continue;
      }
      const cell = row * g.gridCols + col;
      for (
        let k = g.gridStart[cell];
        k < g.gridStart[cell + 1];
        k++
      ) {
        const e = g.gridEdges[k];
        if (!maskOk(e)) continue;
        for (const nodeId of [g.from[e], g.to[e]]) {
          const d = haversineM(lat, lon, g.lat[nodeId], g.lon[nodeId]);
          if (d <= maxDistanceM && (!best || d < best.distanceM)) {
            best = { nodeId, edgeId: e, distanceM: d };
          }
        }
      }
    }
  }
  return best;
}

export function streetName(
  g: Graph,
  edgeId: number,
  lang: "tc" | "en" = "tc",
): string {
  const idx = lang === "tc" ? g.nameIdxTc[edgeId] : g.nameIdxEn[edgeId];
  const pool = lang === "tc" ? g.namePoolTc : g.namePoolEn;
  return idx >= 0 ? pool[idx] : "";
}
