
## Fix round 1
- [security] VS-2 refuted: branchName passed the tail to String.replace as a replacement string. The tails `$&`, `$$`, `` $` `` and `$'` were rewritten.
- Fix: branchName now passes a replacer function. The tail goes in literally.
- [profiles] and [contract] items hold. Their two seeds are the same defect and are now fixed.
