#!/usr/bin/env bash
# Deallocate all VMs (stops billing for compute — still pay a tiny amount for disks).
# Run this every time you finish working to preserve your $100 credit.
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

for VM in "$VM1_NAME" "$VM2_NAME" "$VM3_NAME" "$VM4_NAME"; do
  if az vm show -g "$RG" -n "$VM" >/dev/null 2>&1; then
    info "Deallocating $VM"
    az vm deallocate -g "$RG" -n "$VM" --no-wait
  fi
done

info "All VMs stopping. Compute billing paused once 'VM deallocated' state is reached."
