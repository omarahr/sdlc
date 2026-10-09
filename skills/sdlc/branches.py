#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.parse
from datetime import datetime, timezone

DEFAULT_FORMAT = "sdlc/{name}"
KINDS = ("run", "slice", "milestone", "e2e", "e2e-area", "state", "verify", "attempt")
PLACEHOLDERS = ("{name}", "{name:lower}")
GIT_MODES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-modes.json")


class Fail(Exception):
    pass


def _config_value(repo, key):
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
    value = config.get(key) if isinstance(config, dict) else None
    if isinstance(value, str) and value:
        return value
    return None


def _config_format(repo):
    return _config_value(repo, "branchFormat")


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
        reason = ref_format_error(candidate)
    except Fail as e:
        raise Fail(f"cannot check the branch format {fmt!r} with git check-ref-format: {e}")
    if reason is not None:
        raise Fail(f"the branch format {fmt!r} gives {candidate!r}, which git check-ref-format refuses: {reason}")
    return fmt


def ref_format_error(ref):
    try:
        result = subprocess.run(
            ["git", "check-ref-format", "--branch", ref],
            capture_output=True,
            text=True,
            errors="replace",
        )
    except (OSError, ValueError) as e:
        raise Fail(str(e))
    if result.returncode == 0:
        return None
    return result.stderr.strip() or f"exit {result.returncode}"


def regex_error(pattern):
    try:
        re.compile(pattern)
    except (re.error, OverflowError) as e:
        return str(e)
    except RecursionError:
        return "the pattern is nested too deeply"
    return None


RULE_KEYS = ("source", "kind", "pattern", "negate", "label")
FORGE_TIMEOUT = 60


def make_rule(source, kind, pattern, negate, label):
    return dict(zip(RULE_KEYS, (source, kind, pattern, bool(negate), label)))


def github_rule(obj):
    if not isinstance(obj, dict) or obj.get("type") != "branch_name_pattern":
        return None
    params = obj.get("parameters")
    if not isinstance(params, dict):
        params = {}
    label = params.get("name")
    if not label:
        ruleset = obj.get("ruleset_id")
        label = f"ruleset {ruleset}" if ruleset is not None else "branch_name_pattern"
    return make_rule("github", params.get("operator"), params.get("pattern"), params.get("negate"), label)


def gitlab_rule(body):
    if not isinstance(body, dict):
        return None
    regex = body.get("branch_name_regex")
    if not isinstance(regex, str) or not regex:
        return None
    return make_rule("gitlab", "regex", regex, False, "push rule")


def _run_forge_cli(argv, repo):
    tool = argv[0]
    env = dict(os.environ, GH_PROMPT_DISABLED="1")
    try:
        proc = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            errors="replace",
            cwd=repo,
            stdin=subprocess.DEVNULL,
            timeout=FORGE_TIMEOUT,
            env=env,
        )
    except (OSError, ValueError, subprocess.TimeoutExpired) as e:
        return None, str(e).strip() or type(e).__name__
    if proc.returncode != 0:
        return None, proc.stderr.strip() or f"{tool} exited with status {proc.returncode}"
    try:
        return json.loads(proc.stdout), None
    except (ValueError, RecursionError):
        return None, f"{tool} printed output that is not JSON"


def _gh_branch_rules(repo, sample):
    path = "repos/{owner}/{repo}/rules/branches/" + urllib.parse.quote(sample, safe="")
    data, error = _run_forge_cli(["gh", "api", path], repo)
    if error is not None:
        return None, error
    if not isinstance(data, list):
        return None, "gh printed JSON that is not a list"
    return [rule for rule in map(github_rule, data) if rule is not None], None


def _glab_push_rule(repo):
    body, error = _run_forge_cli(["glab", "api", "projects/:fullpath/push_rule"], repo)
    if error is not None:
        return None, error
    rule = gitlab_rule(body)
    return ([rule] if rule else []), None


def _collect_rules(repo, forge, samples):
    if forge == "github":
        collected = []
        for sample in samples:
            outcome = _gh_branch_rules(repo, sample)
            collected.append((sample, outcome))
            if outcome[1] is not None:
                break
        return collected
    rules, error = _glab_push_rule(repo)
    if error is not None:
        return [(None, (None, error))]
    return [(sample, (rules, None)) for sample in samples] or [(None, (rules, None))]


