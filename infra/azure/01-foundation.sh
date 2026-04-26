#!/usr/bin/env bash
# Creates the foundation: VNet, Subnet, Network Security Group.
# Resource group MIT572-05 already exists — skipping group creation.
# Run this ONCE before creating any VMs.
set -euo pipefail
source "$(dirname "$0")/00-config.sh"

check_login
check_ip

info "Using existing resource group: $RG"

info "Creating virtual network: $VNET"
az network vnet create \
  --resource-group "$RG" \
  --name "$VNET" \
  --address-prefix 10.0.0.0/16 \
  --subnet-name "$SUBNET" \
  --subnet-prefix 10.0.1.0/24 \
  --output none

info "Creating network security group: $NSG"
az network nsg create --resource-group "$RG" --name "$NSG" --output none

# ---- NSG Rules ----
# Priority 100-199: restrict to MY_IP only (admin access)
# Priority 200-299: public app ports

info "Allowing SSH (22) from $MY_IP only"
az network nsg rule create --resource-group "$RG" --nsg-name "$NSG" \
  --name AllowSSH --priority 100 --source-address-prefixes "$MY_IP" \
  --destination-port-ranges 22 --protocol Tcp --access Allow --output none

info "Allowing RDP (3389) from $MY_IP only"
az network nsg rule create --resource-group "$RG" --nsg-name "$NSG" \
  --name AllowRDP --priority 110 --source-address-prefixes "$MY_IP" \
  --destination-port-ranges 3389 --protocol Tcp --access Allow --output none

info "Allowing HTTP/HTTPS (80, 443) from anywhere (frontend + API)"
az network nsg rule create --resource-group "$RG" --nsg-name "$NSG" \
  --name AllowWeb --priority 200 --source-address-prefixes '*' \
  --destination-port-ranges 80 443 --protocol Tcp --access Allow --output none

info "Allowing API (5000) and Node-RED (1880) from $MY_IP"
az network nsg rule create --resource-group "$RG" --nsg-name "$NSG" \
  --name AllowDevPorts --priority 210 --source-address-prefixes "$MY_IP" \
  --destination-port-ranges 5000 1880 3000 --protocol Tcp --access Allow --output none

info "Attaching NSG to subnet"
az network vnet subnet update \
  --resource-group "$RG" --vnet-name "$VNET" --name "$SUBNET" \
  --network-security-group "$NSG" --output none

info "Foundation ready. Next: ./02-vm1-docker-host.sh"
