# Judge SC-M-1-080, voter 2

Verdict: NOT REFUTED. Product bug.

Spec section 2 row 8 says the slice tail matches [A-Za-z0-9-] only. The scenario expects null for look-alike unicode.

Reproduction: call parse in skills/sdlc/branches.py with format feature/p-1-{name:lower}.
- feature/p-1-S-00 plus U+212A gives kind slice.
- feature/p-1-s-001 plus U+017F gives kind slice.
- feature/p-1-U+017F-001 gives kind slice.
- feature/p-1-s-00 plus U+212A plus -v0-cli-0 gives kind verify.

Cause: parse uses re.IGNORECASE on a str pattern. Unicode case folding lets [A-Za-z] match U+017F and U+212A. Fix: use re.ASCII with re.IGNORECASE.
