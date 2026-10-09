# verify-security part 0, slice S-005b, round 2

Slice: S-005b. Profile: security. Round: 2. Commit: 80f5b0c. Scenario: VS-7. Verdict: REFUTED (2 failing cases).

Environment: macOS Darwin 25.6, Python 3.14.7 and 3.12.14, Node 24; push_guard.py run on scratch copies of skills/sdlc and hooks at 80f5b0c (worktree sdlc/S-005b-v2-security-0); mutants appended in a scratch tree, no network, no remote.

Charter: Explore process and network calls reached by an alias, a value, an attribute chain, an import or dynamic code, with the attack families alias, rebind, chain, native module, private name and dynamic lookup, to find a call that leaves every push_guard.py pin equal. Guarantee: R-119 scope in tests.md. Threat model: scripts under skills/sdlc and hooks are the scanned tree; a future edit to them is the attacker. Seeds S1 to S5 are out of scope.

## TC-security-1: A process call reached by an import alias fails the guard

- Given: Scratch copy of skills/sdlc and hooks at 80f5b0c; one mutant appended to reports.py, janitor-style files or live-poke.py.
- When: Run push_guard.py on each import-alias mutant: local alias, from-import, star import, late-bound alias, os.exec*, os.spawn*, os.posix_spawn*, os.forkpty, pty, asyncio, multiprocessing, ctypes.
- Then: Each mutant breaks at least one pin.
- Expected: 15 of 15 mutants break a pin.
- Actual: 15 of 15 break a pin on Python 3.14.7 and 3.12.14.
- Result: **pass**
- Spec source: R-119 scope (tests.md): aliases, values, attribute chains, imports and dynamic code are process or network sites; ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs:58`
- Command: `VERIFY_REPO=<worktree at 80f5b0c> VERIFY_PY=<python3.14|python3.12> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs`

```
alias-local-import-sp: breaks ['imports', 'direct', 'pushes']
alias-from-import-run: breaks ['imports', 'direct', 'pushes']
alias-os-system: breaks ['direct', 'pushes']
alias-os-system-late: breaks ['direct', 'pushes']
alias-from-os-system: breaks ['direct', 'pushes']
alias-from-os-star: breaks ['dynamic']
alias-from-subprocess-star: breaks ['imports', 'dynamic']
alias-os-popen-fork: breaks ['direct']
alias-os-spawn: breaks ['direct']
alias-os-posix-spawn: breaks ['direct']
alias-os-forkpty: breaks ['direct']
alias-pty-spawn: breaks ['imports', 'direct', 'network', 'pushes']
alias-asyncio-shell: breaks ['imports', 'direct', 'network', 'pushes']
alias-multiprocessing: breaks ['imports', 'direct', 'network']
alias-ctypes-system: breaks ['imports', 'direct', 'network']
```

## TC-security-2: A watched module used as a value, and attribute chains through a watched module, fail the guard

- Given: As TC-security-1.
- When: Run the guard on rebind, default parameter, walrus, list element, base class, class attribute, decorator, map and lambda-argument mutants; on shutil.os, tempfile.os, glob.os, mimetypes.os, fnmatch.os, posixpath.os, import-as, from-import, branches.subprocess, branches.os, hub.os and workflow.subprocess chains.
- Then: Each mutant breaks at least one pin.
- Expected: 24 of 24 mutants break a pin.
- Actual: 24 of 24 break a pin.
- Result: **pass**
- Spec source: R-119 scope (tests.md): aliases, values, attribute chains, imports and dynamic code are process or network sites; ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs:73`
- Command: `VERIFY_REPO=<worktree at 80f5b0c> VERIFY_PY=<python3.14|python3.12> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs`

```
value-rebind: breaks ['imports', 'dynamic']
value-func-rebind: breaks ['imports', 'dynamic']
value-default-param: breaks ['imports', 'dynamic']
value-walrus: breaks ['imports', 'dynamic']
value-list-element: breaks ['imports', 'dynamic']
value-base-class: breaks ['imports', 'dynamic']
value-class-attr: breaks ['imports', 'dynamic']
value-decorator: breaks ['dynamic']
value-map: breaks ['dynamic']
value-lambda-arg: breaks ['imports', 'dynamic']
value-os-bare: breaks ['dynamic']
value-os-environ-ok-then-popen: breaks ['imports', 'dynamic']
chain-shutil-os: breaks ['direct', 'pushes']
chain-tempfile-os: breaks ['direct', 'pushes']
chain-glob-os: breaks ['direct', 'pushes']
chain-mimetypes-os: breaks ['direct', 'pushes']
chain-fnmatch-os: breaks ['direct', 'pushes']
chain-posixpath-os: breaks ['direct', 'pushes']
chain-alias-shutil: breaks ['direct', 'pushes']
chain-from-shutil-os: breaks ['direct', 'pushes']
chain-branches-subprocess: breaks ['direct', 'pushes']
chain-branches-os: breaks ['direct', 'pushes']
chain-hub-os: breaks ['direct', 'pushes']
chain-workflow-subprocess: breaks ['direct', 'pushes']
```

