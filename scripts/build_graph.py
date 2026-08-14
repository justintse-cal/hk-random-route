"""Build the binary graph asset from the HK 3D Pedestrian Network geodatabase.

Reads the `PedestrianRoute` layer of the file geodatabase (EPSG:2326 + HKPD
heights) and emits a compact little-endian binary file that the route
generation function loads at runtime.

Usage:
    python scripts/build_graph.py [PATH_TO.gdb] [-o OUT.bin] [--cell-m 100]
"""

import argparse
import os
import struct
import sys
import time

import numpy as np
import pyogrio
import pyproj
from shapely import get_coordinates

MAGIC = b"HKGR"
VERSION = 1
HEADER_SIZE = 100
EDGE_BYTES = 28

# Filter bitmask semantics (encode semantics, not raw codes):
#   Location        1 = outdoor, 2 = indoor
#   WeatherProof    1 = covered (2/3 = non-covered)
#   WheelchairBarrier 1 = flagged unsuitable for mobility access (2 = not flagged)
#   flat            Gradient < 0.1
BIT_OUTDOOR = 0x01
BIT_INDOOR = 0x02
BIT_COVERED = 0x04
BIT_BARRIER_FREE = 0x08
BIT_FLAT = 0x10


def build_filter_mask(location, weather_proof, wheelchair_barrier, gradient):
    mask = 0
    if location == 1:
        mask |= BIT_OUTDOOR
    elif location == 2:
        mask |= BIT_INDOOR
    if weather_proof == 1:
        mask |= BIT_COVERED
    if wheelchair_barrier == 2:
        mask |= BIT_BARRIER_FREE
    if gradient < 0.1:
        mask |= BIT_FLAT
    return mask


def build_string_pool(values):
    """Dedupe strings; return (per-edge int32 indices, pool list)."""
    pool = []
    index = {}
    out = np.full(len(values), -1, dtype=np.int32)
    for i, v in enumerate(values):
        if isinstance(v, str) and v:
            j = index.get(v)
            if j is None:
                j = len(pool)
                index[v] = j
                pool.append(v)
            out[i] = j
    return out, pool


