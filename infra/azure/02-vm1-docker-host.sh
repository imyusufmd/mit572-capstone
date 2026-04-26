#!/usr/bin/env bash
# VM1 — Ubuntu 22.04 Docker host.
# Hosts: .NET API, React frontend, SQL Server (data warehouse), Node-RED (ETL).
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

SSH_KEY="$HOME/.ssh/id_rsa.pub"
[[ -f "$SSH_KEY" ]] || { info "Generating SSH key"; ssh-keygen -t rsa -b 4096 -f "$HOME/.ssh/id_rsa" -N ""; }

info "Creating $VM1_NAME ($VM1_SIZE, Ubuntu 22.04)"
az vm create \
  --resource-group "$RG" \
  --name "$VM1_NAME" \
  --image "Canonical:ubuntu-24_04-lts:server:latest" \
  --size "$VM1_SIZE" \
  --admin-username "$ADMIN_USER" \
  --ssh-key-values "$SSH_KEY" \
  --vnet-name "$VNET" --subnet "$SUBNET" \
  --nsg "" \
  --public-ip-sku Basic \
  --storage-sku StandardSSD_LRS \
  --os-disk-size-gb 64 \
  --output none

info "Enabling auto-shutdown at $SHUTDOWN_TIME"
az vm auto-shutdown --resource-group "$RG" --name "$VM1_NAME" --time "$SHUTDOWN_TIME" --output none

PUB_IP=$(az vm show -d -g "$RG" -n "$VM1_NAME" --query publicIps -o tsv)
info "VM1 ready. Public IP: $PUB_IP"
info "SSH: ssh $ADMIN_USER@$PUB_IP"

cat <<EOF

----- Post-create steps for VM1 -----
1. SSH in:    ssh $ADMIN_USER@$PUB_IP
2. Install Docker:
     curl -fsSL https://get.docker.com | sudo sh
     sudo usermod -aG docker \$USER && exit
3. SSH back in, clone this repo:
     git clone <your-repo-url> && cd mit572-capstone/infra
     docker compose up -d
EOF
