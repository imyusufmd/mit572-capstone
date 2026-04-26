#!/usr/bin/env bash
# Show status of all VMs and remaining credit guidance.
set -euo pipefail
source "$(dirname "$0")/00-config.sh"
check_login

echo
echo "VM Status:"
az vm list -g "$RG" -d \
  --query "[].{Name:name, Size:hardwareProfile.vmSize, PowerState:powerState, PublicIP:publicIps}" \
  -o table

echo
echo "Check remaining credit at:"
echo "  https://portal.azure.com/#view/Microsoft_Azure_GTM/ModernBillingMenuBlade/~/Overview"
