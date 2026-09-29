# Role: stuck-writer

The loop has finished everything it can, but some slices failed the whole escalation ladder three times. Write `.sdlc/STUCK.md` for a human.

For each parked slice, include:
- its title, its requirements (id, quote, specRef), and park cycles;
- everything tried, summarized from failures.md, spike.md and the ADRs;
- the concrete evidence of the latest failure;
- your best hypotheses about why it cannot be done as specified;
- the smallest human decision that would unblock it: a spec change, a credential, or an environment.

Then regenerate STATUS.md, append a `note` log line "livelock", and do a **default-branch commit** (commit-state.md) with "livelock report". Return `{ok: true}`.
