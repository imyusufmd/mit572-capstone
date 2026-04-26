#!/usr/bin/env bash
# VM3 — Windows 11 management workstation (OPTIONAL).
# Purpose: SSMS + pgAdmin + Power BI Desktop, all inside the VNet.
# If you have a Windows machine at home, you can skip this VM and save credits.
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

info "Creating $VM3_NAME ($VM3_SIZE, Windows 11)"
az vm create \
  --resource-group "$RG" \
  --name "$VM3_NAME" \
  --image "MicrosoftWindowsDesktop:windows-11:win11-24h2-ent:latest" \
  --size "$VM3_SIZE" \
  --admin-username "$ADMIN_USER" \
  --admin-password "$ADMIN_PASSWORD" \
  --vnet-name "$VNET" --subnet "$SUBNET" \
  --nsg "" \
  --public-ip-sku Basic \
  --storage-sku StandardSSD_LRS \
  --os-disk-size-gb 128 \
  --output none

info "Enabling auto-shutdown at $SHUTDOWN_TIME"
az vm auto-shutdown --resource-group "$RG" --name "$VM3_NAME" --time "$SHUTDOWN_TIME" --output none

PUB_IP=$(az vm show -d -g "$RG" -n "$VM3_NAME" --query publicIps -o tsv)
info "VM3 ready. Public IP: $PUB_IP (RDP with $ADMIN_USER)"
