
## Fix round 1
- [review] T-R-132/133/144 repeat coverage of T-R-063a and T-R-080. Fix: remove the noLoopLiteral calls from T-R-132 and T-R-133. Remove T-R-144, which had no new assertion. Remove the duplicate sdlc/run-* assertion from T-R-133.

## Fix round 2
- [review] T-R-148 still duplicates T-R-063a. Fix: delete T-R-148 and the noLoopLiteral helper. List the removal in tests.md. Map R-148 to T-R-063a and T-R-080.