def read_rules(repo, samples):
    try:
        forge = _config_value(repo, "forge") or ""
    except Fail:
        forge = ""
    result = {"forge": forge, "rules": [], "by_sample": {}, "notes": [], "unchecked": True}
    if forge not in ("github", "gitlab"):
        return result
    collected = _collect_rules(repo, forge, samples)
    for _, (_, error) in collected:
        if error is not None:
            result["notes"] = [f"rules unknown on {forge}: {error}"]
            return result
    for sample, (rules, _) in collected:
        if sample is not None:
            result["by_sample"][sample] = rules
        for rule in rules:
            if rule not in result["rules"]:
                result["rules"].append(rule)
    result["unchecked"] = False
    return result


def _raw_result(kind, pattern, sample):
    if kind == "starts_with":
        return sample.startswith(pattern)
    if kind == "ends_with":
        return sample.endswith(pattern)
    if kind == "contains":
        return pattern in sample
    if kind == "regex":
        try:
            compiled = re.compile(pattern)
        except (re.error, OverflowError, RecursionError):
            return None
        return compiled.search(sample) is not None
    return None


def evaluate(rule, sample):
    result = _raw_result(rule.get("kind"), rule.get("pattern"), sample)
    if result is None:
        return None
    if rule.get("negate"):
        return not result
    return result


def judge(rules, sample):
    failed = None
    has_failed = False
    notes = []
    for rule in rules:
        label = rule.get("label")
        outcome = evaluate(rule, sample)
        if outcome is False:
            if not has_failed:
                has_failed = True
                failed = label
        elif outcome is None:
            kind = rule.get("kind")
            if kind == "regex":
                reason = regex_error(rule.get("pattern"))
            else:
                reason = f"unknown kind {kind}"
            notes.append(f"cannot evaluate {label}: {reason}")
    if not has_failed and ref_format_error(sample) is not None:
        has_failed = True
        failed = "git check-ref-format"
    if has_failed:
        return {"result": "fail", "rule": failed, "notes": notes}
    if notes:
        return {"result": "unevaluated", "rule": None, "notes": notes}
    return {"result": "pass", "rule": None, "notes": notes}


def _state_tail(parts):
    ts = parts.get("ts")
    if ts is None or ts == "":
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"state-{ts}"


TAILS = {
    "run": (("n",), lambda p: f"run-{p['n']}"),
    "slice": (("id",), lambda p: p["id"]),
    "milestone": (("id",), lambda p: p["id"]),
    "e2e": (("id",), lambda p: f"{p['id']}-e2e"),
    "state": ((), _state_tail),
    "e2e-area": (("id", "area"), lambda p: f"{p['id']}-e2e-{p['area']}"),
    "verify": (
        ("id", "round", "profile", "part"),
        lambda p: f"{p['id']}-v{p['round']}-{p['profile']}-{p['part']}",
    ),
    "attempt": (("id", "n"), lambda p: f"{p['id']}-attempt-{p['n']}"),
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


PARSE_ROWS = (
    ("run", r"^run-(\d+)$", ("n",)),
    ("milestone", r"^(M-\d+)$", ("id",)),
    ("e2e", r"^(M-\d+)-e2e$", ("id",)),
    ("e2e-area", r"^(M-\d+)-e2e-(.+)$", ("id", "area")),
    ("state", r"^state-(\d{14})$", ("ts",)),
    ("verify", r"^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$", ("id", "round", "profile", "part")),
    ("attempt", r"^(.+)-attempt-(\d+)$", ("id", "n")),
    ("slice", r"^(S-[A-Za-z0-9-]+)$", ("id",)),
)
INTEGER_PARTS = ("n", "round", "part")

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)


def parse(fmt, branch, ids=None):
    prefix, suffix, lower = split(fmt)
    if not isinstance(branch, str):
        return None
    if len(branch) < len(prefix) + len(suffix):
        return None
    head = branch[:len(prefix)]
    foot = branch[len(branch) - len(suffix):] if suffix else ""
    if lower:
        head, foot, prefix, suffix = head.lower(), foot.lower(), prefix.lower(), suffix.lower()
    if head != prefix or foot != suffix:
        return None
    middle = branch[len(prefix):len(branch) - len(suffix)]
    flags = re.IGNORECASE if lower else 0
    for kind, pattern, names in PARSE_ROWS:
        match = re.search(pattern, middle, flags)
        if match is None:
            continue
        result = {"kind": kind, "tail": middle}
        for part, value in zip(names, match.groups()):
            result[part] = int(value) if part in INTEGER_PARTS else value
        result["known"] = None
        if ids is not None and "id" in result:
            wanted = result["id"].lower() if lower else result["id"]
            result["known"] = False
            for candidate in ids:
                if (candidate.lower() if lower else candidate) == wanted:
                    result["id"] = candidate
                    result["known"] = True
                    break
        return result
    return None


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
    fmt = _format(ns, repo)
    parsed = parse(fmt, ns.branch)
    result = {"ok": True, "command": "parse", "format": fmt, "branch": ns.branch}
    if parsed is None:
        result["kind"] = None
        return result
    result.update(parsed)
    return result