## TC-security-3: Native modules, network modules and new imports fail the guard

- Given: As TC-security-1.
- When: Run the guard on posix, nt, _posixsubprocess, _socket, _ssl, _winapi, runpy, code, codeop, any underscore module, socket, ssl, http.client, urllib.request (also through from-import and through a file that imports only urllib.parse), smtplib and webbrowser mutants.
- Then: Each mutant breaks at least one pin.
- Expected: 21 of 21 mutants break a pin.
- Actual: 21 of 21 break a pin.
- Result: **pass**
- Spec source: R-119 scope (tests.md): aliases, values, attribute chains, imports and dynamic code are process or network sites; ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs:101`
- Command: `VERIFY_REPO=<worktree at 80f5b0c> VERIFY_PY=<python3.14|python3.12> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs`

```
native-posix: breaks ['imports', 'direct', 'dynamic', 'pushes']
native-nt: breaks ['imports', 'dynamic']
native-posixsubprocess: breaks ['imports', 'direct', 'dynamic']
native-from-posixsubprocess: breaks ['imports', 'dynamic']
native-socket: breaks ['imports', 'network', 'dynamic']
native-ssl: breaks ['imports', 'dynamic']
native-winapi: breaks ['imports', 'direct', 'dynamic']
native-runpy: breaks ['imports', 'dynamic']
native-code: breaks ['imports', 'dynamic']
native-codeop: breaks ['imports', 'dynamic']
native-underscore-import: breaks ['imports', 'dynamic']
network-socket-call: breaks ['imports', 'network']
network-from-socket: breaks ['imports', 'network']
network-collect-urlopen: breaks ['network']
network-from-urllib-request: breaks ['imports', 'network']
network-http-client: breaks ['imports', 'network']
network-urllib-parse-only: breaks ['network']
network-ssl: breaks ['imports', 'network']
network-webbrowser: breaks ['imports', 'network']
network-smtplib: breaks ['imports', 'network']
network-hub-http-server: breaks ['imports', 'network']
```

## TC-security-4: Dynamic code fails the guard

- Given: As TC-security-1.
- When: Run the guard on eval, exec, compile, __import__, importlib (also from-import), globals, locals, vars(), vars(module), getattr on a module, getattr bound to another name, __builtins__, os.__dict__, private module attributes, __getattribute__, operator.attrgetter, functools.partial, breakpoint, pipes and pydoc imports, rebound imports and star imports of branches or hub.
- Then: Each mutant breaks at least one pin; the harmless control sys.exit keeps every pin.
- Expected: 32 of 32 mutants break a pin.
- Actual: 32 of 32 break a pin.
- Result: **pass**
- Spec source: R-119 scope (tests.md): aliases, values, attribute chains, imports and dynamic code are process or network sites; ADR-20261009-062930-decision-judge-S-005-388e refutation rule
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs:122`
- Command: `VERIFY_REPO=<worktree at 80f5b0c> VERIFY_PY=<python3.14|python3.12> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs`

