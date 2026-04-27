FROM nodered/node-red:latest

# Install ETL contrib nodes into the Node-RED user directory
WORKDIR /data
COPY package.json ./
RUN npm install --unsafe-perm --no-update-notifier

# Copy init files to a separate directory so entrypoint can install
# them on first run without overwriting user edits
USER root
RUN mkdir -p /etl-init
COPY flows.json /etl-init/flows.json
COPY settings.js /etl-init/settings.js
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Mount point for the git-tracked etl/ folder (read-only reference)
# Actual runtime data lives in the nodered-data volume at /data
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
