#!/bin/sh
set -e

DATA_DIR=/data

# Copy flows and settings on first run (don't overwrite if user has edited them)
if [ ! -f "$DATA_DIR/flows.json" ]; then
    echo "[ETL] Installing initial flows..."
    cp /etl-init/flows.json "$DATA_DIR/flows.json"
fi

# Always overwrite settings.js so credentialSecret:false is guaranteed
echo "[ETL] Installing settings..."
cp /etl-init/settings.js "$DATA_DIR/settings.js"

# Always regenerate credentials from env vars (plaintext, credentialSecret=false)
echo "[ETL] Writing credentials from environment..."
cat > "$DATA_DIR/flows_cred.json" <<CREDEOF
{
  "pg-config-001": {
    "user": "app_user",
    "password": "${POSTGRES_PASSWORD}"
  },
  "mssql-config-001": {
    "username": "sa",
    "password": "${SA_PASSWORD}"
  }
}
CREDEOF

echo "[ETL] Starting Node-RED..."
exec node-red --userDir "$DATA_DIR" --settings "$DATA_DIR/settings.js"