def pool_bytes(pool):
    return ("\x00".join(pool)).encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description="Build the binary graph asset.")
    parser.add_argument("gdb", nargs="?", default="3DPN_P2.gdb")
    parser.add_argument("-o", "--out", default="public/graph.bin")
    parser.add_argument("--cell-m", type=float, default=100.0,
                        help="target spatial-index cell size in metres")
    args = parser.parse_args()

    t0 = time.time()

    df = pyogrio.read_dataframe(
        args.gdb,
        layer="PedestrianRoute",
        columns=[
            "PedestrianRouteID", "Location", "WeatherProof",
            "WheelchairBarrier", "Gradient", "AliasNameTC", "AliasNameEN",
            "Shape_Length",
        ],
    )
    n = len(df)
    print(f"read {n} segments in {time.time() - t0:.1f}s")

    first = np.empty((n, 2))
    last = np.empty((n, 2))
    z_first = np.zeros(n, dtype=np.float64)
    z_last = np.zeros(n, dtype=np.float64)
    for i in range(n):
        c = get_coordinates(df.geometry.iloc[i], include_z=True)
        c = c[~np.isnan(c[:, 0])]
        first[i] = c[0, :2]
        last[i] = c[-1, :2]
        if c.shape[1] >= 3:
            z_first[i] = c[0, 2]
            z_last[i] = c[-1, 2]

    xs = np.concatenate([first[:, 0], last[:, 0]])
    ys = np.concatenate([first[:, 1], last[:, 1]])

    node_map = {}
    node_coords = []
    ids = np.empty(len(xs), dtype=np.int32)
    for i in range(len(xs)):
        key = (xs[i], ys[i])
        j = node_map.get(key)
        if j is None:
            j = len(node_map)
            node_map[key] = j
            node_coords.append(key)
        ids[i] = j

    from_ids = ids[:n]
    to_ids = ids[n:]
    node_count = len(node_map)
    print(f"nodes: {node_count}")

    transformer = pyproj.Transformer.from_crs("EPSG:2326", "EPSG:4326",
                                              always_xy=True)
    lons, lats = transformer.transform(
        [c[0] for c in node_coords], [c[1] for c in node_coords]
    )
    node_lat = np.asarray(lats, dtype=np.float32)
    node_lon = np.asarray(lons, dtype=np.float32)

    parent = list(range(node_count))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for f, t in zip(from_ids, to_ids):
        union(f, t)

    edge_roots = [find(f) for f in from_ids]
    distinct_roots = sorted(set(edge_roots))
    root_to_comp = {r: i for i, r in enumerate(distinct_roots)}
    comp_id = np.array([root_to_comp[r] for r in edge_roots], dtype=np.uint16)
    component_count = len(distinct_roots)
    print(f"components: {component_count}")

    shapes = np.asarray(df["Shape_Length"], dtype=np.float32)
    z_delta = (z_last - z_first).astype(np.float32)

    masks = np.array([
        build_filter_mask(loc, wp, wb, g)
        for loc, wp, wb, g in zip(
            df["Location"], df["WeatherProof"], df["WheelchairBarrier"],
            df["Gradient"],
        )
    ], dtype=np.uint8)

    name_idx_tc, pool_tc = build_string_pool(df["AliasNameTC"])
    name_idx_en, pool_en = build_string_pool(df["AliasNameEN"])
    pool_tc_bytes = pool_bytes(pool_tc)
    pool_en_bytes = pool_bytes(pool_en)
    print(f"name pool TC: {len(pool_tc)} strings, {len(pool_tc_bytes)} bytes; "
          f"EN: {len(pool_en)} strings, {len(pool_en_bytes)} bytes")

    min_lat = float(node_lat.min())
    max_lat = float(node_lat.max())
    min_lon = float(node_lon.min())
    max_lon = float(node_lon.max())
    mean_lat = np.deg2rad((min_lat + max_lat) / 2.0)
    cell_lat_deg = args.cell_m / 111_320.0
    cell_lon_deg = args.cell_m / (111_320.0 * np.cos(mean_lat))
    grid_cols = max(1, int(np.ceil((max_lon - min_lon) / cell_lon_deg)))
    grid_rows = max(1, int(np.ceil((max_lat - min_lat) / cell_lat_deg)))
    grid_cells = grid_cols * grid_rows
    print(f"grid: {grid_cols}x{grid_rows} = {grid_cells} cells")

    mid_lat = (node_lat[from_ids] + node_lat[to_ids]) * 0.5
    mid_lon = (node_lon[from_ids] + node_lon[to_ids]) * 0.5
    edge_col = np.clip(
        np.floor((mid_lon - min_lon) / cell_lon_deg).astype(np.int64),
        0, grid_cols - 1,
    )
    edge_row = np.clip(
        np.floor((mid_lat - min_lat) / cell_lat_deg).astype(np.int64),
        0, grid_rows - 1,
    )
    edge_cells = (edge_row * grid_cols + edge_col).astype(np.int32)

    counts = np.bincount(edge_cells, minlength=grid_cells)
    cell_start = np.zeros(grid_cells + 1, dtype=np.int32)
    np.cumsum(counts, out=cell_start[1:])
    cell_edges = np.empty(n, dtype=np.int32)
    cursor = np.zeros(grid_cells, dtype=np.int32)
    for i, c in enumerate(edge_cells):
        pos = cell_start[c] + cursor[c]
        cell_edges[pos] = i
        cursor[c] += 1

    node_bytes = node_lat.tobytes() + node_lon.tobytes()
    assert len(node_bytes) == node_count * 8

    edge_records = np.zeros(n, dtype=np.uint8).tobytes()
    with open(os.devnull, "wb") as _:
        pass
    chunks = []
    for i in range(n):
        chunks.append(struct.pack(
            "<iiffBHxii",
            int(from_ids[i]), int(to_ids[i]),
            float(shapes[i]), float(z_delta[i]),
            int(masks[i]), int(comp_id[i]),
            int(name_idx_tc[i]), int(name_idx_en[i]),
        ))
    edge_bytes = b"".join(chunks)
    assert len(edge_bytes) == n * EDGE_BYTES

    grid_start_bytes = cell_start.tobytes()
    grid_edges_bytes = cell_edges.tobytes()

    node_offset = HEADER_SIZE
    edge_offset = node_offset + len(node_bytes)
    grid_start_offset = edge_offset + len(edge_bytes)
    grid_edges_offset = grid_start_offset + len(grid_start_bytes)
    pool_tc_offset = grid_edges_offset + len(grid_edges_bytes)
    pool_en_offset = pool_tc_offset + len(pool_tc_bytes)

    header = struct.pack(
        "<4sH I IIIII ffffff IIII I IIIIII 2x",
        MAGIC, VERSION, HEADER_SIZE,
        n, node_count, grid_cells, grid_cols, grid_rows,
        min_lat, min_lon, max_lat, max_lon, cell_lat_deg, cell_lon_deg,
        len(pool_tc), len(pool_en), len(pool_tc_bytes), len(pool_en_bytes),
        component_count,
        node_offset, edge_offset, grid_start_offset, grid_edges_offset,
        pool_tc_offset, pool_en_offset,
    )
    assert len(header) == HEADER_SIZE, len(header)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "wb") as f:
        f.write(header)
        f.write(node_bytes)
        f.write(edge_bytes)
        f.write(grid_start_bytes)
        f.write(grid_edges_bytes)
        f.write(pool_tc_bytes)
        f.write(pool_en_bytes)

    size_mb = os.path.getsize(args.out) / (1024 * 1024)
    print(f"wrote {args.out} ({size_mb:.1f} MB) in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    sys.exit(main())
