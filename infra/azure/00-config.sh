#!/usr/bin/env bash
# Shared config for all Azure setup scripts.
# Source this at the top of every other script: `source "$(dirname "$0")/00-config.sh"`

# ---- Core naming ----
export RG="MIT572-05"
export LOCATION="eastus"               # Cheapest region with Azure for Students
export VNET="vnet-capstone"
export SUBNET="subnet-main"
export NSG="nsg-capstone"

# ---- Admin credentials (CHANGE THESE before running) ----
export ADMIN_USER="capstoneadmin"
# Set a strong password — min 12 chars, mixed case, number, symbol.
# Do NOT commit your real password. Export it in your shell before running:
#   export VM_ADMIN_PASSWORD='YourStrongP@ss123!'
export ADMIN_PASSWORD="${VM_ADMIN_PASSWORD:-ChangeMe_Capstone2026!}"

# ---- Your home/public IP (for SSH/RDP firewall) ----
# Get it with: curl -s ifconfig.me
# Only this IP will be allowed to SSH/RDP. Update if your ISP changes it.
export MY_IP="${MY_IP:-0.0.0.0}"

# ---- VM names ----
export VM1_NAME="vm1-docker-host"      # Ubuntu — API, SQL Server, Node-RED, Frontend
export VM2_NAME="vm2-win-ad-pg"        # Windows Server — AD + PostgreSQL
export VM3_NAME="vm3-workstation"      # Windows 11 — optional mgmt (SSMS, pgAdmin)
export VM4_NAME="vm4-monitoring"       # Ubuntu — Grafana + Prometheus

# ---- VM sizes (kept small to stretch $100 credit) ----
export VM1_SIZE="Standard_B2ms"        # 2 vCPU / 8 GB — needs 8GB for SQL Server container
export VM2_SIZE="Standard_B2s"         # 2 vCPU / 4 GB — AD + PostgreSQL
export VM3_SIZE="Standard_B2s"         # 2 vCPU / 4 GB — Windows 11
export VM4_SIZE="Standard_B1s"         # 1 vCPU / 1 GB — lightweight monitoring

# ---- Auto-shutdown time (saves credits) ----
# VMs auto-stop every day at this time. You start them manually when needed.
export SHUTDOWN_TIME="2000"            # 8:00 PM
export SHUTDOWN_TZ="Central Standard Time"

# ---- Helpers ----
die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }

check_login() {
  az account show >/dev/null 2>&1 || die "Not logged in. Run: az login"
  info "Subscription: $(az account show --query name -o tsv)"
}

check_ip() {
  if [[ "$MY_IP" == "0.0.0.0" ]]; then
    die "Set MY_IP first. Run: export MY_IP=\$(curl -s ifconfig.me)"
  fi
}
