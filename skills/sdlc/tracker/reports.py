#!/usr/bin/env python3
"""Render the slices' test reports as browsable HTML.

Usage:
  reports.py [--repo DIR] [--out DIR]

Reads each slice's REPORT.md (the test completion report from the test-reporter) and its
per-round records: verification/plan-r*.md, verification/r*/<profile>-<part>.md, the core
verifiers' verify-*.md summaries, and older reports/verify-*.md full reports. Writes <out>/index.html and one
<out>/<slice id>.html per slice (default out: <repo>/.sdlc/tracker/reports).
Every `path:line` test reference in a report that names a file in the repo gets the
test's source shown under it, so the tests can be read next to the evidence.
Python 3 standard library only.
"""
import argparse
import glob
import html
import json
import os
import re

VERIFY = re.compile(r"^verify-(?P<lens>[a-z-]+)-r(?P<round>\d+)\.md$")
VERDICT = re.compile(r"\b(?:Verdict|Result)\s*:\s*\**\s*(HELD|REFUTED|NOT REFUTED|PASS|FAIL|RELEASED|PARKED)", re.I)
# a repo-relative source reference such as packages/sdk/src/locale.test.ts:42
SOURCE_REF = re.compile(r"(?<![\w/.-])((?:[\w.@-]+/)*[\w.@-]+\.[A-Za-z0-9]{1,5}):(\d{1,6})\b")
# a bare test file path, such as internal/submit/store_behavior_test.go
TEST_FILE = re.compile(r"(?<![\w/.-])((?:[\w.@-]+/)+[\w.@-]*(?:test|spec)[\w.@-]*\.[A-Za-z0-9]{1,5})\b(?!:\d)")
SNIPPET_MAX = 80
FILE_MAX = 300

CSS = """
:root { --ground:#eef0f3; --surface:#fff; --sunk:#f6f7f9; --ink:#131720; --muted:#586173; --faint:#8b93a2;
  --line:#e1e4ea; --accent:#2f4fd8; --done:#1b8353; --done-soft:#ddf1e6; --bad:#b42318; --bad-soft:#fde4e1;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark;
  --ground:#0c0f14; --surface:#151920; --sunk:#1a1f27; --ink:#e9ecf2; --muted:#a3abba; --faint:#6e7787;
  --line:#252b35; --accent:#93a4ff; --done:#4dc48b; --done-soft:#13281f; --bad:#f97066; --bad-soft:#2d1614; } }
:root[data-theme="dark"] { color-scheme: dark;
  --ground:#0c0f14; --surface:#151920; --sunk:#1a1f27; --ink:#e9ecf2; --muted:#a3abba; --faint:#6e7787;
  --line:#252b35; --accent:#93a4ff; --done:#4dc48b; --done-soft:#13281f; --bad:#f97066; --bad-soft:#2d1614; }
* { box-sizing: border-box; }
body { margin:0; background:var(--ground); color:var(--ink); font:14px/1.5 var(--sans); }
.wrap { max-width:1100px; margin:0 auto; padding:24px 16px 56px; display:grid; gap:18px; }
a { color:var(--accent); }
h1 { font-size:22px; margin:0; } h2 { font-size:17px; margin:22px 0 8px; } h3 { font-size:14.5px; margin:18px 0 6px; }
h4 { font-size:13.5px; margin:14px 0 4px; }
.sub { color:var(--muted); margin:4px 0 0; }
.card { background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:18px 20px; min-width:0; }
.card > :first-child { margin-top:0; }
table { border-collapse:collapse; width:100%; font-size:13px; display:block; overflow-x:auto; }
th, td { border:1px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; }
th { background:var(--sunk); font-weight:600; }
code { font-family:var(--mono); font-size:12.5px; background:var(--sunk); padding:1px 4px; border-radius:4px; overflow-wrap:anywhere; }
pre { background:var(--sunk); border:1px solid var(--line); border-radius:8px; padding:10px 12px; overflow-x:auto; font-size:12.5px; }
pre code { background:none; padding:0; overflow-wrap:normal; }
details.src { margin:6px 0 10px; } details.src summary { cursor:pointer; color:var(--muted); font-size:12.5px; }
details.src pre { margin-top:6px; }
.ln { color:var(--faint); user-select:none; display:inline-block; min-width:3.5em; }
.tag { display:inline-block; font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
  padding:2px 7px; border-radius:4px; background:var(--sunk); color:var(--muted); border:1px solid var(--line); }
.tag.held { background:var(--done-soft); color:var(--done); border-color:transparent; }
.tag.refuted, .tag.parked { background:var(--bad-soft); color:var(--bad); border-color:transparent; }
.tag.released { background:var(--done-soft); color:var(--done); border-color:transparent; }
.report img, .rec img { max-width:100%; border:1px solid var(--line); border-radius:6px; }
details.rec { border-top:1px solid var(--line); padding:8px 0; } details.rec > summary { cursor:pointer; }
details.appendix > summary { cursor:pointer; list-style-position:outside; }
.kind { color:var(--faint); font-size:12px; margin-left:6px; }
.toc { display:flex; flex-wrap:wrap; gap:6px 12px; font-size:13px; }
.muted { color:var(--muted); }
"""


