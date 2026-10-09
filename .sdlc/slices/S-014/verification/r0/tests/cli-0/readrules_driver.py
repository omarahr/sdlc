import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("branches", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
if len(sys.argv) > 4:
    mod.FORGE_TIMEOUT = float(sys.argv[4])
try:
    print(json.dumps({"ret": mod.read_rules(sys.argv[2], json.loads(sys.argv[3]))}))
except mod.Fail as e:
    print(json.dumps({"fail": str(e)}))
