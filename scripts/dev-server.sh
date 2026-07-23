#!/usr/bin/env bash
# Detached local Vite/workerd manager so the process outlives agent shells.
# Humans who want an attached terminal should keep using: npm run dev
# shellcheck shell=bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${ROOT}/.dev-server.pid"
LOG_FILE="${ROOT}/.dev-server.log"
PORT="${DEV_SERVER_PORT:-5173}"
PORT_LO="${DEV_SERVER_PORT_LO:-5173}"
PORT_HI="${DEV_SERVER_PORT_HI:-5180}"
HEALTH_URL="http://localhost:${PORT}/"
API_HEALTH_URL="http://localhost:${PORT}/api/health"
START_TIMEOUT_SEC="${DEV_SERVER_START_TIMEOUT:-60}"

log() { echo "==> $*"; }
ok() { echo "    $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

print_agent_hints() {
  cat <<EOF

Agents (prefer these so the server survives shell reaping):
  Status:   npm run dev:status
  Logs:     npm run dev:logs
  Restart:  npm run dev:restart
  Stop:     npm run dev:stop
  Log file: ${LOG_FILE}
  URL:      ${HEALTH_URL}

Humans wanting an attached terminal: npm run dev
EOF
}

pid_alive() {
  local pid="${1:-}"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

read_pid() {
  if [[ -f "${PID_FILE}" ]]; then
    tr -d '[:space:]' < "${PID_FILE}"
  fi
}

curl_ok() {
  local url="$1"
  curl -sf -o /dev/null --connect-timeout 2 --max-time 3 "${url}" 2>/dev/null
}

is_healthy() {
  curl_ok "${HEALTH_URL}" || return 1
  # Worker route confirms Cloudflare Vite plugin / workerd is up.
  curl_ok "${API_HEALTH_URL}" || return 1
  return 0
}

process_cwd() {
  local pid="$1"
  lsof -a -p "${pid}" -d cwd -Fn 2>/dev/null | awk '/^n/ { print substr($0, 2); exit }'
}

belongs_to_repo() {
  local pid="$1"
  local cwd cmd
  cwd="$(process_cwd "${pid}" || true)"
  cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ -z "${cmd}" && -z "${cwd}" ]] && return 1
  [[ "${cwd}" == "${ROOT}" || "${cwd}" == "${ROOT}/"* ]] && return 0
  [[ "${cmd}" == *"${ROOT}"* ]] && return 0
  return 1
}

kill_tree() {
  local pid="$1"
  local child
  # Children first so we do not leave orphans.
  while read -r child; do
    [[ -n "${child}" ]] || continue
    kill_tree "${child}"
  done < <(pgrep -P "${pid}" 2>/dev/null || true)
  if pid_alive "${pid}"; then
    kill -TERM "${pid}" 2>/dev/null || true
  fi
}

wait_dead() {
  local pid="$1"
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    pid_alive "${pid}" || return 0
    sleep 0.2
  done
  if pid_alive "${pid}"; then
    kill -KILL "${pid}" 2>/dev/null || true
  fi
}

sweep_project_listeners() {
  local port pid
  for port in $(seq "${PORT_LO}" "${PORT_HI}"); do
    while read -r pid; do
      [[ -n "${pid}" ]] || continue
      if belongs_to_repo "${pid}"; then
        ok "Stopping project listener pid ${pid} on :${port}"
        kill_tree "${pid}"
        wait_dead "${pid}"
      fi
    done < <(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)
  done

  # Stray vite/workerd still rooted in this checkout (not always holding LISTEN yet).
  local pid cmd
  while read -r pid; do
    [[ -n "${pid}" ]] || continue
    cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    case "${cmd}" in
      *vite*|*workerd*|*@cloudflare/vite-plugin*)
        if belongs_to_repo "${pid}"; then
          ok "Stopping stray project process pid ${pid}"
          kill_tree "${pid}"
          wait_dead "${pid}"
        fi
        ;;
    esac
  done < <(pgrep -f "vite|workerd" 2>/dev/null || true)
}

cmd_stop() {
  local pid
  pid="$(read_pid || true)"
  if pid_alive "${pid}"; then
    log "Stopping managed dev server (pid ${pid})"
    kill_tree "${pid}"
    wait_dead "${pid}"
  elif [[ -n "${pid}" ]]; then
    ok "Stale PID file (pid ${pid} not running)"
  else
    ok "No PID file"
  fi
  sweep_project_listeners
  rm -f "${PID_FILE}"
  log "Stopped"
}