NUMERIC_SORT_KINDS = ("run", "attempt")


def _git(repo, *args):
    try:
        return subprocess.run(
            ["git", "-C", repo, *args],
            capture_output=True,
            text=True,
            errors="replace",
            check=False,
        )
    except (OSError, ValueError):
        raise Fail(f"not a git repository: {repo}")


def list_kind(repo, fmt, kind):
    if _git(repo, "rev-parse", "--git-dir").returncode != 0:
        raise Fail(f"not a git repository: {repo}")
    refs = _git(repo, "for-each-ref", "--format=%(refname)", "refs/heads/")
    if refs.returncode != 0:
        raise Fail(f"cannot list the branches of {repo}")
    entries = []
    for ref in refs.stdout.splitlines():
        branch = ref[len("refs/heads/"):]
        parsed = parse(fmt, branch)
        if parsed is not None and parsed["kind"] == kind:
            entries.append({"branch": branch, **parsed})
    if kind in NUMERIC_SORT_KINDS:
        entries.sort(key=lambda e: (e["n"], e["branch"]))
    else:
        entries.sort(key=lambda e: e["branch"])
    return entries


def cmd_list(ns):
    repo = _repo(ns)
    _kind(ns)
    fmt = _format(ns, repo)
    return {
        "ok": True,
        "command": "list",
        "format": fmt,
        "kind": ns.kind,
        "branches": list_kind(repo, fmt, ns.kind),
    }


SAMPLE_KINDS = {
    "pr": (("slice", {"id": "S-001"}), ("state", {}), ("e2e", {"id": "M-1"})),
    "stack": (("run", {"n": 1}), ("milestone", {"id": "M-1"}), ("slice", {"id": "S-001"})),
    "mr": (),
    "direct": (),
}


def build_samples(fmt, mode, current):
    samples = [
        {"kind": kind, "name": name(fmt, kind, **parts)}
        for kind, parts in SAMPLE_KINDS.get(mode, ())
    ]
    if mode == "mr" and current:
        samples.append({"kind": "working", "name": current})
    return samples


def _sample_row(sample, rules, notes):
    if rules is None:
        outcome = judge([], sample["name"])
        if outcome["result"] != "fail":
            outcome = {"result": "unchecked", "rule": None, "notes": []}
    else:
        outcome = judge(rules, sample["name"])
    notes.extend(outcome["notes"])
    return {
        "kind": sample["kind"],
        "name": sample["name"],
        "result": outcome["result"],
        "rule": outcome["rule"],
    }


def verdict(repo, fmt, mode, current):
    samples = build_samples(fmt, mode, current)
    names = list(dict.fromkeys(s["name"] for s in samples))
    read = read_rules(repo, names)
    notes = list(read["notes"])
    rows = []
    for sample in samples:
        rules = None if read["unchecked"] else read["by_sample"].get(sample["name"])
        if rules is not None and not rules:
            rules = []
        rows.append(_sample_row(sample, rules, notes))
    return {
        "ok": all(row["result"] != "fail" for row in rows),
        "forge": read["forge"],
        "rules": read["rules"],
        "samples": rows,
        "notes": list(dict.fromkeys(notes)),
    }


DERIVE_FORMATS = {
    "starts_with": lambda pattern: f"{pattern}sdlc/{{name}}",
    "ends_with": lambda pattern: f"sdlc/{{name}}{pattern}",
    "contains": lambda pattern: f"sdlc/{pattern}/{{name}}",
}


def derive(rules):
    if len(rules) != 1:
        return None
    rule = rules[0]
    build = DERIVE_FORMATS.get(rule.get("kind"))
    pattern = rule.get("pattern")
    if build is None or rule.get("negate") or not isinstance(pattern, str) or not pattern:
        return None
    return build(pattern)


