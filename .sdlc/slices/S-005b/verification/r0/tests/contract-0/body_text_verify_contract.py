import ast
import importlib.util
import json
import random
import sys

GUARD = sys.argv[1]
ROOT = sys.argv[2]
SEED = int(sys.argv[3])
RUNS = int(sys.argv[4])

spec = importlib.util.spec_from_file_location("push_guard", GUARD)
pg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pg)

TARGETS = [
    ("skills/sdlc/state-write.py", "git"),
    ("skills/sdlc/suite-receipt.py", "git"),
    ("skills/sdlc/next-action.py", "run"),
    ("skills/sdlc/impact.py", "run"),
    ("skills/sdlc/impact.py", "git_lines"),
]


def find(src, name):
    tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    raise LookupError(name)


def text_of(src, name):
    return pg.body_text(src.splitlines(keepends=True), find(src, name))


def neutral_edit(rng, lines, start, end):
    kind = rng.choice(["comment", "blank", "trailing", "crlf", "continuation"])
    i = rng.randint(start + 1, end)
    if kind == "comment":
        indent = lines[i - 1][: len(lines[i - 1]) - len(lines[i - 1].lstrip())] or "    "
        lines.insert(i, indent + "# note " + str(rng.randint(0, 999)) + "\n")
        return kind, 1
    if kind == "blank":
        lines.insert(i, "\n")
        return kind, 1
    if kind == "trailing":
        j = rng.randint(start, end - 1)
        ending = "\r\n" if lines[j].endswith("\r\n") else "\n"
        stripped = lines[j].rstrip("\r\n")
        if "#" in stripped or stripped.rstrip().endswith("\\"):
            lines.insert(i, "\n")
            return "blank", 1
        lines[j] = stripped + "  # tail" + ending
        return kind, 0
    if kind == "crlf":
        for j in range(start, end):
            if not lines[j].endswith("\r\n"):
                lines[j] = lines[j][:-1] + "\r\n"
        return kind, 0
    j = rng.randint(start, end - 1)
    stripped = lines[j].rstrip("\n")
    if stripped.rstrip().endswith(":") or "#" in stripped or not stripped.strip():
        lines.insert(i, "\n")
        return "blank", 1
    return "blank-fallback", 0


def code_edit(rng, lines, start, end):
    i = end - 1
    indent = lines[i][: len(lines[i]) - len(lines[i].lstrip())] or "    "
    lines.insert(i, indent + "marker_" + str(rng.randint(0, 999)) + " = 0\n")


def main():
    rng = random.Random(SEED)
    sources = {}
    for rel, _ in TARGETS:
        with open(f"{ROOT}/{rel}", encoding="utf-8") as f:
            sources[rel] = f.read()
    clean = {(rel, name): text_of(sources[rel], name) for rel, name in TARGETS}
    failures = []
    kinds = {}
    for run in range(RUNS):
        rel, name = rng.choice(TARGETS)
        lines = sources[rel].splitlines(keepends=True)
        node = find(sources[rel], name)
        start, end = node.lineno - 1, node.end_lineno
        edits = rng.randint(1, 4)
        applied = []
        for _ in range(edits):
            kind, grow = neutral_edit(rng, lines, start, end)
            end += grow
            applied.append(kind)
            kinds[kind] = kinds.get(kind, 0) + 1
        mutated = "".join(lines)
        try:
            got = text_of(mutated, name)
        except SyntaxError as e:
            failures.append({"run": run, "target": f"{rel} {name}", "edits": applied, "error": str(e)})
            continue
        if got != clean[(rel, name)]:
            failures.append({"run": run, "target": f"{rel} {name}", "edits": applied, "got": got})
            continue
        code_lines = mutated.splitlines(keepends=True)
        cnode = find(mutated, name)
        code_edit(rng, code_lines, cnode.lineno - 1, cnode.end_lineno)
        changed = text_of("".join(code_lines), name)
        if changed == clean[(rel, name)]:
            failures.append({"run": run, "target": f"{rel} {name}", "edits": applied + ["code"], "got": "unchanged after code edit"})
    print(json.dumps({"seed": SEED, "runs": RUNS, "kinds": kinds, "failures": failures[:5], "failureCount": len(failures), "python": sys.version.split()[0]}))


main()
