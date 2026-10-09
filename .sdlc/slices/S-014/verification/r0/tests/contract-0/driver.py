import importlib.util, json, os, sys

spec_in = json.load(sys.stdin)
spec = importlib.util.spec_from_file_location("branches", spec_in["module"])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
if "timeout" in spec_in:
    mod.FORGE_TIMEOUT = spec_in["timeout"]
out = []
for case in spec_in["cases"]:
    for name in ("stdout", "stderr", "exit"):
        p = os.path.join(spec_in["caseDir"], name)
        if name in case:
            with open(p, "wb") as f:
                f.write(case[name].encode("utf-8", "surrogatepass") if isinstance(case[name], str) else str(case[name]).encode())
        elif os.path.exists(p):
            os.remove(p)
    open(spec_in["callLog"], "w").close()
    try:
        res = mod.read_rules(case["repo"], case["samples"])
        err = None
    except BaseException as e:
        res = None
        err = type(e).__name__ + ": " + str(e)
    with open(spec_in["callLog"], "rb") as f:
        calls = [c for c in f.read().split(b"\n") if c]
    out.append({"result": res, "error": err, "calls": [c.decode("utf-8", "replace") for c in calls]})
json.dump(out, sys.stdout)
