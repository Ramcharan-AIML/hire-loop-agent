#!/usr/bin/env bash
# Smoke test for the platform's Python services (plan Phase 3).
# Hits both /healthz endpoints and reports health. Exit non-zero if either fails.
set -u

JOB_AGENT_URL="${JOB_AGENT_URL:-http://localhost:8000}"
COLD_MAIL_URL="${COLD_MAIL_URL:-http://localhost:8001}"

check() {
  local name="$1" url="$2"
  if curl -fsS --max-time 5 "$url/healthz" >/dev/null 2>&1; then
    echo "OK   $name  ($url/healthz)"
    return 0
  else
    echo "FAIL $name  ($url/healthz)"
    return 1
  fi
}

rc=0
check "job-agent" "$JOB_AGENT_URL" || rc=1
check "cold-mail" "$COLD_MAIL_URL" || rc=1

if [ "$rc" -eq 0 ]; then
  echo "All services healthy."
else
  echo "One or more services are unhealthy."
fi
exit "$rc"
