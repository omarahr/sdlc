#!/bin/sh
printf '%s|' "$(pwd -P)" >> "$CALL_LOG"
for a in "$@"; do printf '[%s]' "$a" >> "$CALL_LOG"; done
printf '\n' >> "$CALL_LOG"
[ -f "$CASE_DIR/stdout" ] && cat "$CASE_DIR/stdout"
[ -f "$CASE_DIR/stderr" ] && cat "$CASE_DIR/stderr" >&2
[ -f "$CASE_DIR/exit" ] && exit "$(cat "$CASE_DIR/exit")"
exit 0
