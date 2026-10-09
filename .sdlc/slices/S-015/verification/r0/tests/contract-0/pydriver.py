import contextlib
import importlib.util
import io
import json
import re
import urllib.parse

_mod = None


def _load(path):
    global _mod
    if _mod is None:
        spec = importlib.util.spec_from_file_location("branches_under_test", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _mod = mod
    return _mod


def preflight(path, argv, gh=None):
    mod = _load(path)
    calls = []
    original = mod._run_forge_cli
    if gh is not None:
        def fake(cmd, repo):
            calls.append(list(cmd))
            sample = urllib.parse.unquote(cmd[2].split("/rules/branches/", 1)[1])
            sample = re.sub(r"state-\d{14}", "state-20260101000000", sample)
            entry = gh.get(sample)
            if entry is None:
                return [], None
            if isinstance(entry, dict) and "error" in entry:
                return None, entry["error"]
            return entry, None
        mod._run_forge_cli = fake
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            status = mod.main(argv)
    finally:
        mod._run_forge_cli = original
    return {"status": status, "stdout": out.getvalue(), "calls": calls}


def samples(path, fmt, mode, current):
    return _load(path).build_samples(fmt, mode, current)


def duplicate_probe(path, repo, gh):
    mod = _load(path)
    original_build = mod.build_samples
    original_run = mod._run_forge_cli
    calls = []

    def fake(cmd, r):
        calls.append(list(cmd))
        sample = urllib.parse.unquote(cmd[2].split("/rules/branches/", 1)[1])
        return gh.get(sample, []), None

    mod.build_samples = lambda fmt, mode, current: [
        {"kind": "slice", "name": "sdlc/S-001"},
        {"kind": "working", "name": "sdlc/S-001"},
    ]
    mod._run_forge_cli = fake
    try:
        result = mod.verdict(repo, "sdlc/{name}", "mr", "sdlc/S-001")
    finally:
        mod.build_samples = original_build
        mod._run_forge_cli = original_run
    return {"result": result, "calls": calls}


def surface(path):
    import inspect
    mod = _load(path)
    names = ["verdict", "build_samples", "cmd_preflight", "_sample_row", "main"]
    out = {n: str(inspect.signature(getattr(mod, n))) for n in names}
    out["SAMPLE_KINDS"] = {k: [[a, b] for a, b in v] for k, v in mod.SAMPLE_KINDS.items()}
    return out