try:
    from re import _parser as _sre_parse
except ImportError:
    import sre_parse as _sre_parse

CATEGORY_CHARS = {
    "CATEGORY_DIGIT": "0",
    "CATEGORY_WORD": "a",
    "CATEGORY_SPACE": " ",
}


def _class_char(items):
    if not items:
        return None
    op, value = items[0]
    kind = str(op)
    if kind == "LITERAL":
        return chr(value)
    if kind == "RANGE":
        return chr(value[0])
    if kind == "CATEGORY":
        return CATEGORY_CHARS.get(str(value))
    return None


def _shortest(nodes):
    out = []
    for op, value in nodes:
        kind = str(op)
        if kind == "LITERAL":
            out.append(chr(value))
        elif kind == "ANY":
            out.append("a")
        elif kind == "AT":
            continue
        elif kind == "IN":
            char = _class_char(value)
            if char is None:
                return None
            out.append(char)
        elif kind == "BRANCH":
            inner = _shortest(value[1][0])
            if inner is None:
                return None
            out.append(inner)
        elif kind == "SUBPATTERN":
            inner = _shortest(value[-1])
            if inner is None:
                return None
            out.append(inner)
        elif kind in ("MAX_REPEAT", "MIN_REPEAT"):
            inner = _shortest(value[2])
            if inner is None:
                return None
            out.append(inner * value[0])
        else:
            return None
    return "".join(out)


def _regex_literal(rule):
    try:
        built = _shortest(_sre_parse.parse(rule["pattern"]))
        if not built:
            return None
        cuts = [i for i, char in enumerate(built) if char == "/"] or [len(built)]
        for cut in cuts:
            candidate = built[:cut]
            if not candidate or evaluate(rule, candidate + "/S-001") is not True:
                continue
            try:
                validate_format(candidate + "/{name}")
            except Fail:
                continue
            return candidate
    except Exception:
        return None
    return None


def _format_line(rules, derived):
    if derived is not None:
        return f'--branch-format "{derived}"'
    labels = [rule.get("label") for rule in rules]
    if len(rules) == 1 and rules[0].get("kind") == "regex" and not rules[0].get("negate"):
        rule = rules[0]
        literal = _regex_literal(rule)
        where = f'rule "{rule.get("label")}": regex "{rule.get("pattern")}"'
        if literal is not None:
            return f'--branch-format "{literal}/{{name}}" ({where})'
        return (
            f'--branch-format "<literal>/{{name}}" ({where}; '
            "choose a literal that the pattern accepts before S-001)"
        )
    must = "; ".join(str(label) for label in labels) or "git check-ref-format"
    return f'--branch-format "<prefix>{{name}}<suffix>" (every branch name must pass: {must})'


def suggest(rules, rows, derived):
    lines = []
    failed = [row for row in rows if row.get("result") == "fail"]
    if any(row.get("kind") != "working" for row in failed):
        lines.append(_format_line(rules, derived))
    for row in failed:
        if row.get("kind") == "working":
            branch = row.get("name")
            lines.append(
                f'rename the branch "{branch}" (rule "{row.get("rule")}"), '
                f"for example: git branch -m {branch} <new-name>"
            )
            break
    return "\n".join(lines)


def cmd_preflight(ns):
    repo = _repo(ns)
    modes = load_git_modes()
    if ns.mode not in modes:
        raise Fail(f"--mode {ns.mode!r} is not one of {', '.join(modes)}")
    fmt = _format(ns, repo)
    result = _echo("preflight", fmt, ns)
    given = ns.format is not None or _config_format(repo) is not None
    result["given"] = given
    result["derived"] = False
    result["suggestion"] = ""
    first = verdict(repo, fmt, ns.mode, ns.branch)
    result.update(first)
    if first["ok"]:
        return result
    derived = derive(first["rules"])
    loop_failed = any(
        row["result"] == "fail" and row["kind"] != "working" for row in first["samples"]
    )
    if derived is not None and not given and loop_failed:
        try:
            second = verdict(repo, derived, ns.mode, ns.branch)
        except Fail:
            second = None
        if second is not None and second["ok"]:
            result["format"] = derived
            result["derived"] = True
            result.update(second)
            return result
    result["suggestion"] = suggest(first["rules"], first["samples"], derived)
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
    if ns.command == "preflight" and not result.get("ok"):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
