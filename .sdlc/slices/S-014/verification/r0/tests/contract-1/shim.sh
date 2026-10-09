#!/bin/sh
d="$SHIM_DIR"
n=$(cat "$d/n" 2>/dev/null || echo 0)
n=$((n + 1))
echo "$n" > "$d/n"
printf '%s\n' "$GH_PROMPT_DISABLED" >> "$d/prompt-env"
s="$d/$n"
[ -d "$s" ] || s="$d/last"
cat "$s/stdout"
cat "$s/stderr" >&2
exit "$(cat "$s/exit")"