def esc(s):
    # U+FFFD (from undecodable bytes in a source file) as an entity, so hosts that reject it accept the page
    return html.escape(s, quote=True).replace("\ufffd", "&#xFFFD;")


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def read_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def inside(root, path):
    root = os.path.realpath(root)
    path = os.path.realpath(path)
    return path == root or path.startswith(root + os.sep)


def snippet(repo, rel, line):
    """The test starting at `line` (until its indentation closes, at most SNIPPET_MAX lines), or the
    first FILE_MAX lines of the whole file when `line` is None."""
    path = os.path.join(repo, rel)
    if ".." in rel.split("/") or not inside(repo, path) or not os.path.isfile(path):
        return None
    text = read(path)
    if text is None:
        return None
    lines = text.splitlines()
    if line is None:
        return 1, lines[:FILE_MAX] + (["… %d more lines" % (len(lines) - FILE_MAX)] if len(lines) > FILE_MAX else [])
    start = int(line) - 1
    if not 0 <= start < len(lines):
        return None
    first = lines[start]
    indent = len(first) - len(first.lstrip())
    end = start
    for i in range(start + 1, min(len(lines), start + SNIPPET_MAX)):
        end = i
        cur = lines[i]
        if cur.strip() and len(cur) - len(cur.lstrip()) <= indent:
            # a closing line at the test's own indentation ends it; anything else at that level starts the next thing
            if cur.strip()[0] not in "})]" and not cur.lstrip().startswith("end"):
                end = i - 1
            break
    return start + 1, lines[start:end + 1]


def inline(s, ctx):
    """Markdown inline spans, escaped. Links are rewritten relative to the output page."""
    out, pos = [], 0
    for m in re.finditer(r"`([^`]+)`", s):
        out.append(("t", s[pos:m.start()]))
        out.append(("c", m.group(1)))
        pos = m.end()
    out.append(("t", s[pos:]))
    parts = []
    for kind, text in out:
        if kind == "c":
            note_refs(text, ctx)
            parts.append("<code>" + esc(text) + "</code>")
            continue
        note_refs(text, ctx)
        t = esc(text)
        t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
        t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
        t = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", lambda m: '<img alt="%s" src="%s" loading="lazy">' % (m.group(1), link(html.unescape(m.group(2)), ctx)), t)
        t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: '<a href="%s">%s</a>' % (link(html.unescape(m.group(2)), ctx), m.group(1)), t)
        parts.append(t)
    return "".join(parts)


def link(target, ctx):
    if re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I) or target.startswith("#"):
        return esc(target) if target.lower().startswith(("http:", "https:", "#")) else "#"
    path = os.path.normpath(os.path.join(ctx["md_dir"], target))
    if not inside(ctx["repo"], path):
        return "#"
    return esc(os.path.relpath(path, ctx["out"]).replace(os.sep, "/"))


def note_refs(text, ctx):
    found = [(m.group(1), m.group(2)) for m in SOURCE_REF.finditer(text)]
    found += [(m.group(1), None) for m in TEST_FILE.finditer(text)]
    for key in found:
        # a file whose test is already shown at a line is not shown again in full
        if key[1] is None and any(k[0] == key[0] for k in ctx["seen"]):
            continue
        if key not in ctx["seen"] and os.path.isfile(os.path.join(ctx["repo"], key[0])):
            ctx["seen"].add(key)
            ctx["pending"].append(key)


