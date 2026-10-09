import contextlib
import importlib.util
import io
import json
import sys


def load(path):
    spec = importlib.util.spec_from_file_location("testkit_target", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def call(fn, args, fail):
    out = io.StringIO()
    err = io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            value = fn(*args)
        result = {"outcome": "return", "value": value}
    except BaseException as e:
        kind = "Fail" if isinstance(fail, type) and isinstance(e, fail) else "exception"
        result = {"outcome": kind, "type": type(e).__name__, "message": str(e)[:2000]}
    result["stdout"] = out.getvalue()
    result["stderr"] = err.getvalue()
    return result


def main():
    request = json.load(sys.stdin)
    real_stdout = sys.stdout
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            mod = load(request["module"])
    except BaseException as e:
        real_stdout.write(json.dumps({"importError": {"type": type(e).__name__, "message": str(e)}}))
        return
    fail = getattr(mod, "Fail", None)
    fn = getattr(mod, request["fn"], None)
    if not callable(fn):
        real_stdout.write(json.dumps({"importError": {"type": "AttributeError", "message": f"{request['fn']} is not callable"}}))
        return
    results = [call(fn, args, fail) for args in request["calls"]]
    real_stdout.write(json.dumps({"results": results}, default=repr))


if __name__ == "__main__":
    main()
