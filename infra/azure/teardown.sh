#!/usr/bin/env bash
# Delete EVERYTHING in the resource group. Irreversible.
# Use this at end of capstone to reset, or if you want to start over.
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

read -p "This will DELETE all resources in '$RG'. Type 'yes' to confirm: " confirm
[[ "$confirm" == "yes" ]] || { echo "Cancelled."; exit 0; }

info "Deleting resource group $RG (this runs in background, takes ~5 min)"
az group delete --name "$RG" --yes --no-wait
info "Teardown initiated. Track in portal -> Resource groups."
