import importlib.util
import json
import os
import sys


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def write_steps(state, steps):
    for entry in os.listdir(state):
        full = os.path.join(state, entry)
        if os.path.isdir(full):
            for f in os.listdir(full):
                os.remove(os.path.join(full, f))
            os.rmdir(full)
        else:
            os.remove(full)
    for i, step in enumerate(steps, 1):
        d = os.path.join(state, str(i))
        os.makedirs(d)
        with open(os.path.join(d, "stdout"), "w", encoding="utf-8", errors="surrogatepass", newline="") as f:
            f.write(step.get("stdout", ""))
        with open(os.path.join(d, "stderr"), "w", encoding="utf-8", errors="surrogatepass", newline="") as f:
            f.write(step.get("stderr", ""))
        with open(os.path.join(d, "exit"), "w") as f:
            f.write(str(step.get("exit", 0)))
    last = os.path.join(state, "last")
    os.makedirs(last)
    final = steps[-1] if steps else {}
    for name, value in (("stdout", final.get("stdout", "")), ("stderr", final.get("stderr", "")), ("exit", str(final.get("exit", 0)))):
        with open(os.path.join(last, name), "w", encoding="utf-8", errors="surrogatepass", newline="") as f:
            f.write(value)


def main():
    request = json.load(sys.stdin)
    mods = {name: load(path, "m_" + name) for name, path in request["modules"].items()}
    state = request["state"]
    out = []
    for scenario in request["scenarios"]:
        row = {}
        for name, mod in mods.items():
            write_steps(state, scenario["steps"])
            try:
                row[name] = {"ok": mod.read_rules(request["repo"], scenario["samples"])}
            except BaseException as e:
                row[name] = {"raised": type(e).__name__ + ": " + str(e)[:300]}
        out.append(row)
    sys.stdout.write(json.dumps(out))


main()
