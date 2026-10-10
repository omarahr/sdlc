# Security review, round 0, slice S-fix-M-1-1a

Result: no blocking finding.

- The change makes parse read ASCII only. Regex flags now include re.ASCII. Case folding uses an ASCII-only table.
- Look-alike characters (Kelvin sign, long s, Arabic digits) no longer match a loop branch.
- The id check, isascii, rejects a non-ASCII id from the verify and attempt rows.
- Non-blocking: the "$" anchor accepts a trailing newline, so "run-1\n" parses as a run branch. Git refuses newlines in branch names. Use "\Z" if input from outside git reaches parse.
