import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("branches_under_test", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
repo = sys.argv[2]
samples = json.loads(sys.argv[3])
try:
    out = {"result": mod.read_rules(repo, samples)}
except mod.Fail as e:
    out = {"fail": str(e)}
except BaseException as e:
    out = {"raised": type(e).__name__, "message": str(e)}
print(json.dumps(out))