```
dyn-eval: breaks ['dynamic']
dyn-exec: breaks ['dynamic']
dyn-compile: breaks ['dynamic']
dyn-dunder-import: breaks ['dynamic']
dyn-importlib: breaks ['imports', 'dynamic']
dyn-importlib-from: breaks ['imports', 'dynamic']
dyn-globals: breaks ['dynamic']
dyn-locals: breaks ['dynamic']
dyn-vars-noarg: breaks ['dynamic']
dyn-vars-arg-module: breaks ['dynamic']
dyn-getattr-os: breaks ['dynamic']
dyn-getattr-alias: breaks ['dynamic']
dyn-builtins: breaks ['dynamic']
dyn-builtins-import: breaks ['imports', 'opaque']
dyn-dict-os: breaks ['dynamic']
dyn-private-os: breaks ['dynamic']
dyn-private-json: breaks ['dynamic']
dyn-getattribute: breaks ['dynamic']
dyn-globals-subscript-call: breaks ['dynamic']
dyn-operator-attrgetter: breaks ['imports', 'dynamic']
dyn-functools-partial: breaks ['imports', 'dynamic']
dyn-breakpoint: breaks ['dynamic']
dyn-pipes-import: breaks ['imports']
dyn-pydoc-import: breaks ['imports']
dyn-rebound-two-imports: breaks ['imports', 'dynamic']
dyn-rebound-os-shutil: breaks ['dynamic']
dyn-star-shutil: breaks ['direct', 'pushes']
dyn-from-branches-star: breaks ['direct', 'pushes']
dyn-from-branches-import-subprocess: breaks ['direct', 'pushes']
dyn-from-branches-import-os: breaks ['direct', 'pushes']
```

## TC-security-5: A pure module that holds a process module, passed as a parameter or rebound, fails the guard

