#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys

DEFAULT_FORMAT = "sdlc/{name}"
KINDS = ("run", "slice", "milestone", "e2e", "e2e-area", "state", "verify", "attempt")
PLACEHOLDERS = ("{name}", "{name:lower}")
GIT_MODES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-modes.json")


class Fail(Exception):
    pass


def load_format(repo):
    path = os.path.join(repo, ".sdlc", "config.json")
    try:
        with open(path, encoding="utf-8") as f:
            config = json.load(f)
    except FileNotFoundError:
        return DEFAULT_FORMAT
    except ValueError as e:
        raise Fail(f"{path} is not valid JSON: {e}")
    except OSError as e:
        raise Fail(f"cannot read {path}: {e}")
    value = config.get("branchFormat") if isinstance(config, dict) else None
    if isinstance(value, str) and value:
        return value
    return DEFAULT_FORMAT


def validate_format(fmt):
    if not isinstance(fmt, str):
        raise Fail("the branch format must be a string")
    count = sum(fmt.count(p) for p in PLACEHOLDERS)
    if count != 1:
        raise Fail(f"the branch format {fmt!r} must hold exactly one {{name}} or {{name:lower}}, found {count}")
    placeholder = next(p for p in PLACEHOLDERS if p in fmt)
    rest = fmt.replace(placeholder, "", 1)
    if "{" in rest or "}" in rest:
        raise Fail(f"the branch format {fmt!r} holds a brace outside its placeholder")
    if re.search(r"\s", fmt):
        raise Fail(f"the branch format {fmt!r} holds whitespace")
    return fmt


def load_git_modes(path=GIT_MODES_PATH):
    try:
        with open(path, encoding="utf-8") as f:
            modes = json.load(f)["gitModes"]
    except FileNotFoundError:
        raise Fail(f"{path} is missing: restore it from git")
    except (ValueError, KeyError, TypeError) as e:
        raise Fail(f'{path} must hold {{"gitModes": [...]}}: {e}')
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


def cmd_name(ns):
    repo = _repo(ns)
    _kind(ns)
    return _echo("name", _format(ns, repo), ns)


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
    return _echo("preflight", _format(ns, repo), ns)


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
