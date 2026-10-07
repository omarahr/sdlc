#!/usr/bin/env python3
"""ste-check: lint markdown against the STE rules in prompts/ste-style.md.

Usage: ste-check.py <file.md> [more.md ...]

Exit 0 when every file is clean, 1 when any rule fires. Each violation prints one line to
stdout in the shape `file:line: rule — text`. An unreadable file is itself one violation
(`file:0: unreadable — ...`), after the other files' violations, and the exit is still 1. The rules:

- long-sentence: a sentence of more than 20 words.
- exclamation: a `!` in prose.
- all-caps: a word of two or more uppercase letters outside a code span, unless it is a defined
  placeholder (`<skill>`, `<n>`, ...) or an allowed technical-name acronym (ALLOWED_ALL_CAPS).
- banned-word: one of the padding idioms (BANNED), matched on word boundaries so `adjust` does
  not trip `just`.
- multi-clause: more than two finite verbs in one sentence, the one-instruction-per-sentence
  heuristic.

Mechanics, kept predictable on purpose — this linter gates every prompt file:

- Fenced code blocks and lines that start a heading, a table row or an HTML tag are skipped
  whole; inline code spans are removed before any other work, so backticked text is exempt.
- Sentences split on `.`, `;` and `:` followed by whitespace or end of line, one list item per
  line, each continuation line its own sentence. A period guarded by an abbreviation
  (`e.g.`, `etc.`) does not split.
- A code span counts as no word; tokens without letters or digits count as no word.
- The verb heuristic uses a fixed list of lexical verbs (VERBS), matching base forms and their
  third-person `-s`/`-ies`/`-es` shapes. Copulas, auxiliaries, modals, past forms and
  noun-leaning homographs do not count — words these prompts use as nouns far more often than
  as verbs (`test`, `file`, `state`, `report`, `note`, `slice`, `name`, `request`, `block`,
  `format`, `output`, `log`, ...) are left out of the list: the target is imperative clauses.
  A `not` or `never` puts every later verb of the sentence into one negated instruction, which
  counts as zero verbs — the lenient direction — so `Never a, b or c` passes.
- A verb misfire is a prompt problem, not a linter bug: reword the line. Extend VERBS or
  ALLOWED_ALL_CAPS only with a word a prompt file legitimately needs.
"""

import re
import string
import sys

MAX_WORDS = 20

# The placeholders the prompt files define, by their inner name in lowercase. The `<name>` form
# is exempt in any casing of a defined name, and so is the bare NAME token; a `<NAME>` whose
# name is not defined here trips the all-caps rule.
PLACEHOLDERS = frozenset({
    "skill", "defaultbranch", "n", "id", "lens", "round", "profile", "part", "basebranch",
    "milestoneid", "sliceid", "state", "file", "spec", "mainroot", "type", "subject", "path",
})

# Acronyms are technical names under the Technical Names rule, not shouting. Everything else in
# caps gets reworded or lands here with a reason.
ALLOWED_ALL_CAPS = frozenset({
    "STE", "ADR", "SDLC", "EOF", "TMPDIR", "HEAD", "URL", "SHA", "CI", "PR", "MR", "API",
    "JSON", "YAML", "CLI", "UI", "ID", "TODO",
})

# Padding and softening idioms. Word boundaries apply, so `adjust` never trips `just`.
BANNED = ("please", "simply", "just", "obviously", "of course", "keep in mind", "make sure",
          "nice", "great")

# Periods after these words do not end a sentence; a period after a single letter (e.g., i.e.)
# is guarded the same way.
ABBREVS = frozenset({"etc", "vs", "cf", "resp"})

# Lexical verbs for the multi-clause heuristic. Base forms only; inflections match by the
# suffix rules in is_verb. Deliberately absent: be/have forms and modals (copulas and
# auxiliaries are not instructions), past forms (a narration is not an imperative), and the
# noun-leaning homographs a prompt uses as nouns far more often than as verbs.
VERBS = frozenset({
    "add", "advance", "answer", "append", "apply", "ask", "assemble", "assert", "assign",
    "attach", "avoid", "back", "bypass", "become", "begin", "boot", "break", "bring",
    "build", "bump", "call", "carry", "check", "cherrypick", "choose", "cite", "clean", "clear",
    "close", "collect", "combine", "commit", "compare", "compile", "complete", "compute",
    "confirm", "connect", "consider", "continue", "contrast", "convert", "copy", "count",
    "cover", "create", "cut", "decide", "declare", "decrease", "define", "delete", "deliver",
    "demand", "demonstrate", "deny", "deploy", "describe", "design", "detect", "determine",
    "diagnose", "disable", "discard", "discuss", "dismiss", "dispatch", "display", "do",
    "download", "drop", "edit", "enable", "encode", "end", "enforce", "ensure",
    "enter", "evaluate", "examine", "exist", "exit", "expand", "expect", "explain", "expose",
    "extract", "fail", "fall", "feed", "fetch", "fill", "find", "finish", "fix", "flag",
    "flush", "focus", "follow", "forcepush", "gather", "give", "go", "grant", "grep",
    "handle", "hide", "hold", "include", "increase", "inject", "install", "interpret",
    "interrupt", "introduce", "invalidate", "join", "keep", "kill", "land", "launch", "lay",
    "lead", "leave", "let", "list", "load", "lock", "look", "loop", "make", "manage",
    "map", "mark", "match", "mean", "merge", "migrate", "mirror", "move", "need",
    "obtain", "omit", "open", "order", "overwrite", "park", "parse", "pass", "paste",
    "patch", "pay", "perform", "pick", "pin", "plan", "point", "poll", "post", "prepare",
    "print", "produce", "promote", "prove", "provide", "publish", "pull", "push", "put",
    "queue", "quit", "raise", "rate", "reach", "read", "record", "refactor", "refuse",
    "register", "rebase", "receive", "remove", "rename", "reopen", "repair", "replace", "reply",
    "require", "rerun", "reset", "resolve", "respond", "restart", "restore",
    "restrict", "retry", "return", "reuse", "review", "reword", "roll", "run", "save",
    "schedule", "search", "see", "select", "send", "separate", "serialize", "serve", "set",
    "settle", "ship", "show", "shut", "sign", "simplify", "skip", "solve", "sort",
    "spawn", "split", "squash", "squashmerge", "stage", "stand", "start", "stay", "stop",
    "store", "submit", "subscribe", "summarize", "supply", "support", "take", "think", "treat",
    "trigger", "trim", "turn", "update", "upload", "use", "validate", "verify", "wait", "walk",
    "want", "warn", "watch", "wire", "write", "yield",
})

