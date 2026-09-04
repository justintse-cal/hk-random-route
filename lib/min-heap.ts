interface HeapEntry {
  node: number;
  dist: number;
}

export interface MinHeap {
  push(node: number, dist: number): void;
  pop(): HeapEntry | undefined;
  readonly size: number;
}

export function createMinHeap(): MinHeap {
  const data: HeapEntry[] = [];

  function swap(i: number, j: number): void {
    const tmp = data[i];
    data[i] = data[j];
    data[j] = tmp;
  }

  function siftUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (data[idx].dist < data[parent].dist) {
        swap(idx, parent);
        idx = parent;
      } else break;
    }
  }

  function siftDown(idx: number): void {
    const n = data.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < n && data[left].dist < data[smallest].dist) smallest = left;
      if (right < n && data[right].dist < data[smallest].dist) smallest = right;
      if (smallest === idx) break;
      swap(idx, smallest);
      idx = smallest;
    }
  }

  return {
    push(node, dist) {
      data.push({ node, dist });
      siftUp(data.length - 1);
    },
    pop() {
      if (data.length === 0) return undefined;
      const top = data[0];
      const last = data.pop()!;
      if (data.length > 0) {
        data[0] = last;
        siftDown(0);
      }
      return top;
    },
    get size() {
      return data.length;
    },
  };
}
