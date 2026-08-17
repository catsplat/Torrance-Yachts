#!/usr/bin/env bash
set -Eeuo pipefail

# Installs an intentionally narrow systemd timer only after the protected
# runtime environment has an encrypted backup destination. It never reads or
# prints secret values and can be rerun safely after a reviewed deployment.

usage() {
  cat <<'EOF'
Usage: sudo ./install-backup-schedule.sh <deployment-user> [deployment-path]

Example:
  sudo ./install-backup-schedule.sh torrance /opt/torrance-yachts
EOF
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage >&2
  exit 2
fi

deployment_user=$1
deployment_path=${2:-/opt/torrance-yachts}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer through sudo on the target VPS." >&2
  exit 2
fi

if ! id "$deployment_user" >/dev/null 2>&1; then
  echo "Deployment user must be an existing Linux account." >&2
  exit 2
fi

case "$deployment_path" in
  /*) ;;
  *) echo "Deployment path must be absolute." >&2; exit 2 ;;
esac

case "$deployment_user:$deployment_path" in
  *[!A-Za-z0-9._/:/-]*)
    echo "Deployment user and path may contain only safe systemd characters." >&2
    exit 2
    ;;
esac

environment_file="$deployment_path/.env"
template="$deployment_path/torrance-yachts-backup.service.template"
timer_source="$deployment_path/torrance-yachts-backup.timer"

for required in "$environment_file" "$deployment_path/backup-production.sh" "$template" "$timer_source"; do
  test -f "$required" || { echo "Required deployment file is missing: $required" >&2; exit 2; }
done

setting() {
  sed -n "s/^$1=//p" "$environment_file" | tail -n 1
}

environment=$(setting APP_ENVIRONMENT)
backup_directory=$(setting BACKUP_DIRECTORY)
backup_recipient=$(setting BACKUP_ENCRYPTION_RECIPIENT)
backup_remote=$(setting BACKUP_RCLONE_REMOTE)

case "$environment" in
  staging|production) ;;
  *) echo "APP_ENVIRONMENT must be staging or production before backups can be scheduled." >&2; exit 2 ;;
esac
test -n "$backup_directory" || { echo "BACKUP_DIRECTORY must be configured before backups can be scheduled." >&2; exit 2; }
test -n "$backup_recipient" || { echo "BACKUP_ENCRYPTION_RECIPIENT must be configured before backups can be scheduled." >&2; exit 2; }
if [ "$environment" = "production" ] && [ -z "$backup_remote" ]; then
  echo "BACKUP_RCLONE_REMOTE must be configured before production backups can be scheduled." >&2
  exit 2
fi

command -v age >/dev/null || { echo "Install age before enabling the backup timer." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required for the backup timer." >&2; exit 1; }
if [ "$environment" = "production" ]; then
  command -v rclone >/dev/null || { echo "Install rclone before enabling production backups." >&2; exit 1; }
fi

install -m 0644 "$template" /etc/systemd/system/torrance-yachts-backup.service.template
sed \
  -e "s|{{DEPLOYMENT_USER}}|$deployment_user|g" \
  -e "s|{{DEPLOYMENT_PATH}}|$deployment_path|g" \
  "$template" > /etc/systemd/system/torrance-yachts-backup.service
install -m 0644 "$timer_source" /etc/systemd/system/torrance-yachts-backup.timer

systemctl daemon-reload
systemctl enable --now torrance-yachts-backup.timer
systemctl is-enabled --quiet torrance-yachts-backup.timer
systemctl is-active --quiet torrance-yachts-backup.timer

echo "Encrypted backup timer is enabled. Verify with: systemctl list-timers torrance-yachts-backup.timer"
