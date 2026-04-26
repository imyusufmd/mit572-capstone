#!/usr/bin/env bash
# VM2 — Windows Server 2022. Hosts Active Directory Domain Services + PostgreSQL.
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

info "Creating $VM2_NAME ($VM2_SIZE, Windows Server 2022)"
az vm create \
  --resource-group "$RG" \
  --name "$VM2_NAME" \
  --image "MicrosoftWindowsServer:WindowsServer:2022-datacenter-azure-edition:latest" \
  --size "$VM2_SIZE" \
  --admin-username "$ADMIN_USER" \
  --admin-password "$ADMIN_PASSWORD" \
  --vnet-name "$VNET" --subnet "$SUBNET" \
  --nsg "" \
  --public-ip-sku Basic \
  --storage-sku StandardSSD_LRS \
  --os-disk-size-gb 128 \
  --output none

info "Enabling auto-shutdown at $SHUTDOWN_TIME"
az vm auto-shutdown --resource-group "$RG" --name "$VM2_NAME" --time "$SHUTDOWN_TIME" --output none

PUB_IP=$(az vm show -d -g "$RG" -n "$VM2_NAME" --query publicIps -o tsv)
info "VM2 ready. Public IP: $PUB_IP"

cat <<EOF

----- Post-create steps for VM2 (do in Azure Portal or via RDP) -----
RDP into VM2 using: $PUB_IP  (user: $ADMIN_USER)

1. Install AD DS role:
     Server Manager -> Add Roles -> Active Directory Domain Services
     Promote to domain controller, create new forest: capstone.local

2. Install PostgreSQL 16:
     Download from https://www.postgresql.org/download/windows/
     During install, set postgres password, open port 5432 in Windows Firewall.

3. Run database/postgres-init.sql via pgAdmin to seed the schema.
EOF
