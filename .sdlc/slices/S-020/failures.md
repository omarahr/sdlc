
## Fix round 1
- [security] VS-2 refuted: branchName passed the tail to String.replace as a replacement string. The tails `$&`, `$$`, `` $` `` and `$'` were rewritten.
- Fix: branchName now passes a replacer function. The tail goes in literally.
- [profiles] and [contract] items hold. Their two seeds are the same defect and are now fixed.

## Fix round 2
- [review] T-R-101 duplicated T-R-021a and T-R-021b. Delete T-R-101. Drop the null half of T-R-118.
- [review] The empty `branchFormat` test was not promoted. It is now part of T-R-050a.
