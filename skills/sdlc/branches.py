#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

DEFAULT_FORMAT = "sdlc/{name}"
KINDS = ("run", "slice", "milestone", "e2e", "e2e-area", "state", "verify", "attempt")
PLACEHOLDERS = ("{name}", "{name:lower}")
GIT_MODES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-modes.json")


class Fail(Exception):
    pass


def _config_format(repo):
    path = os.path.join(repo, ".sdlc", "config.json")
    try:
        with open(path, encoding="utf-8") as f:
            config = json.load(f)
    except FileNotFoundError:
        return None
    except (ValueError, RecursionError) as e:
        raise Fail(f"{path} is not valid JSON: {type(e).__name__}: {e}")
    except OSError as e:
        raise Fail(f"cannot read {path}: {e}")
    value = config.get("branchFormat") if isinstance(config, dict) else None
    if isinstance(value, str) and value:
        return value
    return None


def load_format(repo):
    return _config_format(repo) or DEFAULT_FORMAT


def validate_format(fmt):
    prefix, suffix, _ = split(fmt)
    rest = prefix + suffix
    if "{" in rest or "}" in rest:
        raise Fail(f"the branch format {fmt!r} holds a brace outside its placeholder")
    if re.search(r"\s", fmt):
        raise Fail(f"the branch format {fmt!r} holds whitespace")
    candidate = name(fmt, "slice", id="S-001")
    try:
        result = subprocess.run(
            ["git", "check-ref-format", "--branch", candidate],
            capture_output=True,
            text=True,
            errors="replace",
        )
    except (OSError, ValueError) as e:
        raise Fail(f"cannot check the branch format {fmt!r} with git check-ref-format: {e}")
    if result.returncode != 0:
        reason = result.stderr.strip() or f"exit {result.returncode}"
        raise Fail(f"the branch format {fmt!r} gives {candidate!r}, which git check-ref-format refuses: {reason}")
    return fmt


def _state_tail(parts):
    ts = parts.get("ts")
    if ts is None or ts == "":
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"state-{ts}"


TAILS = {
    "slice": (("id",), lambda p: p["id"]),
    "state": ((), _state_tail),
    "e2e-area": (("id", "area"), lambda p: f"{p['id']}-e2e-{p['area']}"),
}


def tail(kind, **parts):
    row = TAILS.get(kind)
    if row is None:
        raise Fail(f"no branch name is defined for kind {kind!r}")
    required, build = row
    for part in required:
        value = parts.get(part)
        if value is None or value == "":
            raise Fail(f"a {kind} branch name needs a non-empty {part}")
    return str(build(parts))


def split(fmt):
    if not isinstance(fmt, str):
        raise Fail("the branch format must be a string")
    count = sum(fmt.count(p) for p in PLACEHOLDERS)
    if count != 1:
        raise Fail(f"the branch format {fmt!r} must hold exactly one {{name}} or {{name:lower}}, found {count}")
    placeholder = next(p for p in PLACEHOLDERS if p in fmt)
    prefix, suffix = fmt.split(placeholder, 1)
    return prefix, suffix, placeholder == "{name:lower}"


def name(fmt, kind, **parts):
    prefix, suffix, lower = split(fmt)
    middle = tail(kind, **parts)
    if lower:
        middle = middle.lower()
    return prefix + middle + suffix


def load_git_modes(path=GIT_MODES_PATH):
    try:
        with open(path, encoding="utf-8") as f:
            modes = json.load(f)["gitModes"]
    except FileNotFoundError:
        raise Fail(f"{path} is missing: restore it from git")
    except (ValueError, KeyError, TypeError, RecursionError) as e:
        raise Fail(f'{path} must hold {{"gitModes": [...]}}: {e}')
    except OSError as e:
        raise Fail(f"cannot read {path}: {e}")
    if not isinstance(modes, list) or not modes or not all(isinstance(m, str) and m for m in modes):
        raise Fail(f'{path} must hold {{"gitModes": ["<mode>", ...]}} naming at least one mode')
    return modes


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise Fail(message)


def _repo(ns):
    if not os.path.isdir(ns.repo):
        raise Fail(f"--repo {ns.repo!r} is not a directory")
    return ns.repo


def _format(ns, repo):
    fmt = ns.format if ns.format is not None else load_format(repo)
    return validate_format(fmt)


def _kind(ns):
    if ns.kind not in KINDS:
        raise Fail(f"--kind {ns.kind!r} is not one of {', '.join(KINDS)}")


def _echo(command, fmt, ns):
    return {
        "ok": True,
        "command": command,
        "format": fmt,
        "args": {k: v for k, v in vars(ns).items() if k not in ("command", "format")},
    }


NAME_PARTS = ("id", "n", "area", "round", "profile", "part")


def cmd_name(ns):
    repo = _repo(ns)
    fmt = _format(ns, repo)
    _kind(ns)
    parts = {k: getattr(ns, k) for k in NAME_PARTS if getattr(ns, k) is not None}
    return {
        "ok": True,
        "command": "name",
        "format": fmt,
        "kind": ns.kind,
        "branch": name(fmt, ns.kind, **parts),
    }


def cmd_parse(ns):
    repo = _repo(ns)
    return _echo("parse", _format(ns, repo), ns)


def cmd_list(ns):
    repo = _repo(ns)
    _kind(ns)
    return _echo("list", _format(ns, repo), ns)


def cmd_preflight(ns):
    repo = _repo(ns)
    modes = load_git_modes()
    if ns.mode not in modes:
        raise Fail(f"--mode {ns.mode!r} is not one of {', '.join(modes)}")
    result = _echo("preflight", _format(ns, repo), ns)
    result["given"] = ns.format is not None or _config_format(repo) is not None
    return result


def build_parser():
    parser = JsonArgumentParser(prog="branches.py")
    sub = parser.add_subparsers(dest="command", parser_class=JsonArgumentParser)
    sub.required = True

    p = sub.add_parser("name")
    p.add_argument("--repo", required=True)
    p.add_argument("--kind", required=True)
    p.add_argument("--id")
    p.add_argument("--n", type=int)
    p.add_argument("--area")
    p.add_argument("--round", type=int)
    p.add_argument("--profile")
    p.add_argument("--part", type=int)
    p.add_argument("--format")
    p.set_defaults(handler=cmd_name)

    p = sub.add_parser("parse")
    p.add_argument("--repo", required=True)
    p.add_argument("--branch", required=True)
    p.add_argument("--format")
    p.set_defaults(handler=cmd_parse)

    p = sub.add_parser("list")
    p.add_argument("--repo", required=True)
    p.add_argument("--kind", required=True)
    p.add_argument("--format")
    p.set_defaults(handler=cmd_list)

    p = sub.add_parser("preflight")
    p.add_argument("--repo", required=True)
    p.add_argument("--mode", required=True)
    p.add_argument("--format")
    p.add_argument("--branch")
    p.set_defaults(handler=cmd_preflight)

    return parser


def main(argv=None):
    try:
        ns = build_parser().parse_args(argv)
        handler = ns.handler
        del ns.handler
        result = handler(ns)
    except Fail as e:
        print(json.dumps({"ok": False, "error": str(e) or "bad input"}))
        return 2
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
