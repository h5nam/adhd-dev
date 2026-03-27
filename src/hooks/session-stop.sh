#!/bin/bash
# ADHD-Dev session stop hook (~5ms execution)
SOCKET="$HOME/.adhd-dev/adhd-dev.sock"
EVENT='{"type":"event","data":{"event":"session-stop","cwd":"'$(pwd)'","timestamp":'$(date +%s000)'}}'
if [ -S "$SOCKET" ]; then
  echo "$EVENT" | nc -U -w1 "$SOCKET" 2>/dev/null
else
  echo "$EVENT" >> "$HOME/.adhd-dev/events.jsonl" 2>/dev/null
fi
