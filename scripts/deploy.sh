#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
cd "${PROJECT_ROOT}"

CONFIG_FILE=${1:-${PROJECT_ROOT}/deploy.config.json}
if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "❌ Deploy config not found: ${CONFIG_FILE}" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python3 is required to parse the deploy config" >&2
  exit 1
fi

if ! command -v scp >/dev/null 2>&1; then
  echo "❌ scp is required for deployment" >&2
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "❌ ssh is required for deployment" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "❌ bun must be installed on the local machine" >&2
  exit 1
fi

CONFIG_EXPORTS=$(python3 - "$CONFIG_FILE" <<'PY'
import json
import shlex
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
with config_path.open('r', encoding='utf-8') as fh:
  config = json.load(fh)

required_fields = ['host', 'user', 'deployPath']
for field in required_fields:
  value = config.get(field)
  if not value:
    raise SystemExit(f'Missing required field `{field}` in {config_path}')

host = str(config['host'])
user = str(config['user'])
port = config.get('port', 22)
service = config.get('serviceName', 'my-weibo')
deploy_path = str(config['deployPath'])
archive_dir = config.get('archiveDir', 'build/deploy')
post_commands = config.get('postDeployCommands') or []

print(f"HOST={shlex.quote(host)}")
print(f"USER={shlex.quote(user)}")
print(f"PORT={shlex.quote(str(port))}")
print(f"SERVICE_NAME={shlex.quote(str(service))}")
print(f"DEPLOY_PATH={shlex.quote(deploy_path)}")
print(f"ARCHIVE_DIR={shlex.quote(str(archive_dir))}")
print('POST_DEPLOY_COMMANDS=(')
for command in post_commands:
  print(f"  {shlex.quote(command)}")
print(')')
PY
)

eval "${CONFIG_EXPORTS}"

mkdir -p "${ARCHIVE_DIR}"

ARCHIVE_EXCLUDE=${ARCHIVE_DIR}
if [[ "${ARCHIVE_EXCLUDE}" == ${PROJECT_ROOT}/* ]]; then
  ARCHIVE_EXCLUDE=${ARCHIVE_EXCLUDE#${PROJECT_ROOT}/}
fi

echo "📦 Installing dependencies and building project"
bun install
bun run build

TIMESTAMP=$(date +%Y%m%d%H%M%S)
ARCHIVE_NAME="${SERVICE_NAME}-${TIMESTAMP}.tar.gz"
LOCAL_ARCHIVE_PATH="${ARCHIVE_DIR}/${ARCHIVE_NAME}"
REMOTE_ARCHIVE_PATH="/tmp/${ARCHIVE_NAME}"

echo "🗜️ Creating deployment archive ${LOCAL_ARCHIVE_PATH}"
tar -czf "${LOCAL_ARCHIVE_PATH}" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude="${ARCHIVE_EXCLUDE}" \
  .

SCP_ARGS=(-q)
SSH_ARGS=()
if [[ -n "${PORT}" ]]; then
  SCP_ARGS+=(-P "${PORT}")
  SSH_ARGS+=(-p "${PORT}")
fi

echo "🚀 Uploading archive to ${USER}@${HOST}:${REMOTE_ARCHIVE_PATH}"
scp "${SCP_ARGS[@]}" "${LOCAL_ARCHIVE_PATH}" "${USER}@${HOST}:${REMOTE_ARCHIVE_PATH}"

REMOTE_SCRIPT="set -e\n"
REMOTE_SCRIPT+="mkdir -p ${DEPLOY_PATH@Q}\n"
REMOTE_SCRIPT+="tar -xzf ${REMOTE_ARCHIVE_PATH@Q} -C ${DEPLOY_PATH@Q} --strip-components=1\n"
REMOTE_SCRIPT+="rm -f ${REMOTE_ARCHIVE_PATH@Q}\n"

if [[ ${#POST_DEPLOY_COMMANDS[@]} -gt 0 ]]; then
  REMOTE_SCRIPT+="cd ${DEPLOY_PATH@Q}\n"
  for cmd in "${POST_DEPLOY_COMMANDS[@]}"; do
    REMOTE_SCRIPT+="${cmd}\n"
  done
fi

echo "🔧 Running remote deployment steps"
ssh "${SSH_ARGS[@]}" "${USER}@${HOST}" "${REMOTE_SCRIPT}"

echo "✅ Deployment finished"
