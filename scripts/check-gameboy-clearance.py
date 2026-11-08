import hashlib
import json
import math
import sys

import fcl
import numpy as np
from pathlib import Path

if len(sys.argv) != 4:
    sys.exit(
        "Usage: python scripts/check-gameboy-clearance.py <mesh-directory> <circuit.json> <report.json>"
    )
mesh_directory, circuit_path, report_path = sys.argv[1:]
geometry = {
    p.stem: p
    for p in Path(mesh_directory).glob("*.json")
    if p.stem == "pcb" or p.stem.startswith("cad_component_")
}
circuit = json.load(open(circuit_path))
sources = {
    e["source_component_id"]: e["name"]
    for e in circuit
    if e["type"] == "source_component"
}
names = {
    e["cad_component_id"]: sources.get(
        e.get("source_component_id"), e["cad_component_id"]
    )
    for e in circuit
    if e["type"] == "cad_component"
}
bounds = {}
objects = {}
offsets = {}
for id, path in geometry.items():
    g = json.load(open(path))
    v = np.array(g["vertices"], dtype=np.float64)
    f = np.array(g["faces"], dtype=np.int32)
    if not len(f):
        continue
    bounds[id] = np.array([v.min(axis=0), v.max(axis=0)])
    model = fcl.BVHModel()
    model.beginModel(len(f), len(v))
    model.addSubModel(v, f)
    model.endModel()
    objects[id] = fcl.CollisionObject(model)
    offsets[id] = np.zeros(3)
del geometry
print("loaded", len(objects), flush=True)
Path(mesh_directory, "rendered-bounds.json").write_text(
    json.dumps({id: b.tolist() for id, b in bounds.items()})
)


def interval(a, b, delta):
    lo, hi = 0.0, 1.0
    for k in range(3):
        if abs(delta[k]) < 1e-9:
            if a[1, k] < b[0, k] or a[0, k] > b[1, k]:
                return None
        else:
            ts = sorted(
                [(b[0, k] - a[1, k]) / delta[k], (b[1, k] - a[0, k]) / delta[k]]
            )
            lo = max(lo, ts[0])
            hi = min(hi, ts[1])
    if hi < lo:
        return None
    return lo, hi


req = fcl.CollisionRequest(num_max_contacts=1)


def collide(a, b):
    return bool(fcl.collide(objects[a], objects[b], req, fcl.CollisionResult()))


baseline = set()
keys = list(objects)
for a in keys:
    if a not in names or int(a.split("_")[-1]) not in range(124, 182):
        continue
    for b in keys:
        if b == a:
            continue
        pair = tuple(sorted([a, b]))
        if pair in baseline:
            continue
        if interval(bounds[a], bounds[b], np.zeros(3)) and collide(a, b):
            baseline.add(pair)
print("initial mesh contacts", len(baseline), flush=True)
failures = []
for stage in [e for e in circuit if e["type"] == "cad_explosion_stage"]:
    for move in [
        e
        for e in circuit
        if e["type"] == "cad_explosion_move"
        and e["cad_explosion_stage_id"] == stage["cad_explosion_stage_id"]
    ]:
        targets = [t["cad_component_id"] for t in move["targets"]]
        delta = np.array([move["translation"][k] for k in "xyz"])
        for a in targets:
            if a not in objects:
                raise RuntimeError("Missing geometry " + a)
            for b in keys:
                if b in targets:
                    continue
                hit = interval(bounds[a] + offsets[a], bounds[b] + offsets[b], delta)
                if hit is None:
                    continue
                pair = tuple(sorted([a, b]))
                allowed = pair in baseline and collide(a, b)
                lo, hi = hit
                # Maximum 0.25 mm travel between mesh collision probes, including endpoints.
                count = max(1, math.ceil(np.linalg.norm(delta) * (hi - lo) / 0.25))
                for t in np.linspace(lo, hi, count + 1):
                    objects[a].setTranslation(offsets[a] + delta * t)
                    contact = collide(a, b)
                    if not contact:
                        allowed = False
                    if contact and not allowed:
                        failures.append(
                            dict(
                                stage=stage["name"],
                                move=move["order"],
                                a=names.get(a, a),
                                b=names.get(b, b),
                                t=round(float(t), 5),
                            )
                        )
                        break
                objects[a].setTranslation(offsets[a])
        for a in targets:
            offsets[a] += delta
            objects[a].setTranslation(offsets[a])
    print(stage["name"], "new collisions", len(failures), flush=True)
report = {
    "sampleSpacingMm": 0.25,
    "initialContacts": [[names.get(k, k) for k in p] for p in sorted(baseline)],
    "newCollisions": failures,
    "sourceReleaseId": "f18f9b16-dac9-4c8d-9be5-0829dc6eb3c0",
    "assembledSha256": hashlib.sha256(
        Path(circuit_path).read_bytes().rstrip(b"\n")
    ).hexdigest(),
    "method": "Rendered triangle meshes checked with python-fcl at at most 0.25 mm travel intervals. Existing assembled contacts allowed only until first separation. Sampling is not a proof of continuous collision freedom.",
}
Path(report_path).write_text(json.dumps(report, indent=2))
print(json.dumps(failures, indent=2))
sys.exit(bool(failures))
