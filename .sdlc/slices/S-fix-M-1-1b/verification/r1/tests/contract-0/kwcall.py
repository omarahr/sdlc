import importlib.util
import json
import sys


def load(path):
    spec = importlib.util.spec_from_file_location("kw_target", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def decode(value):
    if isinstance(value, dict) and "$float" in value:
        return float(value["$float"])
    if isinstance(value, dict) and "$bigint" in value:
        return int(value["$bigint"])
    return value


def encode(value):
    if isinstance(value, dict):
        return {k: encode(v) for k, v in value.items()}
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > 2**53:
        return {"$bigint": str(value)}
    return value


request = json.load(sys.stdin)
mod = load(request["module"])
out = []
for call in request["calls"]:
    parts = {k: decode(v) for k, v in call.get("parts", {}).items()}
    try:
        if call["fn"] == "name":
            value = mod.name(call["fmt"], call["kind"], **parts)
        else:
            value = mod.parse(call["fmt"], call["branch"])
        out.append({"outcome": "return", "value": encode(value)})
    except mod.Fail as e:
        out.append({"outcome": "Fail", "message": str(e)})
    except BaseException as e:
        out.append({"outcome": "exception", "type": type(e).__name__, "message": str(e)[:300]})
sys.stdout.write(json.dumps(out))