- Given: Scratch copy at 80f5b0c. reports.py gains import shutil and one function.
- When: Run the guard on four mutants: def _v(m): return m.os.system(...) then _v(shutil); m = shutil then m.os.system(...); getattr(m, 'os').system(...) with m = shutil; map(getattr, [shutil], ['os']).
- Then: Each mutant breaks at least one pin, as shutil.os.system does.
- Expected: 0 of 4 break a pin.
- Actual: 0 of 4 break a pin. The scanner resolves a chain only from an imported name. A local name bound to a pure module hides the os attribute. The same call runs in a real interpreter: python3.14 and 3.12 print REACHED for both m.os.system forms.
- Result: **fail**
- Spec source: R-119 scope: 'An attribute chain through a watched module, such as shutil.os.system ... is read as the watched module call'; 'a process call or a network call in a scanned file' refutes when the output stays equal (ADR-388e)
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs:98`
- Command: `VERIFY_REPO=<worktree at 80f5b0c> VERIFY_PY=<python3.14|python3.12> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs`

```
chain-param-shutil: breaks []
chain-rebind-shutil: breaks []
chain-getattr-rebind: breaks []
dyn-getattr-map: breaks []
```

## TC-security-6: A private module name imported with from-import fails the guard

- Given: Scratch copy at 80f5b0c. reports.py gains from tempfile import _os (or argparse _os) and one function that calls _os.system or _os.popen.
- When: Run the guard on four mutants: from tempfile import _os; from tempfile import _os as _o; from argparse import _os; from shutil import _ntuple_diskusage.
- Then: Each mutant breaks the dynamic pin ('A private attribute (a name that starts with _) of an imported module') or the direct pin.
- Expected: 0 of 4 break a pin.
- Actual: 0 of 4 break a pin. visit_ImportFrom flags private names only for modules whose top name starts with underscore or is watched. canon() reads _os.system, which is_process() does not match. The call runs in a real interpreter: python3.14 prints REACHED4.
- Result: **fail**
- Spec source: R-119 scope: 'A private attribute (a name that starts with _) of an imported module' is a dynamic site; process call in a scanned file refutes (ADR-388e)
- Test: `.sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs:161`
- Command: `VERIFY_REPO=<worktree at 80f5b0c> VERIFY_PY=<python3.14|python3.12> node --test .sdlc/slices/S-005b/verification/r2/tests/security-0/push-guard-vs7.verify-security.test.mjs`

```
dyn-from-argparse-private-os: breaks []
dyn-from-shutil-private: breaks []
dyn-from-tempfile-private-os: breaks []
dyn-from-tempfile-private-os-alias: breaks []
```

## Attacks

| id | charter | result | observed |
|---|---|---|---|
| AT-alias-local-import-sp | import alias bound in a function body | held | pins broken: imports,direct,pushes |
| AT-alias-from-import-run | from-import alias | held | pins broken: imports,direct,pushes |
| AT-alias-os-system | import os as alias | held | pins broken: direct,pushes |
| AT-alias-os-system-late | alias bound after use | held | pins broken: direct,pushes |
| AT-alias-from-os-system | from os import system | held | pins broken: direct,pushes |
| AT-alias-from-os-star | star import of os | held | pins broken: dynamic |
| AT-alias-from-subprocess-star | star import of subprocess | held | pins broken: imports,dynamic |
| AT-alias-os-popen-fork | os.popen and os.execvp | held | pins broken: direct |
| AT-alias-os-spawn | os.spawnlp | held | pins broken: direct |
| AT-alias-os-posix-spawn | os.posix_spawnp | held | pins broken: direct |
| AT-alias-os-forkpty | os.forkpty | held | pins broken: direct |
| AT-alias-pty-spawn | pty.spawn | held | pins broken: imports,direct,network,pushes |
| AT-alias-asyncio-shell | asyncio subprocess | held | pins broken: imports,direct,network,pushes |
| AT-alias-multiprocessing | multiprocessing.Process | held | pins broken: imports,direct,network |
| AT-alias-ctypes-system | ctypes libc system | held | pins broken: imports,direct,network |
| AT-value-rebind | module rebind | held | pins broken: imports,dynamic |
| AT-value-func-rebind | function rebind | held | pins broken: imports,dynamic |
| AT-value-default-param | default parameter | held | pins broken: imports,dynamic |
| AT-value-walrus | walrus | held | pins broken: imports,dynamic |
| AT-value-list-element | list element | held | pins broken: imports,dynamic |
| AT-value-base-class | base class | held | pins broken: imports,dynamic |
| AT-value-class-attr | class attribute | held | pins broken: imports,dynamic |
| AT-value-decorator | decorator | held | pins broken: dynamic |
| AT-value-map | map over os.system | held | pins broken: dynamic |
| AT-value-lambda-arg | lambda taking module | held | pins broken: imports,dynamic |
| AT-value-os-bare | bare os as value | held | pins broken: dynamic |
| AT-value-os-environ-ok-then-popen | ternary | held | pins broken: imports,dynamic |
| AT-chain-shutil-os | shutil.os.system | held | pins broken: direct,pushes |
| AT-chain-tempfile-os | tempfile.os.system | held | pins broken: direct,pushes |
| AT-chain-glob-os | glob.os.system | held | pins broken: direct,pushes |
| AT-chain-mimetypes-os | mimetypes.os.system | held | pins broken: direct,pushes |
| AT-chain-fnmatch-os | fnmatch.os | held | pins broken: direct,pushes |
| AT-chain-posixpath-os | posixpath.os | held | pins broken: direct,pushes |
| AT-chain-alias-shutil | import shutil as sh | held | pins broken: direct,pushes |
| AT-chain-from-shutil-os | from shutil import os | held | pins broken: direct,pushes |
| AT-chain-branches-subprocess | branches.subprocess.run | held | pins broken: direct,pushes |
| AT-chain-branches-os | branches.os.system | held | pins broken: direct,pushes |
| AT-chain-hub-os | hub.os.system | held | pins broken: direct,pushes |
| AT-chain-workflow-subprocess | workflow.subprocess | held | pins broken: direct,pushes |
| AT-chain-sys-modules | sys.modules (S3) | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-chain-param-shutil | pure module passed as parameter | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-chain-rebind-shutil | pure module rebound to a local | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-chain-getattr-rebind | getattr on a rebound pure module | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-native-posix | import posix | held | pins broken: imports,direct,dynamic,pushes |
| AT-native-nt | import nt | held | pins broken: imports,dynamic |
| AT-native-posixsubprocess | _posixsubprocess | held | pins broken: imports,direct,dynamic |
| AT-native-from-posixsubprocess | from _posixsubprocess import | held | pins broken: imports,dynamic |
| AT-native-socket | _socket | held | pins broken: imports,network,dynamic |
| AT-native-ssl | _ssl | held | pins broken: imports,dynamic |
| AT-native-winapi | _winapi | held | pins broken: imports,direct,dynamic |
| AT-native-runpy | runpy | held | pins broken: imports,dynamic |
| AT-native-code | code | held | pins broken: imports,dynamic |
| AT-native-codeop | codeop | held | pins broken: imports,dynamic |
| AT-native-underscore-import | any underscore module | held | pins broken: imports,dynamic |
| AT-network-socket-call | socket.create_connection | held | pins broken: imports,network |
| AT-network-from-socket | from socket import socket | held | pins broken: imports,network |
| AT-network-collect-urlopen | new urlopen in collect.py | held | pins broken: network |
| AT-network-from-urllib-request | from urllib import request | held | pins broken: imports,network |
| AT-network-http-client | http.client alias | held | pins broken: imports,network |
| AT-network-urllib-parse-only | urllib.request reached through urllib.parse import | held | pins broken: network |
| AT-network-ssl | ssl context wrap | held | pins broken: imports,network |
| AT-network-webbrowser | webbrowser.open | held | pins broken: imports,network |
| AT-network-smtplib | smtplib | held | pins broken: imports,network |
| AT-network-hub-http-server | http.server alias value | held | pins broken: imports,network |
| AT-dyn-eval | eval | held | pins broken: dynamic |
| AT-dyn-exec | exec | held | pins broken: dynamic |
| AT-dyn-compile | compile | held | pins broken: dynamic |
| AT-dyn-dunder-import | __import__ | held | pins broken: dynamic |
| AT-dyn-importlib | importlib.import_module | held | pins broken: imports,dynamic |
| AT-dyn-importlib-from | from importlib import import_module | held | pins broken: imports,dynamic |
| AT-dyn-globals | globals() | held | pins broken: dynamic |
| AT-dyn-locals | locals() | held | pins broken: dynamic |
| AT-dyn-vars-noarg | vars() | held | pins broken: dynamic |
| AT-dyn-vars-arg-module | vars(module) | held | pins broken: dynamic |
| AT-dyn-getattr-os | getattr(os, ...) | held | pins broken: dynamic |
| AT-dyn-getattr-alias | getattr bound to another name | held | pins broken: dynamic |
| AT-dyn-getattr-map | getattr passed as a value | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-builtins | __builtins__ | held | pins broken: dynamic |
| AT-dyn-builtins-import | import builtins | held | pins broken: imports,opaque |
| AT-dyn-dict-os | os.__dict__ | held | pins broken: dynamic |
| AT-dyn-private-os | os._exit private | held | pins broken: dynamic |
| AT-dyn-private-json | json._default_encoder | held | pins broken: dynamic |
| AT-dyn-private-alias-from | from json import _default_encoder | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-getattribute | object.__getattribute__ | held | pins broken: dynamic |
| AT-dyn-globals-subscript-call | globals()["f"]() | held | pins broken: dynamic |
| AT-dyn-operator-attrgetter | operator.attrgetter | held | pins broken: imports,dynamic |
| AT-dyn-functools-partial | functools.partial | held | pins broken: imports,dynamic |
| AT-dyn-globals-fn | function __globals__ walk (S3) | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-loader | __loader__ (S3) | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-type-subclasses | subclass walk (S3) | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-help | help() builtin pager | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-breakpoint | breakpoint() | held | pins broken: dynamic |
| AT-dyn-pipes-import | pipes import | held | pins broken: imports |
| AT-dyn-pydoc-import | pydoc import | held | pins broken: imports |
| AT-dyn-rebound-two-imports | one name two modules | held | pins broken: imports,dynamic |
| AT-dyn-rebound-os-shutil | os rebound to shutil.os | held | pins broken: dynamic |
| AT-dyn-star-shutil | from shutil import * | held | pins broken: direct,pushes |
| AT-dyn-star-tempfile | from tempfile import * | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-from-branches-star | from branches import * | held | pins broken: direct,pushes |
| AT-dyn-from-branches-import-subprocess | from branches import subprocess | held | pins broken: direct,pushes |
| AT-dyn-from-branches-import-os | from branches import os | held | pins broken: direct,pushes |
| AT-dyn-from-hub-os | from hub import os | held | pins broken: direct,pushes |
| AT-dyn-from-sys-modules | from sys import modules (S3) | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-from-tempfile-private-os | from tempfile import _os | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-from-tempfile-private-os-alias | from tempfile import _os as o | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-from-argparse-private-os | from argparse import _os | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-from-shutil-private | from shutil import _ntuple_diskusage | broke | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-import-private-submodule | import tempfile._os-like private via import-as | out-of-scope | every pin stays equal (python 3.14.7 and 3.12) |
| AT-dyn-from-glob-os | from glob import os | held | pins broken: direct,pushes |
| AT-dyn-sys-exit-ok | control: harmless sys.exit | held | every pin stays equal (python 3.14.7 and 3.12) |

## Seeds

- S3 loader reached by an unnamed walk: sys.modules['subprocess'].run, from sys import modules, (lambda: 0).__globals__['__builtins__']['__import__'], __loader__.load_module and ().__class__.__base__.__subclasses__() leave every pin equal. The spec lists S3 as a seed.
- help() builtin: help('modules') can start a pager process. The scanner does not flag the name help. A seed: it needs a tty and is no direct process call.
- Private from-import of a harmless name: from json import _default_encoder and import json.decoder as _jd keep every pin. The names run no process. They show that private from-imports are not flagged, which TC-security-6 uses.
