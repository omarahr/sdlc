import importlib.util
import ast
import json
import random
import sys

GUARD = sys.argv[1]
ROOT = sys.argv[2]
SEED = int(sys.argv[3])
RUNS = int(sys.argv[4])
MODE = sys.argv[5]

spec = importlib.util.spec_from_file_location("push_guard", GUARD)
pg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pg)

KEYS = ("imports", "direct", "network", "dynamic", "wrapperBodies", "wrapperVerbs", "pushes", "forge", "forgeViolations", "opaque", "wrapperValues")


def scan(rel, src):
    report = {k: [] for k in KEYS}
    tree = ast.parse(src)
    pg.Scanner(rel, tree, report, src.splitlines(keepends=True)).visit(tree)
    return {k: sorted(set(v)) for k, v in report.items()}


def changed(a, b):
    return [k for k in KEYS if a[k] != b[k]]


def read(rel):
    with open(f"{ROOT}/{rel}", encoding="utf-8") as f:
        return f.read()


V = "sdlc/S-001-v0-cli-0"
CMD = f"git push origin {V};:"
CONFUSABLE_DASHES = ["‐", "‑", "‒", "–", "−", "－", "﹣"]
NAMES = ["--upload-pack", "--receive-pack", "--exec", "-u", "--upl", "--upload-p", "--config"]
HOSTS = [
    ("skills/sdlc/state-write.py", lambda verb, opt: f"git(repo, {verb!r}, 'origin', {opt}, check=False)", ["fetch", "merge", "commit", "checkout", "branch", "push"]),
    ("skills/sdlc/suite-receipt.py", lambda verb, opt: f"git(repo, {verb!r}, 'origin', {opt})", ["fetch", "ls-tree", "rev-parse"]),
    ("skills/sdlc/next-action.py", lambda verb, opt: f"run(repo, 'git', {verb!r}, 'origin', {opt})", ["fetch", "branch", "rev-parse", "for-each-ref", "push"]),
]


def r1_kinds(rng, name):
    value = f"{name}={CMD}"
    return [
        ("const", repr(value), True),
        ("fstring-leading-expr", "f\"{''}" + value + "\"", True),
        ("fstring-leading-var", "f\"{pre}" + value + "\"", "flow"),
        ("strip-call", repr(value) + ".strip()", True),
        ("str-call", f"str({value!r})", True),
        ("variable", "opt", "flow"),
        ("starred-list", "*opts", "flow"),
        ("two-tokens", f"{name!r}, {CMD!r}", True),
        ("concat-const", f"{name + '='!r} + {CMD!r}", True),
        ("concat-var-first", f"pre + {value!r}", "flow"),
        ("format-call", f"'{{}}'.format({value!r})", True),
        ("percent", f"'%s' % {value!r}", True),
        ("join-call", f"''.join([{value!r}])", True),
        ("whitespace-pad", repr(" " + value), True),
        ("confusable-dash", repr(rng.choice(CONFUSABLE_DASHES) + value.lstrip("-")), False),
    ]


def r2_kinds(rng, name):
    value = f"{name}={CMD}"
    return [
        ("bytes-const", "b" + repr(value), True),
        ("bytes-two-tokens", f"b{name!r}, b{CMD!r}", True),
        ("starred-const-list", f"*[{value!r}]", True),
        ("starred-const-tuple", f"*({value!r},)", True),
        ("ifexp", f"{value!r} if repo else ''", True),
        ("subscript", f"[{value!r}][0]", True),
        ("walrus", f"(o := {value!r})", True),
        ("bytes-decode", f"b{value!r}.decode()", True),
        ("fspath", f"__import__('os').fspath({value!r})", True),
        ("tab-pad", repr("\t" + value), True),
        ("newline-pad", repr("\n" + value), True),
        ("nbsp-pad", repr(" " + value), False),
    ]


def options(seed, runs, make_kinds):
    rng = random.Random(seed)
    clean = {rel: scan(rel, read(rel)) for rel, _, _ in HOSTS}
    failures, kinds, observations = [], {}, []
    for run in range(runs):
        rel, make, verbs = rng.choice(HOSTS)
        verb = rng.choice(verbs)
        name = rng.choice(NAMES)
        kind, expr, in_model = rng.choice(make_kinds(rng, name))
        call = make(verb, expr)
        body = f"\n\ndef _verify_probe(repo, pre='', opt='', opts=()):\n    {call}\n"
        keys = changed(clean[rel], scan(rel, read(rel) + body))
        hit = bool({"wrapperVerbs", "opaque", "pushes"} & set(keys))
        k = kinds.setdefault(kind, {"runs": 0, "hits": 0})
        k["runs"] += 1
        k["hits"] += int(hit)
        if hit:
            continue
        if in_model == "flow":
            observations.append({"run": run, "seedS1": kind, "call": call})
            continue
        if not in_model:
            if len([o for o in observations if o["kind"] == kind]) < 2:
                observations.append({"run": run, "kind": kind, "call": call})
            continue
        failures.append({"run": run, "kind": kind, "file": rel, "call": call, "changed": keys})
    return kinds, failures, observations


make_kinds = r1_kinds if MODE == "r1" else r2_kinds
kinds, failures, observations = options(SEED, RUNS, make_kinds)
firsts = {}
for f in failures:
    firsts.setdefault(f["kind"], f)
print(json.dumps({"mode": MODE, "seed": SEED, "runs": RUNS, "python": sys.version.split()[0], "kinds": kinds, "failureCount": len(failures), "failures": list(firsts.values()), "observations": observations}, ensure_ascii=True))
