import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const sample = {
  Warning_Message_Tc: ["熱帶氣旋警告現正生效"],
  Warning_Message_En: ["Tropical Cyclone Warning is in force"],
  Update_Time_Year: "2026",
};

describe("weather proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the warning messages in both languages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => sample }),
    );
    const res = await GET();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tc).toBe("熱帶氣旋警告現正生效");
    expect(body.en).toBe("Tropical Cyclone Warning is in force");
  });

  it("returns 502 when the HKO API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 502 on a non-OK upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const res = await GET();
    expect(res.status).toBe(502);
  });
});
