import importlib.util
import json
import os
import random
import stat
import subprocess
import sys
import tempfile

branches, seed, runs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
spec = importlib.util.spec_from_file_location("branches_under_test", branches)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

tmp = tempfile.mkdtemp(prefix="verify-contract-prop-")
bindir = os.path.join(tmp, "bin")
os.mkdir(bindir)
bodies = os.path.join(tmp, "bodies")
os.mkdir(bodies)
logf = os.path.join(tmp, "log")
shim = os.path.join(bindir, "gh")
with open(shim, "w") as f:
    f.write(
        '#!/bin/sh\n'
        'echo "$2" >> "%s"\n'
        'n=$(wc -l < "%s" | tr -d " ")\n'
        'cat "%s/$n"\n' % (logf, logf, bodies)
    )
os.chmod(shim, 0o755)
repo = os.path.join(tmp, "repo")
os.makedirs(os.path.join(repo, ".sdlc"))
with open(os.path.join(repo, ".sdlc", "config.json"), "w") as f:
    json.dump({"forge": "github"}, f)
os.environ["PATH"] = bindir + ":" + os.environ["PATH"]

rnd = random.Random(seed)
TYPES = ["branch_name_pattern", "branch_name_pattern", "creation", "pull_request", "required_status_checks", "deletion"]
OPS = ["starts_with", "ends_with", "contains", "regex"]
SAMPLE_POOL = ["sdlc/S-001", "sdlc/state-1", "M-1-e2e", "a b", "x/y/z", "é/ü", "feature/%41"]


def gen_obj():
    o = {"type": rnd.choice(TYPES)}
    if rnd.random() < 0.7:
        o["ruleset_id"] = rnd.choice([1, 22, 0, 9999])
    if rnd.random() < 0.9:
        p = {"operator": rnd.choice(OPS), "pattern": rnd.choice(["feature/", "^x$", "", "é"])}
        if rnd.random() < 0.5:
            p["negate"] = rnd.choice([True, False])
        if rnd.random() < 0.5:
            p["name"] = rnd.choice(["team rule", "r", ""])
        o["parameters"] = p
    return o


def model_rule(o):
    p = o.get("parameters") or {}
    if "name" in p and p["name"]:
        label = p["name"]
    elif "ruleset_id" in o:
        label = "ruleset %s" % o["ruleset_id"]
    else:
        label = "branch_name_pattern"
    return {"source": "github", "kind": p.get("operator"), "pattern": p.get("pattern"), "negate": p.get("negate", False), "label": label}


failures = []
for i in range(runs):
    nsamples = rnd.randint(0, 3)
    samples = [rnd.choice(SAMPLE_POOL) + ("" if rnd.random() < 0.7 else str(rnd.randint(0, 9))) for _ in range(nsamples)]
    if len(set(samples)) != len(samples):
        samples = list(dict.fromkeys(samples))
    for fn in os.listdir(bodies):
        os.remove(os.path.join(bodies, fn))
    if os.path.exists(logf):
        os.remove(logf)
    open(logf, "w").close()
    objs = []
    for k in range(1, len(samples) + 1):
        lst = [gen_obj() for _ in range(rnd.randint(0, 4))]
        objs.append(lst)
        with open(os.path.join(bodies, str(k)), "w") as f:
            json.dump(lst, f)
    res = mod.read_rules(repo, samples)
    exp_by = {s: [model_rule(o) for o in lst if o["type"] == "branch_name_pattern"] for s, lst in zip(samples, objs)}
    exp_union = []
    for s in samples:
        for r in exp_by[s]:
            if r not in exp_union:
                exp_union.append(r)
    problems = []
    if res.get("by_sample") != exp_by:
        problems.append("by_sample differs")
    if res.get("rules") != exp_union:
        problems.append("rules differs from deduplicated union")
    if res.get("notes") != []:
        problems.append("notes not empty")
    if res.get("unchecked") is not False:
        problems.append("unchecked not false")
    if sorted(res) != ["by_sample", "forge", "notes", "rules", "unchecked"]:
        problems.append("result keys %s" % sorted(res))
    for r in res.get("rules", []):
        if tuple(r.keys()) != ("source", "kind", "pattern", "negate", "label") or not isinstance(r["negate"], bool):
            problems.append("rule shape %r" % (r,))
            break
    logged = open(logf).read().splitlines()
    if len(logged) != len(samples):
        problems.append("call count %d != %d" % (len(logged), len(samples)))
    if problems:
        failures.append({"run": i, "samples": samples, "bodies": objs, "problems": problems})
print(json.dumps({"seed": seed, "runs": runs, "failureCount": len(failures), "failures": failures[:3]}))
