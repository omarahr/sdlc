import importlib.util
import json
import random
import re
import sys
import time

module_path, seed, runs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
spec = importlib.util.spec_from_file_location("branches_under_test", module_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

ROWS = [
    ("run", r"^run-(\d+)$", ["n"]),
    ("milestone", r"^(M-\d+)$", ["id"]),
    ("e2e", r"^(M-\d+)-e2e$", ["id"]),
    ("e2e-area", r"^(M-\d+)-e2e-(.+)$", ["id", "area"]),
    ("state", r"^state-(\d{14})$", ["ts"]),
    ("verify", r"^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$", ["id", "round", "profile", "part"]),
    ("attempt", r"^(.+)-attempt-(\d+)$", ["id", "n"]),
    ("slice", r"^(S-[A-Za-z0-9-]+)$", ["id"]),
]
INT = {"n", "round", "part"}


def model(prefix, suffix, lower, branch, ids):
    if not isinstance(branch, str):
        return None
    b = branch.lower() if lower else branch
    p = prefix.lower() if lower else prefix
    s = suffix.lower() if lower else suffix
    if not (b.startswith(p) and b.endswith(s) and len(b) >= len(p) + len(s)):
        return None
    tail = branch[len(prefix):len(branch) - len(suffix)]
    flags = re.I if lower else 0
    for kind, rx, parts in ROWS:
        m = re.search(rx, tail, flags)
        if m:
            out = {"kind": kind, "tail": tail}
            for k, v in zip(parts, m.groups()):
                out[k] = int(v) if k in INT else v
            out["known"] = None
            if ids is not None and "id" in out:
                out["known"] = False
                for c in ids:
                    if (c.lower() == out["id"].lower()) if lower else (c == out["id"]):
                        out["id"], out["known"] = c, True
                        break
            return out
    return None


rnd = random.Random(seed)
PREFIXES = ["sdlc/", "feature/PROJ-1-", "", "x/", "Team/"]
SUFFIXES = ["", "-wip", "/end", "-Z"]
DIGITS = ["0", "1", "7", "42", "007", "20261008101500", "2026100810150", "٣", "١٢", "０", "99999999999999999999"]
PROFILES = ["http-api", "cli", "a-b", "a", "x-0", "Cli", "a_b", "", "-", "p-v1-q"]
IDS = ["S-001", "S-fix-M-1-2", "s-001", "M-1", "m-1", "S-001a", "x", "S-", "M-1-e2e", "S-001-attempt-2"]
AREAS = ["api", "a-b", "", "x y", "A"]


def tail_for():
    k = rnd.randrange(12)
    d = lambda: rnd.choice(DIGITS)
    i = lambda: rnd.choice(IDS)
    t = [
        lambda: "run-" + d(),
        lambda: "M-" + d(),
        lambda: "M-" + d() + "-e2e",
        lambda: "M-" + d() + "-e2e-" + rnd.choice(AREAS),
        lambda: "state-" + d(),
        lambda: i() + "-v" + d() + "-" + rnd.choice(PROFILES) + "-" + d(),
        lambda: i() + "-attempt-" + d(),
        lambda: i(),
        lambda: "".join(rnd.choice("RUNMSe2-vattempt0123 \n") for _ in range(rnd.randrange(0, 14))),
        lambda: i() + rnd.choice(["\n", "\x00", " ", "\r\n"]),
        lambda: "".join(rnd.choice("abcSMRrun-v0123456789e2tsa\n") for _ in range(rnd.randrange(0, 30))),
        lambda: i() + "-v" + d() + "-" + rnd.choice(PROFILES) + "-" + d() + "\n",
    ][k]()
    if rnd.random() < 0.3:
        t = "".join(c.upper() if rnd.random() < 0.5 else c.lower() for c in t)
    return t


failures, outcomes = [], {}
for n in range(runs):
    prefix, suffix = rnd.choice(PREFIXES), rnd.choice(SUFFIXES)
    lower = rnd.random() < 0.5
    fmt = prefix + ("{name:lower}" if lower else "{name}") + suffix
    t = tail_for()
    pre, suf = prefix, suffix
    if rnd.random() < 0.15:
        pre = pre.swapcase()
    if rnd.random() < 0.1:
        suf = ""
    if rnd.random() < 0.05:
        pre = ""
    branch = pre + t + suf
    mode = rnd.randrange(4)
    ids = None if mode == 0 else rnd.sample(IDS, rnd.randrange(0, 5))
    if mode == 2 and ids is not None:
        ids = tuple(ids)
    if mode == 3 and ids is not None:
        ids = iter(ids)
    ref_ids = ids
    if mode == 3 and ids is not None:
        ref_ids = None
    try:
        if mode == 3 and ids is not None:
            lst = list(ids)
            ids = iter(lst)
            ref_ids = lst
        got = mod.parse(fmt, branch, ids)
    except BaseException as e:
        failures.append({"fmt": fmt, "branch": branch, "raised": f"{type(e).__name__}: {e}"})
        continue
    want = model(prefix, suffix, lower, branch, ref_ids)
    kind = None if got is None else got["kind"]
    outcomes[kind] = outcomes.get(kind, 0) + 1
    if got != want:
        failures.append({"fmt": fmt, "branch": branch, "ids": list(ref_ids) if ref_ids is not None else None, "got": got, "want": want})

hostile = []


def probe(label, fn):
    t0 = time.perf_counter()
    try:
        r = fn()
        hostile.append({"label": label, "result": r, "ms": round((time.perf_counter() - t0) * 1000, 1)})
    except BaseException as e:
        hostile.append({"label": label, "raised": f"{type(e).__name__}: {e}", "ms": round((time.perf_counter() - t0) * 1000, 1)})


D = "sdlc/{name}"
L = "sdlc/{name:lower}"
for v in [None, 5, 5.5, b"sdlc/run-2", ["sdlc/run-2"], {"a": 1}, True, object]:
    probe(f"non-string branch {v!r}", lambda v=v: mod.parse(D, v))
probe("trailing newline run", lambda: mod.parse(D, "sdlc/run-2\n"))
probe("trailing newline slice", lambda: mod.parse(D, "sdlc/S-001\n"))
probe("trailing newline verify", lambda: mod.parse(D, "sdlc/S-001-v0-cli-0\n"))
probe("trailing newline milestone", lambda: mod.parse(D, "sdlc/M-1\n"))
probe("trailing newline with suffix", lambda: mod.parse("sdlc/{name}-wip", "sdlc/S-001\n-wip"))
probe("trailing newline after suffix", lambda: mod.parse("sdlc/{name}-wip", "sdlc/S-001-wip\n"))
probe("double trailing newline", lambda: mod.parse(D, "sdlc/run-2\n\n"))
probe("NUL in tail", lambda: mod.parse(D, "sdlc/run-2\x00"))
probe("NUL inside slice", lambda: mod.parse(D, "sdlc/S-0\x001"))
probe("NUL prefix", lambda: mod.parse(D, "\x00sdlc/run-2"))
probe("arabic-indic run", lambda: mod.parse(D, "sdlc/run-٣"))
probe("fullwidth run", lambda: mod.parse(D, "sdlc/run-２"))
probe("arabic-indic verify round and part", lambda: mod.parse(D, "sdlc/S-001-v٠-cli-١"))
probe("14 non-ascii digits state", lambda: mod.parse(D, "sdlc/state-" + "٣" * 14))
probe("huge run", lambda: mod.parse(D, "sdlc/run-" + "9" * 5000))
probe("surrogate branch", lambda: mod.parse(D, "sdlc/run-\ud800"))
probe("lower kelvin sign slice", lambda: mod.parse(L, "sdlc/K-1"))
probe("lower long s slice", lambda: mod.parse(L, "sdlc/ſ-001"))
probe("lower long s in profile", lambda: mod.parse(L, "sdlc/S-001-v0-ſ-0"))
probe("lower dotted I prefix", lambda: mod.parse("İx/{name:lower}", "i̇x/run-2"))
probe("lower dotted I branch", lambda: mod.parse("ix/{name:lower}", "İx/run-2"))
probe("lower sharp s", lambda: mod.parse(L, "SDLC/ẞ-1"))
probe("lower uppercase prefix", lambda: mod.parse(L, "SDLC/RUN-2"))
probe("plain uppercase prefix", lambda: mod.parse(D, "SDLC/run-2"))
probe("ids non-string lower", lambda: mod.parse(L, "sdlc/S-001", [5, "S-001"]))
probe("ids non-string plain", lambda: mod.parse(D, "sdlc/S-001", [5, "S-001"]))
probe("ids None member lower", lambda: mod.parse(L, "sdlc/S-001", [None]))
probe("ids bare string", lambda: mod.parse(D, "sdlc/S-001", "S-001"))
probe("ids non-iterable", lambda: mod.parse(D, "sdlc/S-001", 5))
probe("ids non-iterable on run", lambda: mod.parse(D, "sdlc/run-2", 5))
probe("ids empty", lambda: mod.parse(D, "sdlc/S-001", []))
probe("ids with lone surrogate lower", lambda: mod.parse(L, "sdlc/S-001", ["\ud800", "S-001"]))
probe("prefix only", lambda: mod.parse(D, "sdlc/"))
probe("branch shorter than prefix", lambda: mod.parse(D, "sdl"))
probe("empty branch", lambda: mod.parse(D, ""))
probe("empty branch empty-affix format", lambda: mod.parse("{name}", ""))
probe("overlap prefix suffix", lambda: mod.parse("ab{name}ba", "aba"))
probe("overlap prefix suffix exact", lambda: mod.parse("ab{name}ba", "abba"))
N = 40000
probe("long verify no match (1)", lambda: mod.parse(D, "sdlc/" + "a" * N))
probe("long verify repeated -v1- (2)", lambda: mod.parse(D, "sdlc/" + "-v1-a" * (N // 5)))
probe("long verify repeated -v1- end non-digit (3)", lambda: mod.parse(D, "sdlc/" + "a-v1-a" * (N // 6) + "x"))
probe("long verify dashes (4)", lambda: mod.parse(D, "sdlc/S-001-v1-" + "a-" * (N // 2) + "x"))
probe("long verify dashes digits tail (5)", lambda: mod.parse(D, "sdlc/S-001-v1-" + "a-" * (N // 2) + "0"))
probe("long attempt (6)", lambda: mod.parse(D, "sdlc/" + "-attempt-" * (N // 9)))
probe("long area (7)", lambda: mod.parse(D, "sdlc/M-1-e2e-" + "a" * N))
probe("long slice (8)", lambda: mod.parse(D, "sdlc/S-" + "a" * N))
probe("long slice newline mismatch (9)", lambda: mod.parse(D, "sdlc/S-" + "a" * N + "!"))
probe("long run digits then letter (10)", lambda: mod.parse(D, "sdlc/run-" + "1" * N + "x"))
probe("long v-digit chain (11)", lambda: mod.parse(D, "sdlc/" + "-v1-a-1" * (N // 7)))
probe("quadratic verify (12)", lambda: mod.parse(D, "sdlc/" + "a-v1-" * (N // 5) + "!"))
probe("quadratic verify lower (13)", lambda: mod.parse(L, "sdlc/" + "A-V1-" * (N // 5) + "!"))
probe("quadratic verify profile chain (14)", lambda: mod.parse(D, "sdlc/x-v1-" + "a-1-" * (N // 4) + "!"))

json.dump({"seed": seed, "runs": runs, "failureCount": len(failures), "failures": failures[:10], "kinds": outcomes, "hostile": hostile}, sys.stdout, ensure_ascii=True, default=repr)
