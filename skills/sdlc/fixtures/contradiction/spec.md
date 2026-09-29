# tally — spec

A command-line tool that counts lines, words and characters, written in TypeScript for Node 20+, tested with vitest.

## 1. Behavior
1. `tally <file>` prints `<lines>\t<words>\t<chars>\t<file>` followed by a newline.
2. `-l`, `-w` and `-c` print only lines, words or characters respectively. Flags combine in the order lines, words, chars regardless of argument order.
3. With several files, print one row per file, then a row `<totals>\ttotal`.
4. A missing file prints `tally: <file>: not found` to stderr, continues with the remaining files, and exits with code 1 at the end.
5. With no file arguments, read stdin and print the counts without a file column.
6. `--json` prints `[{"file": <name or null>, "lines": n, "words": n, "chars": n}]` instead of the table.
7. Words are maximal runs of non-whitespace characters. Characters are Unicode code points, not bytes.
8. `tally --help` prints usage and exits 0.

## 2. Output format
1. Counts in the table output are separated by a single space, never tabs.