wait_healthy() {
  local i
  for ((i = 1; i <= START_TIMEOUT_SEC; i++)); do
    if is_healthy; then
      return 0
    fi
    if [[ -f "${PID_FILE}" ]]; then
      local pid
      pid="$(read_pid || true)"
      if ! pid_alive "${pid}"; then
        echo "ERROR: process exited before becoming healthy. Last log lines:" >&2
        tail -n 40 "${LOG_FILE}" 2>/dev/null || true
        return 1
      fi
    fi
    sleep 1
  done
  echo "ERROR: timed out after ${START_TIMEOUT_SEC}s waiting for ${HEALTH_URL}. Last log lines:" >&2
  tail -n 40 "${LOG_FILE}" 2>/dev/null || true
  return 1
}

cmd_start() {
  local pid
  pid="$(read_pid || true)"
  if pid_alive "${pid}" && is_healthy; then
    log "Already running and healthy (pid ${pid})"
    ok "URL: ${HEALTH_URL}"
    print_agent_hints
    return 0
  fi

  if pid_alive "${pid}" && ! is_healthy; then
    log "PID ${pid} alive but not healthy — restarting"
    cmd_stop
  elif [[ -n "${pid}" ]] && ! pid_alive "${pid}"; then
    ok "Removing stale PID file"
    rm -f "${PID_FILE}"
  fi

  # Avoid stacking if an unmanaged project server is already up.
  if is_healthy; then
    log "Port already healthy at ${HEALTH_URL} (unmanaged) — leaving it"
    print_agent_hints
    return 0
  fi

  # Clear any half-dead project listeners before bind.
  sweep_project_listeners

  cd "${ROOT}"
  : > "${LOG_FILE}"
  log "Starting detached: npm run dev"
  ok "Log: ${LOG_FILE}"

  # nohup + stdin closed: survives SIGHUP when agent shells are reaped.
  # Prefer unsandboxed agent shells (sandbox can fail uv_interface_addresses).
  nohup npm run dev >>"${LOG_FILE}" 2>&1 </dev/null &
  pid=$!
  echo "${pid}" > "${PID_FILE}"
  ok "PID ${pid} written to ${PID_FILE}"

  if ! wait_healthy; then
    cmd_stop || true
    die "Dev server failed to become healthy"
  fi

  log "Ready"
  ok "URL: ${HEALTH_URL}"
  ok "API: ${API_HEALTH_URL}"
  print_agent_hints
}

cmd_restart() {
  log "Restarting detached dev server"
  cmd_stop
  cmd_start
}

cmd_status() {
  local pid
  pid="$(read_pid || true)"
  if pid_alive "${pid}"; then
    ok "PID file: ${pid} (alive)"
  elif [[ -n "${pid}" ]]; then
    ok "PID file: ${pid} (dead/stale)"
  else
    ok "PID file: (none)"
  fi

  if is_healthy; then
    log "Healthy"
    ok "URL: ${HEALTH_URL}"
    ok "API: ${API_HEALTH_URL}"
    print_agent_hints
    return 0
  fi

  log "Not healthy"
  ok "URL check failed: ${HEALTH_URL}"
  print_agent_hints
  return 1
}

cmd_logs() {
  local lines=80
  local follow=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--follow) follow=1; shift ;;
      -n|--lines)
        lines="${2:-80}"
        shift 2
        ;;
      [0-9]*)
        lines="$1"
        shift
        ;;
      *)
        die "Unknown logs option: $1 (use: npm run dev:logs [-- -f] or [-- -n 200])"
        ;;
    esac
  done

  if [[ ! -f "${LOG_FILE}" ]]; then
    die "No log file yet at ${LOG_FILE} (run npm run dev:start first)"
  fi

  if [[ "${follow}" -eq 1 ]]; then
    tail -n "${lines}" -F "${LOG_FILE}"
  else
    tail -n "${lines}" "${LOG_FILE}"
  fi
}

usage() {
  cat <<EOF
Usage: bash scripts/dev-server.sh <start|stop|restart|status|logs>

  start     Detach npm run dev (nohup), wait until healthy, exit 0 if already up
  stop      Stop managed PID + project vite/workerd on :${PORT_LO}-${PORT_HI}
  restart   stop then start
  status    PID + HTTP health (${HEALTH_URL}, ${API_HEALTH_URL})
  logs      Tail ${LOG_FILE} (logs -f to follow; logs -n 200 for more lines)

npm: dev:start | dev:stop | dev:restart | dev:status | dev:logs
Foreground (human): npm run dev
EOF
}

main() {
  local action="${1:-}"
  shift || true
  case "${action}" in
    start) cmd_start "$@" ;;
    stop) cmd_stop "$@" ;;
    restart) cmd_restart "$@" ;;
    status) cmd_status "$@" ;;
    logs) cmd_logs "$@" ;;
    -h|--help|help|"") usage; [[ -n "${action}" ]] || exit 1 ;;
    *) die "Unknown action: ${action} (try --help)" ;;
  esac
}

main "$@"