FENCE = re.compile(r"^\s*(```|~~~)")
CODE_SPAN = re.compile(r"`[^`]*`")
LIST_MARKER = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")
ENDER = re.compile(r"[.;:](?=\s|$)")
NEGATIONS = ("not", "never")


def words(text):
    return [tok for tok in text.split() if any(ch.isalnum() for ch in tok)]


def is_verb(w):
    if w in VERBS:
        return True
    if w.endswith("ies") and w[:-3] + "y" in VERBS:
        return True
    if w.endswith("es") and w[:-2] in VERBS:
        return True
    return w.endswith("s") and w[:-1] in VERBS


def verb_hits(segment):
    hits = 0
    negated = False
    for tok in segment.split():
        w = re.sub(r"[^a-z]", "", tok.lower())
        if not w:
            continue
        if w in NEGATIONS:
            negated = True
            continue
        if not negated and is_verb(w):
            hits += 1
    return hits


def caps_hit(segment):
    hits = []
    for tok in segment.split():
        ph = re.fullmatch(r"<([A-Za-z]+)>", tok)
        if ph:
            if ph.group(1).lower() not in PLACEHOLDERS and ph.group(1).isupper():
                hits.append(ph.group(0))
            continue
        core = tok.strip(string.punctuation)
        if not core or core.lower() in PLACEHOLDERS:
            continue
        if re.fullmatch(r"[A-Z]{2,}", core) and core not in ALLOWED_ALL_CAPS:
            hits.append(core)
    return hits


def banned_hits(segment):
    low = segment.lower()
    hits = []
    for phrase in BANNED:
        pat = r"(?<![a-z])" + r"\s+".join(re.escape(w) for w in phrase.split()) + r"(?![a-z])"
        if re.search(pat, low):
            hits.append(phrase)
    return hits


def split_sentences(text):
    parts, start = [], 0
    for m in ENDER.finditer(text):
        word = re.search(r"[A-Za-z]+$", text[:m.start()])
        if word and (len(word.group()) == 1 or word.group().lower() in ABBREVS):
            continue
        parts.append(text[start:m.end()])
        start = m.end()
    parts.append(text[start:])
    return parts


def check_segment(segment):
    seg = re.sub(r"\s+", " ", segment).strip()
    if not seg:
        return []
    out = []
    if len(words(seg)) > MAX_WORDS:
        out.append(("long-sentence", seg))
    if "!" in seg:
        out.append(("exclamation", seg))
    if caps_hit(seg):
        out.append(("all-caps", seg))
    if banned_hits(seg):
        out.append(("banned-word", seg))
    if verb_hits(seg) > 2:
        out.append(("multi-clause", seg))
    return out


def check_line(raw):
    text = CODE_SPAN.sub(" ", raw.replace("**", ""))
    text = LIST_MARKER.sub("", text)
    stripped = text.strip()
    # skipped whole: headings, table rows, a line that is only a code span (empty after the span
    # removal), and a line that is entirely a placeholder definition. A prose line opening with a
    # placeholder, backticked or raw, is linted normally — the placeholder token itself is exempt.
    if not stripped or stripped[0] in "#|":
        return []
    if stripped[0] == "<" and re.fullmatch(r"<[A-Za-z]+>\s*[.:]?", stripped):
        return []
    out = []
    for sentence in split_sentences(text):
        out.extend(check_segment(sentence))
    return out


def check_file(path):
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.read().split("\n")
    except OSError as e:
        return [f"{path}:0: unreadable — {e}"]
    out = []
    in_fence = False
    for lineno, raw in enumerate(lines, 1):
        if FENCE.match(raw):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for rule, text in check_line(raw):
            out.append(f"{path}:{lineno}: {rule} — {text}")
    return out


def main(argv):
    if len(argv) < 2:
        print("usage: ste-check.py <files...>", file=sys.stderr)
        return 2
    violations = []
    for path in argv[1:]:
        violations.extend(check_file(path))
    for line in violations:
        print(line)
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