def flush_refs(ctx):
    """<details> blocks with the source of the tests referenced since the last flush."""
    out = []
    for rel, line in ctx["pending"]:
        got = snippet(ctx["repo"], rel, line)
        if not got:
            continue
        n, body = got
        rows = "\n".join('<span class="ln">%d</span>%s' % (n + i, esc(l)) for i, l in enumerate(body))
        where = rel if line is None else "%s:%s" % (rel, line)
        out.append('<details class="src"><summary>Test source: <code>%s</code></summary><pre><code>%s</code></pre></details>'
                   % (esc(where), rows))
    ctx["pending"] = []
    return "\n".join(out)


def cells(row):
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|"):
        row = row[:-1]
    return [c.strip() for c in re.split(r"(?<!\\)\|", row)]


def markdown(md, ctx):
    """A small Markdown renderer: headings, fences, tables, lists, quotes and paragraphs."""
    lines = md.splitlines()
    out, para, i = [], [], 0

    def end_para():
        if para:
            out.append("<p>" + inline(" ".join(para), ctx) + "</p>")
            para.clear()
            out.append(flush_refs(ctx))

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if s.startswith("```") or s.startswith("~~~"):
            end_para()
            fence, lang = s[:3], s[3:].strip()
            body = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith(fence):
                body.append(lines[i])
                i += 1
            code = "\n".join(body)
            if lang not in ("text", "log", "output"):
                note_refs(code, ctx)
            out.append('<pre><code class="%s">%s</code></pre>' % (esc(lang), esc(code)))
            out.append(flush_refs(ctx))
            i += 1
            continue
        # collapsed blocks the test-reporter writes around case detail (GitHub renders them the same way)
        if re.match(r"^<details( open)?>$", s):
            end_para()
            out.append('<details class="rec"%s>' % (" open" if "open" in s else ""))
            i += 1
            continue
        m = re.match(r"^<summary>(.*)</summary>$", s)
        if m:
            end_para()
            out.append("<summary>%s</summary>" % inline(m.group(1), ctx))
            i += 1
            continue
        if s == "</details>":
            end_para()
            out.append("</details>")
            i += 1
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            end_para()
            level = min(6, len(m.group(1)) + 1)  # the page owns <h1>
            out.append("<h%d>%s</h%d>" % (level, inline(m.group(2), ctx), level))
            i += 1
            continue
        if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-{2,}", lines[i + 1]):
            end_para()
            head = cells(s)
            rows = []
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i]))
                i += 1
            t = ["<table><thead><tr>" + "".join("<th>%s</th>" % inline(c, ctx) for c in head) + "</tr></thead><tbody>"]
            for r in rows:
                t.append("<tr>" + "".join("<td>%s</td>" % inline(c, ctx) for c in r) + "</tr>")
            t.append("</tbody></table>")
            out.append("".join(t))
            out.append(flush_refs(ctx))
            continue
        m = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", line)
        if m:
            end_para()
            tag = "ol" if m.group(2)[0].isdigit() else "ul"
            items = []
            while i < len(lines):
                m = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", lines[i])
                if m:
                    items.append([m.group(3)])
                elif lines[i].strip() and items and lines[i].startswith((" ", "\t")):
                    items[-1].append(lines[i].strip())
                else:
                    break
                i += 1
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(" ".join(it), ctx) for it in items), tag))
            out.append(flush_refs(ctx))
            continue
        if s.startswith(">"):
            end_para()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip()[1:].strip())
                i += 1
            out.append("<blockquote>" + inline(" ".join(quote), ctx) + "</blockquote>")
            continue
        if not s:
            end_para()
        else:
            para.append(s)
        i += 1
    end_para()
    return "\n".join(x for x in out if x)


def verdict(md):
    m = VERDICT.search(md or "")
    if not m:
        return ""
    v = m.group(1).upper()
    if v in ("RELEASED", "PARKED"):
        return v.lower()
    return "held" if v in ("HELD", "NOT REFUTED", "PASS") else "refuted"


PROFILE_FILE = re.compile(r"^(?P<lens>[a-z0-9-]+)-(?P<part>\d+)\.md$")
PLAN_FILE = re.compile(r"^plan-r(?P<round>\d+)\.md$")


