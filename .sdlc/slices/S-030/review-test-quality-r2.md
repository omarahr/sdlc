# Review S-030, lens test-quality, round 2

Blocking: T-R-141a duplicates the derive assertions of T-R-123a, T-R-124a and T-R-125a. T-R-042f also pins the three table formats.
Delete T-R-141a. Keep the derive calls in T-R-123a to T-R-125a, or keep T-R-141a and drop them there. Update tests.md.

Not blocking:
- T-R-141b mostly repeats T-R-042c and T-R-042f. Only the negated ends_with and contains cases are new.
- T-R-124a and T-R-125a repeat T-R-042b with other literals. They pin the acceptance text.
- The diff adds a double blank line before T-R-123a and leaves no blank line before T-R-087a.
- Verifier corner "my team/" (prefix with space is not derivable) is not in a committed test. Consider promoting it.
- The code and tests carry no comments. Tests are deterministic. No nested suite run.
