import importlib.util
_cache = {}
def _mod(path):
    if path not in _cache:
        s = importlib.util.spec_from_file_location("b", path)
        m = importlib.util.module_from_spec(s)
        s.loader.exec_module(m)
        _cache[path] = m
    return _cache[path]
def byname(fmt, kind, parts, branches_py):
    return _mod(branches_py).name(fmt, kind, **parts)
def parsed(fmt, branch, branches_py):
    return _mod(branches_py).parse(fmt, branch)