def collect(repo):
    """[{id, title, status, report, reports: [{lens, round, kind, path, verdict}]}] for slices with any verification record.

    `report` is the slice's test completion report — `.sdlc/reports/<id>/REPORT.md`, or `.sdlc/slices/<id>/REPORT.md` for a pre-existing slice — when the test-reporter wrote one. `reports` are
    the per-round records: verification plans, profile evidence, the core verifiers' summaries, and older full reports.
    """
    sdlc = os.path.join(repo, ".sdlc")
    raw = read_json(os.path.join(sdlc, "slices.json"), [])
    known = {s["id"]: s for s in (raw if isinstance(raw, list) else raw.get("slices", [])) if s.get("id")}
    out = []
    for d in sorted(glob.glob(os.path.join(sdlc, "slices", "*"))):
        sid = os.path.basename(d)
        if not os.path.isdir(d):
            continue
        full = {}
        for p in glob.glob(os.path.join(d, "reports", "verify-*.md")):
            m = VERIFY.match(os.path.basename(p))
            if m:
                full[(m.group("lens"), int(m.group("round")))] = p
        reps = []
        for p in glob.glob(os.path.join(d, "verify-*.md")):
            m = VERIFY.match(os.path.basename(p))
            if m:
                key = (m.group("lens"), int(m.group("round")))
                if key not in full:
                    reps.append({"lens": key[0], "round": key[1], "kind": "summary", "path": p})
        reps += [{"lens": k[0], "round": k[1], "kind": "report", "path": p} for k, p in full.items()]
        for p in glob.glob(os.path.join(d, "verification", "plan-r*.md")):
            m = PLAN_FILE.match(os.path.basename(p))
            if m:
                reps.append({"lens": "plan", "round": int(m.group("round")), "kind": "plan", "path": p})
        for p in glob.glob(os.path.join(d, "verification", "r*", "*.md")):
            rd = re.match(r"^r(\d+)$", os.path.basename(os.path.dirname(p)))
            m = PROFILE_FILE.match(os.path.basename(p))
            if rd and m:
                part = int(m.group("part"))
                lens = m.group("lens") + ("#%d" % part if part else "")
                reps.append({"lens": lens, "round": int(rd.group(1)), "kind": "profile", "path": p})
        # the test-reporter writes .sdlc/reports/<id>/REPORT.md; a pre-existing slice may still have it
        # under the slice directory, so the old location stays readable
        report = os.path.join(sdlc, "reports", sid, "REPORT.md")
        if not os.path.isfile(report):
            report = os.path.join(d, "REPORT.md")
        report = report if os.path.isfile(report) else None
        if not reps and not report:
            continue
        for r in reps:
            r["verdict"] = "" if r["kind"] == "plan" else verdict(read(r["path"]))
        order = {"plan": 0, "summary": 1, "report": 1, "profile": 2}
        reps.sort(key=lambda r: (r["round"], order[r["kind"]], r["lens"]))
        s = known.get(sid, {})
        out.append({"id": sid, "title": s.get("title", ""), "status": s.get("status", ""), "report": report,
                    "verdict": verdict(read(report)) if report else "", "reports": reps})
    return out


def summary(slices):
    """The tracker's view: per slice, whether it has a test report, and the latest verdict per lens or profile."""
    out = []
    for s in slices:
        latest = {}
        for r in s["reports"]:
            if r["kind"] != "plan":
                latest[r["lens"]] = {"round": r["round"], "verdict": r["verdict"]}
        out.append({"id": s["id"], "title": s["title"], "status": s["status"], "lenses": latest,
                    "hasReport": bool(s["report"]), "verdict": s["verdict"],
                    "reports": len(s["reports"]) + (1 if s["report"] else 0),
                    "full": (1 if s["report"] else 0) + sum(1 for r in s["reports"] if r["kind"] == "report")})
    return out


def page(title, body, back=None):
    nav = '<p class="sub"><a href="%s">&larr; All test reports</a></p>' % back if back else ""
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            "<title>%s</title><style>%s</style></head><body><div class=\"wrap\">"
            "<header><h1>%s</h1>%s</header>%s</div></body></html>") % (esc(title), CSS, esc(title), nav, body)


def tag(v):
    return '<span class="tag %s">%s</span>' % (v, v if v in ("held", "refuted", "released", "parked") else "no verdict")


