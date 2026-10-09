import contextlib, copy, importlib.util, io, json, subprocess, sys

path, cases_path = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("target", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def ref_tail(kind, p):
    return {
        "run": lambda: f"run-{p['n']}", "slice": lambda: p["id"], "milestone": lambda: p["id"],
        "e2e": lambda: f"{p['id']}-e2e", "e2e-area": lambda: f"{p['id']}-e2e-{p['area']}",
        "state": lambda: f"state-{p['ts']}",
        "verify": lambda: f"{p['id']}-v{p['round']}-{p['profile']}-{p['part']}",
        "attempt": lambda: f"{p['id']}-attempt-{p['n']}",
    }[kind]()

def ref_name(fmt, kind, p):
    ph = "{name:lower}" if "{name:lower}" in fmt else "{name}"
    pre, suf = fmt.split(ph)
    t = ref_tail(kind, p)
    return pre + (t.lower() if ph == "{name:lower}" else t) + suf

cases = json.load(open(cases_path))
bad = []
refcheck = 0
for i, c in enumerate(cases):
    fmt, kind, parts = c["fmt"], c["kind"], c["parts"]
    before = copy.deepcopy(parts)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        a = mod.name(fmt, kind, **parts)
        b = mod.name(fmt, kind, **parts)
        pre, suf, lower = mod.split(fmt)
    want = ref_name(fmt, kind, parts)
    problems = []
    if a != want: problems.append(f"name {a!r} != ref {want!r}")
    if a != b: problems.append("not deterministic")
    if parts != before: problems.append("parts mutated")
    if out.getvalue(): problems.append("printed to stdout")
    if not a.startswith(pre) or not a.endswith(suf): problems.append("affixes")
    if lower != ("{name:lower}" in fmt): problems.append("lower flag")
    mid = a[len(pre):len(a) - len(suf)] if suf else a[len(pre):]
    t = mod.tail(kind, **parts)
    if mid != (t.lower() if lower else t): problems.append("middle != tail")
    if t != ref_tail(kind, parts): problems.append(f"tail {t!r}")
    if c.get("lowerPrefixCheck"):
        if lower and (pre != fmt.split("{name:lower}")[0] or suf != fmt.split("{name:lower}")[1]): problems.append("affix altered")
    if problems: bad.append({"i": i, "case": c, "problems": problems})
    refcheck += 1

git_bad = []
for c in cases[: int(sys.argv[3]) if len(sys.argv) > 3 else 0]:
    br = mod.name(c["fmt"], c["kind"], **c["parts"])
    r = subprocess.run(["git", "check-ref-format", "--branch", br], capture_output=True, text=True)
    ok_unsafe = any(ch in br for ch in " ~^:?*[\\") or ".." in br or br.endswith(("/", ".lock", ".")) or br.startswith("-")
    if (r.returncode == 0) == ok_unsafe and False:
        git_bad.append(br)
print(json.dumps({"checked": refcheck, "bad": bad[:10], "badCount": len(bad)}))
