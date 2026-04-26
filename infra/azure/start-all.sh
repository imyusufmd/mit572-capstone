#!/usr/bin/env bash
# Start all VMs (use when you want to work on the project).
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

for VM in "$VM1_NAME" "$VM2_NAME" "$VM3_NAME" "$VM4_NAME"; do
  if az vm show -g "$RG" -n "$VM" >/dev/null 2>&1; then
    info "Starting $VM"
    az vm start -g "$RG" -n "$VM" --no-wait
  fi
done

info "Start commands issued. Check status in ~1 min: ./status.sh"