def build(repo, out):
    repo = os.path.abspath(repo)
    out = os.path.abspath(out)
    os.makedirs(out, exist_ok=True)
    slices = collect(repo)
    rows = []
    kinds = {"plan": "verification plan", "summary": "core verifier summary", "report": "full report (older format)", "profile": "profile evidence"}
    for s in slices:
        parts = []
        if s["report"]:
            ctx = {"repo": repo, "out": out, "md_dir": os.path.dirname(s["report"]), "seen": set(), "pending": []}
            rel = os.path.relpath(s["report"], out).replace(os.sep, "/")
            parts.append('<section class="card report" id="report"><p class="kind">Test completion report %s · <a href="%s">markdown</a></p>%s</section>'
                         % (tag(s["verdict"]), esc(rel), markdown(read(s["report"]) or "", ctx)))
        else:
            parts.append('<section class="card"><p class="muted">%s · status: %s. No test completion report yet: it is written when the slice '
                         'merges or is parked. The verification records so far are below.</p></section>' % (esc(s["title"]), esc(s["status"] or "unknown")))
        rounds = {}
        for r in s["reports"]:
            rounds.setdefault(r["round"], []).append(r)
        app = []
        for rd in sorted(rounds):
            items = []
            for r in rounds[rd]:
                anchor = "r%d-%s-%s" % (rd, r["kind"], re.sub(r"[^a-z0-9-]", "-", r["lens"]))
                ctx = {"repo": repo, "out": out, "md_dir": os.path.dirname(r["path"]), "seen": set(), "pending": []}
                rel = os.path.relpath(r["path"], out).replace(os.sep, "/")
                items.append('<details class="rec" id="%s"><summary><b>%s</b> %s <span class="kind">%s · <a href="%s">markdown</a></span></summary>%s</details>'
                             % (anchor, esc(r["lens"]), tag(r["verdict"]) if r["kind"] != "plan" else "", kinds[r["kind"]], esc(rel),
                                markdown(read(r["path"]) or "", ctx)))
            app.append('<h3>Round %d</h3>%s' % (rd, "".join(items)))
        if app:
            open_attr = "" if s["report"] else " open"
            parts.append('<section class="card"><details class="appendix"%s><summary><h2 style="display:inline">Verification rounds</h2> '
                         '<span class="kind">%d records</span></summary>%s</details></section>' % (open_attr, len(s["reports"]), "".join(app)))
        with open(os.path.join(out, s["id"] + ".html"), "w") as f:
            f.write(page("%s · %s" % (s["id"], s["title"]) if s["title"] else s["id"], "".join(parts), back="index.html"))
        latest = {}
        for r in s["reports"]:
            if r["kind"] != "plan":
                latest[r["lens"]] = r
        rows.append('<tr><td><a href="%s.html">%s</a></td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            esc(s["id"]), esc(s["id"]), esc(s["title"]), esc(s["status"]),
            tag(s["verdict"]) if s["report"] else '<span class="muted">not yet</span>',
            " ".join("%s r%d %s" % (esc(l), r["round"], tag(r["verdict"])) for l, r in sorted(latest.items()))))
    table = ('<table><thead><tr><th>Slice</th><th>Title</th><th>Status</th><th>Test report</th><th>Latest verdict per lens and profile</th>'
             '</tr></thead><tbody>%s</tbody></table>' % "".join(rows)) if rows else '<p class="muted">No verification records yet.</p>'
    intro = ('<p class="muted">One page per slice. The test completion report comes first: traceability, scenarios and cases with their '
             'evidence and test source, defects found on the way, and what was not tested. Every verification round follows as an appendix. '
             'Slices verified before these reports existed show their round records only.</p>')
    with open(os.path.join(out, "index.html"), "w") as f:
        f.write(page("Slice test reports", '<section class="card">%s%s</section>' % (intro, table)))
    return summary(slices)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=".")
    ap.add_argument("--out")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    if not os.path.isdir(os.path.join(repo, ".sdlc")):
        raise SystemExit(f"no .sdlc/ in {repo}: run /sdlc first")
    out = a.out or os.path.join(repo, ".sdlc", "tracker", "reports")
    build(repo, out)
    print(os.path.join(os.path.abspath(out), "index.html"))


if __name__ == "__main__":
    main()
