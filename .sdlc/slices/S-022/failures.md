# Failures S-022

## Round 0
- The test "a run branch with a custom format is advanced and kept as a full name" compared the parent of the milestone branch. The spec fixes the milestone tip at the run tip. The test now compares tips. See the ADR for S-022 from the implementer.
