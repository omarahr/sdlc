# Scrollable workflow card — report

Branch `feat/scrollable-workflow-card`. Touched: `skills/sdlc/tracker/template.html` and
`skills/sdlc/test/tracker.test.mjs`. Nothing else.

## The shape I chose, and why

```
details.collapse                      <- wfSlot, the slot the card lives in (collapsed by default)
  summary
  div.collapse-body
    div.wf-scroll                     <- NEW: the capped box, built once per page
      section.card.wf                 <- what every redraw replaces
        .wf-head
        .wf-body (grid 200px | 1fr)
          .wf-phases                  <- the rail
          .wf-agents                  <- h3 + the agent rows
        .wf-foot                      <- the follow button
        details.wf-earlier
```

```css
.wf-scroll { max-height: min(440px, 60vh); overflow-y: auto; overflow-x: hidden; }
```

The box **wraps** the card; it is not inside it. That is forced by the redraw: `drawWorkflow` does
`wfScroll.replaceChildren(workflowCard(...))` every couple of seconds, so any scroller inside the card
would be thrown away with it and the list would snap to the top every time. The box is built once, in
`render()`, and only its *children* are replaced, so its scroll position is the one thing that survives.

The consequence, stated plainly: **the cap covers the whole card**, not the agent list alone — the head,
the rail, the foot and the "earlier runs" list scroll with it. Capping only `.wf-agents` would have meant
putting the scroller inside the replaced subtree, which is precisely the thing that does not work. The
card is one atomic node built by `workflowCard()`, and splitting it into a persistent shell plus a
redrawn interior would have been the tracker refactor this task rules out. One scroll region for the
whole card is the smallest structure that satisfies the constraint.

`max-height`, not `height`, so a run with two agents does not get 440px of empty box (a mutation test
below pins this). `min(440px, 60vh)` so a short window — or a phone in landscape — caps lower rather
than pushing the rest of the page off screen. `overflow-x: hidden` so the box never grows a sideways
scrollbar; nothing inside it can overflow horizontally anyway (`.wf-agent .lbl` ellipsizes, the grid
column is `minmax(0, 1fr)`).

## The phase rail

It shares the box. That was a choice, not an accident: the rail and the list are two columns of one
grid inside one card, so they cannot have independent scrollers that survive a redraw. It is also the
right height budget — the rail is bounded by the phase list (15 in a real run, plus any phase only an
agent mentioned), so it was never the thing growing without bound. The thing that grows is the agent
list, and it grows *inside* the rail's column, which is now capped.

The rail still tells you which phase is selected when you are scrolled down, because it is the left
column of the card and stays put relative to the list. What you lose by scrolling is the `.wf-head`
summary line and the "Follow the live phase" button, both of which sit outside the capped region of
useful attention once you are deep in the list. I considered making the head or the phase heading
`position: sticky` and decided against it: the phase is already named by the selected row in the rail,
and sticky positioning inside a card that is rebuilt every two seconds is a thing to earn, not to add
to a layout change.

## The paths I checked

**Follow the live phase** (`.wf-foot`, was line ~560). Clicking it sets `sel = auto` and redraws the
card's own body — `left`/`right`/`foot` are emptied and refilled, so the new list can be a different
length and the box can be left scrolled past the end of it. Both handlers that change the selection
(the rail click and the follow click) now end with `revealWorkflow()`, which sets the box's
`scrollTop = 0`. Click Follow from halfway down a long list and you land at the top of the box with the
live phase's heading and its first agents in view. No smooth scrolling anywhere, so nothing to guard
behind `prefers-reduced-motion`.

The automatic path (a new agent starts, so `auto` moves) deliberately does **not** reveal — that is
the every-two-seconds case, and revealing there is the bug this task is about.

**Focus after a redraw** (`next.focus()`, was line ~599). Focusing an element scrolls its nearest
scrollable ancestor, which is now the box rather than the window. That is right on its own — the box
reveals the control — but the case that matters is a person who has tabbed/clicked a phase and then
wheeled down the agent list: the rail has scrolled out of the box, and a plain `focus()` would drag
the box back up to it every two seconds, losing the reading position. So the call is now
`next.focus({ preventScroll: true })`: the focus goes back where it was, and nothing moves. The page
also no longer yanks itself back to the card when the card is off screen, which I judged to be the
wrong behaviour for a background redraw — flagging it in case you disagree, it is a one-word revert.

**The clocks** (`tickClocks`). Unaffected: it looks up `.wf-agent.running[data-start]` inside `wfSlot`,
which is an ancestor of the box, and writes to each row's `.time`. It never read or wrote scroll state.
Pinned by a test that drives the real 2s poll with a fake clock.

**The 720px breakpoint.** The box is outside `.wf-body`, so stacking the columns does not touch it. In
the stacked layout the card is simply taller (rail above list), so the same cap bites sooner — verified
in a real browser at 700px, screenshot below. I left the cap alone there: no override.

