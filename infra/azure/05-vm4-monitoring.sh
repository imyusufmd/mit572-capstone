#!/usr/bin/env bash
# VM4 — Ubuntu monitoring host (Grafana + Prometheus).
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

SSH_KEY="$HOME/.ssh/id_rsa.pub"
[[ -f "$SSH_KEY" ]] || ssh-keygen -t rsa -b 4096 -f "$HOME/.ssh/id_rsa" -N ""

info "Creating $VM4_NAME ($VM4_SIZE, Ubuntu 24.04)"
az vm create \
  --resource-group "$RG" \
  --name "$VM4_NAME" \
  --image "Canonical:ubuntu-24_04-lts:server:latest" \
  --size "$VM4_SIZE" \
  --admin-username "$ADMIN_USER" \
  --ssh-key-values "$SSH_KEY" \
  --vnet-name "$VNET" --subnet "$SUBNET" \
  --nsg "" \
  --public-ip-sku Basic \
  --storage-sku Standard_LRS \
  --os-disk-size-gb 32 \
  --output none

info "Enabling auto-shutdown at $SHUTDOWN_TIME"
az vm auto-shutdown --resource-group "$RG" --name "$VM4_NAME" --time "$SHUTDOWN_TIME" --output none

PUB_IP=$(az vm show -d -g "$RG" -n "$VM4_NAME" --query publicIps -o tsv)
info "VM4 ready. Public IP: $PUB_IP"
info "SSH: ssh $ADMIN_USER@$PUB_IP"
info "After login, install Grafana+Prometheus via Docker Compose (see docs/monitoring.md)."
