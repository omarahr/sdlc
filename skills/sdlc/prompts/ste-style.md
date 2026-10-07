# STE style rules

Every prompt and every report follows the ASD-STE100 simplified English rules. The script `ste-check.py` checks these rules; the linter fails a file that breaks them. Reword the file until it passes.

## Sentences

- Write at most 20 words per sentence.
- Write one instruction per sentence.
- Write in the active voice.
- Write instructions in the imperative mood: `Run the tests.`
- Do not ask rhetorical questions. State the rule instead.
- Do not use idioms, humor, hyperbole or emphasis.

## Words

- Do not use `please`, `simply`, `just`, `obviously`, `of course`, `nice`, `great`, `keep in mind` or `make sure`.
- Do not use the exclamation mark.
- Do not write a word in capital letters only. Acronyms are technical names: `STE` and `ADR` are permitted.
- One word, one meaning: do not use one word as a noun and as a verb.
- Do not use two words for one thing. Use the same term for the same thing everywhere.

## Procedural verbs

- `check` means verify with evidence. `confirm` means read a result.
- Use one of these verbs for a procedure: `read`, `run`, `check`, `confirm`, `record`, `commit`, `delete`.

## Technical names

- Technical nouns are permitted: tool names, file formats, units and product names.

## Code and placeholders

- Put commands, code and literal file names in backticks. The linter skips backticked text.
- Write a placeholder in angle brackets: `<skill>`, `<n>`, `<id>`. A placeholder stands for one word.
