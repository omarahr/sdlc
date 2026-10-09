import ast
import importlib.util
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
    ("skills/sdlc/state-write.py", lambda verb, opt: f"git(repo, {verb!r}, 'origin', {opt}, check=False)", ["fetch", "merge", "commit", "checkout", "branch"]),
    ("skills/sdlc/next-action.py", lambda verb, opt: f"run(repo, 'git', {verb!r}, 'origin', {opt})", ["fetch", "branch", "rev-parse", "for-each-ref"]),
]


def spelling(rng, name):
    value = f"{name}={CMD}"
    kinds = [
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
    return rng.choice(kinds)


def options(seed, runs):
    rng = random.Random(seed)
    clean = {rel: scan(rel, read(rel)) for rel, _, _ in HOSTS}
    failures, kinds, observations = [], {}, []
    flow = {}
    for run in range(runs):
        rel, make, verbs = rng.choice(HOSTS)
        verb = rng.choice(verbs)
        name = rng.choice(NAMES)
        kind, expr, in_model = spelling(rng, name)
        body = f"\n\ndef _verify_probe(repo, pre='', opt='', opts=()):\n    {make(verb, expr)}\n"
        out = scan(rel, read(rel) + body)
        keys = changed(clean[rel], out)
        hit = bool({"wrapperVerbs", "opaque", "pushes"} & set(keys))
        kinds.setdefault(kind, {"runs": 0, "hits": 0})
        kinds[kind]["runs"] += 1
        kinds[kind]["hits"] += int(hit)
        if in_model == "flow":
            if not hit:
                flow.setdefault(kind, make(verb, expr))
            continue
        if not in_model:
            if not hit and len(observations) < 3:
                observations.append({"run": run, "kind": kind, "call": make(verb, expr)})
            continue
        if not hit:
            failures.append({"run": run, "kind": kind, "file": rel, "call": make(verb, expr), "changed": keys})
    observations.extend({"seedS1": k, "call": v} for k, v in sorted(flow.items()))
    return kinds, failures, observations


PLACES = ["module-end", "other-function", "try-block", "if-block", "class-body", "nested-function", "with-block", "while-block", "except-handler"]
TARGETS = [
    ("import subprocess as {a}", "{a}.run(['git', 'push', 'origin', b])"),
    ("import subprocess as {a}", "{a}.Popen(['git', 'push', 'origin', b])"),
    ("from subprocess import run as {a}", "{a}(['git', 'push', 'origin', b])"),
    ("from subprocess import Popen as {a}", "{a}(['git', 'push', 'origin', b])"),
    ("from subprocess import check_call as {a}", "{a}(['git', 'push', 'origin', b])"),
    ("import os as {a}", "{a}.system('git push origin ' + b)"),
    ("from os import system as {a}", "{a}('git push origin ' + b)"),
    ("from os import popen as {a}", "{a}('git push origin ' + b)"),
    ("import os as {a}", "{a}.execvp('git', ['git', 'push', 'origin', b])"),
    ("from os import spawnlp as {a}", "{a}(0, 'git', 'git', 'push', 'origin', b)"),
]
ALIASES = ["sp", "_r", "_o", "p", "run_it", "S", "x1", "os_", "proc"]


def place(where, stmt):
    if where == "module-end":
        return f"\n\n{stmt}\n"
    if where == "other-function":
        return f"\n\ndef _verify_binder():\n    {stmt}\n"
    if where == "try-block":
        return f"\n\ntry:\n    {stmt}\nexcept ImportError:\n    pass\n"
    if where == "if-block":
        return f"\n\nif __name__ == '_never':\n    {stmt}\n"
    if where == "class-body":
        return f"\n\nclass _VerifyBinder:\n    {stmt}\n"
    if where == "nested-function":
        return f"\n\ndef _verify_outer():\n    def _inner():\n        {stmt}\n    return _inner\n"
    if where == "with-block":
        return f"\n\nwith open(__file__):\n    {stmt}\n"
    if where == "while-block":
        return f"\n\nwhile False:\n    {stmt}\n"
    return f"\n\ntry:\n    pass\nexcept Exception:\n    {stmt}\n"


def aliases(seed, runs):
    rng = random.Random(seed)
    hosts = ["skills/sdlc/janitor.py", "skills/sdlc/branches.py", "skills/sdlc/tracker/collect.py"]
    clean = {rel: scan(rel, read(rel)) for rel in hosts}
    failures, kinds = [], {}
    for run in range(runs):
        rel = rng.choice(hosts)
        where = rng.choice(PLACES)
        imp, call = rng.choice(TARGETS)
        a = rng.choice(ALIASES)
        use = f"\n\ndef _verify_probe(b):\n    {call.format(a=a)}\n"
        binder = place(where, imp.format(a=a))
        src = read(rel) + use + binder
        keys = changed(clean[rel], scan(rel, src))
        hit = bool({"direct", "dynamic", "imports"} & set(keys))
        kinds.setdefault(where, {"runs": 0, "hits": 0})
        kinds[where]["runs"] += 1
        kinds[where]["hits"] += int(hit)
        if not hit:
            failures.append({"run": run, "file": rel, "place": where, "bind": imp.format(a=a), "call": call.format(a=a), "changed": keys})
    return kinds, failures, []


fn = options if MODE == "options" else aliases
kinds, failures, observations = fn(SEED, RUNS)
print(json.dumps({"mode": MODE, "seed": SEED, "runs": RUNS, "python": sys.version.split()[0], "kinds": kinds, "failureCount": len(failures), "failures": failures[:6], "observations": observations}, ensure_ascii=True))
