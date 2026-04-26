# Azure Infra Setup — MIT 572 Capstone

Provisions 4 Azure VMs for the warehouse management capstone, sized to fit inside the **$100 Azure for Students** credit.

## Cost plan

| VM | Size | 24/7 cost | With auto-shutdown (10h/day) |
|---|---|---|---|
| VM1 Docker host (Linux) | B2ms | ~$60/mo | ~$25/mo |
| VM2 Windows Server (AD+PG) | B2s | ~$54/mo | ~$22/mo |
| VM3 Windows 11 (optional) | B2s | ~$54/mo | ~$22/mo |
| VM4 Monitoring (Linux) | B1s | ~$7/mo | ~$3/mo |

**Strategy**: run VMs only when actively working. `stop-all.sh` deallocates them (compute billing pauses; disks still cost a few $/mo). All 4 running ~10h/day ≈ **$70/mo** → $100 credit lasts ~6 weeks. Skip VM3 and it stretches to ~2 months.

When credit hits $0, Azure stops your services. **No charge to you** — there is no card on the Students subscription.

## First-time setup (do this once)

```bash
# 1. Install Azure CLI in WSL
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Login with your Elmhurst .edu account
az login

# 3. Set your public IP + a strong VM password
export MY_IP=$(curl -s ifconfig.me)
export VM_ADMIN_PASSWORD='YourStrongP@ssword123!'

# 4. Make scripts executable
cd infra/azure
chmod +x *.sh

# 5. Create foundation (resource group, network, firewall rules)
./01-foundation.sh

# 6. Create VMs one by one (watch for errors after each)
./02-vm1-docker-host.sh
./03-vm2-windows-ad.sh
./05-vm4-monitoring.sh
# Optional — skip to save credits if you have a local Windows machine:
# ./04-vm3-workstation.sh
```

## Daily workflow

```bash
./start-all.sh     # before starting work
./status.sh        # confirm all VMs running, see public IPs
# ... do your work ...
./stop-all.sh      # ALWAYS run this when you finish
```

## End of capstone

```bash
./teardown.sh      # nukes everything
```

## Notes

- All VMs auto-shutdown nightly at 8 PM CST as a safety net in case you forget `stop-all.sh`.
- NSG firewall rules only allow SSH/RDP from `MY_IP`. If your home IP changes, re-run `01-foundation.sh`.
- SSH key is generated automatically at `~/.ssh/id_rsa` if missing.
- Windows VMs use the password in `VM_ADMIN_PASSWORD`. **Never commit this to git.**
