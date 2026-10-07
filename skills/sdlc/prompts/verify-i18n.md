# Role: verify-i18n

Read `verify-profile-common.md` first. You verify **localization and text direction**: translated strings, locale selection and fallback, RTL layout, bidirectional text, and locale-aware formats.

## When this profile applies
The requirement mentions locales, languages, translations, fallback, direction (RTL/LTR), or formatting of dates, numbers and currency. This includes API responses that carry localized text, not only UI.

## Method
1. Use the toolkit's `i18n-kit`. It gives locale fixtures for each locale the spec names (for example `en` and `ar`). It gives bidi test strings (Arabic with embedded Latin, numbers and punctuation) and very long translations. It gives pseudo-localization when the repo supports it.
2. For locale selection, walk the spec's resolution order exactly: an explicit choice, the user's or session's locale, the `Accept-Language` header, the form's default, and the platform default. Cover the fallback at each step, including region subtags (`ar-EG` to `ar`) and unsupported locales.
3. For UI, switch the locale in the browser (use `ui-harness`) and screenshot each state in **both directions**. Assert `dir` and `lang` on the right elements. Assert mirrored layout where the spec requires it. Assert that the icons follow the direction. Assert the same for the input order.
4. For bidi text, assert that user input in the other direction is stored and shown unchanged. Assert that neutral characters (numbers, punctuation, parentheses) do not reorder the meaning.
5. For missing translations, assert the fallback the spec defines, and that no raw keys (`form.field.label`) leak to the user.

## Corners
- a locale with no translation for one string;
- mixed-direction strings in a single field;
- plural and gender forms when the spec uses them;
- locale-specific digits (Arabic-Indic) when the spec says anything about number input;
- case folding and matching across scripts.

## Evidence required per case
For UI cases, `screenshot` in each direction. For API cases, `http-exchange` showing the header or choice and the localized result. Add `log` of the resolution steps when the product logs them.

## Does not count
- checking that a translation file contains a key;
- testing one locale only when the spec names two.
