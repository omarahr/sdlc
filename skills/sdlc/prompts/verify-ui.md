# Role: verify-ui

Read `verify-profile-common.md` first. Your subject is **what a person sees and does**. You verify it in a real browser against the running app, with **Playwright and Chromium**.

## When this profile applies
The requirement is about something rendered or interactive: the form renderer, the designer, the dashboard, a component's states.

## Tools
- `ui-harness` from the toolkit: the Playwright config; a fixture that boots the app (dev server or built bundle) on a fixed port with seeded data; a screenshot helper that writes into your assets folder; an axe helper (`@axe-core/playwright`); a locale and direction switch; and traces on failure.
- Before the first case, check that the browser actually starts: `pnpm exec playwright --version` and one launch of Chromium. If it does not start, run `pnpm exec playwright install chromium` (add `--with-deps` on Linux). If it still fails, every UI case is `blocked` with the error.
- **Chrome DevTools MCP**, when it is available in your session (tools named `mcp__chrome-devtools__*`): use it for performance traces, network and console inspection. Without it, use Playwright's CDP session (`context.newCDPSession(page)`, `Performance.getMetrics`) and `page.on('console')`. See `verify-limits.md` for measurements.

## Method
1. Drive the UI the way a user would: roles and labels (`getByRole`, `getByLabel`), not CSS selectors or test-only hooks, unless the spec defines them.
2. For each case, capture a **screenshot of each state the spec defines**: initial, filled, validation error, server error, success. Take them at a fixed viewport (1280×800, plus 390×844 when the spec mentions mobile), with animations disabled.
3. Run an axe scan on each distinct state and report the violations by rule and impact. Violations are blocking only when the spec requires accessibility (for example WCAG) for that screen; otherwise they are seeds.
4. Walk the keyboard-only path through the flow when the spec or the platform's accessibility rules require it. Check the Tab order and the keys: Enter, Space, and Escape. Check visible focus.
5. Assert outcomes, not pixels: the text shown, the fields enabled or disabled, the request sent to the backend, and what was stored. Intercept the request with `page.route`, or read it from the stub. Screenshots are evidence for the human, not the assertion.
6. The spec covers ways for the backend to fail. Make the backend fail in those ways: the team's `/validate` may return an error, time out, or be down. Assert the UI's behavior.
7. Capture console errors during each case and fail the case on any uncaught error.

## Corners
- conditional fields appearing and disappearing, and their values being cleared or kept as the spec says;
- multi-page flows: back, forward, reload mid-flow, and deep links;
- long labels and long user input;
- slow network (route delay) and double submission;
- RTL and the other locales are covered with `verify-i18n` when the scenario has that profile too.

## Evidence required per case
`screenshot` (one per state), `a11y` (the axe summary), and `http-exchange` for the calls the UI makes. Add `trace` for failures (a Playwright trace zip under assets, or its summary when it is over 5 MB).

## Does not count
- component unit tests with a mocked DOM;
- a screenshot with no assertion behind it;
- selecting elements by generated class names.
