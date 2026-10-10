import importlib.util
import os

spec = importlib.util.spec_from_file_location("branches_under_test", open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "target.txt")).read().strip())
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Fail = mod.Fail


def regex_eval(pattern, sample, negate=False):
    return mod.evaluate({"source": "x", "kind": "regex", "pattern": pattern, "negate": negate, "label": "l"}, sample)


def name_slice(fmt, ident):
    return mod.name(fmt, "slice", id=ident)


def name_milestone(fmt, ident):
    return mod.name(fmt, "milestone", id=ident)


def validate(fmt):
    return mod.validate_format(fmt)


def exports():
    return sorted(n for n in dir(mod) if not n.startswith("_") and getattr(getattr(mod, n), "__module__", None) == mod.__name__)
