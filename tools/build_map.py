"""把台灣縣市 TopoJSON（taiwan-atlas counties-10t.json）轉成網頁用的 SVG 路徑：assets/taiwan-map.svg.js
只取本島與澎湖（金門、連江在框外）。區域標記座標也用同一投影計算，輸出在同一個檔案。
用法：python tools/build_map.py <counties-10t.json>
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LON0, LON1, LAT0, LAT1 = 119.25, 122.15, 21.85, 25.35   # 框選範圍
K = 120                                                 # 每經度的像素數
COS = math.cos(math.radians(23.7))
TOL = 0.9                                               # 簡化容許誤差（像素）

# 研習地點（經緯度）
VENUES = {
    "北": (121.5435, 25.0235),   # 國立臺北教育大學
    "中": (120.6720, 24.1460),   # 國立臺中教育大學
    "南": (120.3170, 22.6250),   # 國立高雄師範大學 和平校區
    "東": (121.6070, 23.9790),   # 花蓮市
}


def project(lon, lat):
    return ((lon - LON0) * COS * K, (LAT1 - lat) * K)


def decode_arcs(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def ring(arcs, idxs):
    pts = []
    for i in idxs:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def simplify_ring(pts, tol):
    # 封閉環的起點等於終點，直接簡化會整圈塌掉：先在離起點最遠處切成兩段
    far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
    return simplify(pts[:far + 1], tol)[:-1] + simplify(pts[far:], tol)[:-1]


def polygons(geom):
    if geom["type"] == "Polygon":
        return [geom["arcs"]]
    if geom["type"] == "MultiPolygon":
        return geom["arcs"]
    return []


def to_path(arcs, geom):
    parts = []
    for poly in polygons(geom):
        for r in poly[:1]:                      # 只畫外框，略過內部洞
            pts = ring(arcs, r)
            lons = [p[0] for p in pts]
            lats = [p[1] for p in pts]
            if max(lons) < LON0 or min(lons) > LON1 or max(lats) < LAT0 or min(lats) > LAT1:
                continue
            xy = simplify_ring([project(*p) for p in pts], TOL)
            if len(xy) < 4:
                continue
            area = abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(xy, xy[1:] + xy[:1]))) / 2
            if area < 3:                         # 太小的離島略過
                continue
            parts.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in xy) + "Z")
    return "".join(parts)


def main(src):
    topo = json.loads(Path(src).read_text(encoding="utf-8"))
    arcs = decode_arcs(topo)
    counties = []
    for g in topo["objects"]["counties"]["geometries"]:
        d = to_path(arcs, g)
        if d:
            counties.append({"id": g["properties"]["COUNTYCODE"], "d": d})
    w, h = project(LON1, LAT0)
    venues = {k: [round(v, 1) for v in project(*ll)] for k, ll in VENUES.items()}
    out = ROOT / "assets" / "taiwan-map.js"
    out.write_text(
        "// 由 tools/build_map.py 產生，資料來源：taiwan-atlas（內政部國土測繪中心縣市界線，政府資料開放授權）\n"
        f"window.TAIWAN_MAP = {json.dumps({'w': round(w), 'h': round(h), 'counties': counties, 'venues': venues}, ensure_ascii=False)};\n",
        encoding="utf-8")
    print(out, len(counties), "counties", out.stat().st_size, "bytes", "viewBox", round(w), round(h))


if __name__ == "__main__":
    main(sys.argv[1])