**The collapsed state.** `collapse("Agents in this run", ...)` opens closed, so in the default state
there is nothing to scroll and nothing changes. Opening it puts the capped box inside a `<details>`
body; the summary and its Show/Hide toggle are outside the box and stay put. Nothing fights.

## What I changed

`template.html`, four edits:

- the `.wf-scroll` rule, with a comment saying why it wraps the card;
- `workflowCard(wf, paused)` → `workflowCard(wf, paused, reveal)`; the rail click and the follow click
  call `reveal()` after `draw()`;
- `let wfSlot, wfBody` → `let wfSlot, wfScroll`, plus `revealWorkflow()`; `drawWorkflow` replaces
  `wfScroll`'s children and focuses with `preventScroll`;
- `render()` builds the box once and puts it inside the collapse body.

`tracker.test.mjs`, five tests plus a ~120-line fake DOM (the file's existing style is source/regex
assertions and running the page's own code in a `vm`; the fake DOM is what makes the scroll behaviour
testable instead of assertable-on-paper).

## Tests

```
$ npm test
ℹ tests 318
ℹ pass 318
ℹ fail 0
```

Before/after for each new test, against `HEAD:skills/sdlc/tracker/template.html` (before) and the working
copy (after):

| test | before | after |
|---|---|---|
| the workflow card is drawn into a bounded scroll box that a redraw does not replace | ✖ `AssertionError: the card is drawn into a scroll box of its own` | ✔ |
| picking a phase and following the live phase bring that phase into view | ✖ `TypeError: Cannot read properties of null (reading 'querySelector')` | ✔ |
| the running agents' clocks still tick between redraws, inside the box | ✖ same `TypeError` | ✔ |
| a redraw puts the focus back on the same control without moving the page or the list | ✖ `TypeError: … (reading 'querySelectorAll')` | ✔ |
| the scroll box is capped and scrolls, and only the slot ever builds it | ✖ `AssertionError: .wf-scroll has a rule of its own` | ✔ |

Honest caveat: the first three fail *at their first line* on the old template, because there is no
`.wf-scroll` element to look at — the failure is a missing box, not the specific behaviour inside the
test. So I did not stop there. Four mutations of the new template, each reverted after:

| mutation | what fails |
|---|---|
| A `focus()` instead of `focus({ preventScroll: true })` | only the focus test |
| B drop `reveal()` from the follow handler | only the follow test |
| C move the box inside the card `workflowCard` returns (the naive structure) | all five |
| D `height:` instead of `max-height:` on the box | only the CSS test |

Each assertion bites its own defect. The clock test's ticking assertion is the one that passes both
before and after — it is there to prove the container did not break ticking, which is what was asked.

What the tests actually pin: the box exists, is a different node from the card, wraps it, and is the
*same node* after a redraw while its card is a new one, with its scroll position intact; the follow
button appears once a phase is pinned, is gone after following, and both paths bring the box back to
the top; the clock still ticks across a redraw with the scroll position kept; the focus lands back on
the same control with `preventScroll`; and the CSS rule is a maximum, not a fixed height.

The existing suite is untouched otherwise — the collector tests, the live-decision tests and the
`</script>` count all still pass.

## Checked in a real browser

Headless Chrome on a page built from the template with 41 agents in one phase, card opened. At 1280px
the card is capped and scrolls, and the three summary cards below it are on the same screen; before the
change the list ran off the bottom of the viewport. At 700px (stacked) the box still caps and scrolls.
Screenshots: `/tmp/wfprev/wide.png`, `/tmp/wfprev/narrow.png`, before `/tmp/wfprev/orig-1280.png`,
`/tmp/wfprev/orig-700.png`.

## Not fixed, reported

1. **`docs/example-tracker.html` is now stale.** It is a generated mirror of the template and I left it
   alone per the scope rule. Regenerate with
   `OUT=$(mktemp -d) && python3 skills/sdlc/tracker/collect.py --data docs/example-tracker.json --out $OUT && cp $OUT/index.html docs/example-tracker.html`
   — I checked, and the diff is exactly this change and nothing else (42 lines). Worth folding into
   this PR; the README links the published copy.
2. **Focus is lost when Follow is clicked.** Following removes the follow button, so the browser drops
   focus to the body and the next redraw has nothing to restore. That is pre-existing and unchanged by
   this work; with `preventScroll` it is now only a focus issue, not a scroll jump.
3. **A horizontal scrollbar on the page at narrow widths** (visible in both before and after
   screenshots) — almost certainly the pace chart's `min-width: 520px`, not this card. Untouched.

## One thing about the working copy

`skills/sdlc/sdlc-loop.js` had uncommitted changes (a milestone-scoped agent cap: `milestoneSpent`,
`hasHeadroom` measuring against it) when I started committing — mtime 17:48, mid-session. It is not
mine and it is **not** in my commit. I confirmed the test suite does not write that file (hashed it
across a full `npm test`: unchanged), so it is your or another session's work in the shared tree.
Whoever commits it should know it is there.
