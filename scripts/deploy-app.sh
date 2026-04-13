#!/bin/bash
# Deploy 49Agents app (git pull + rebuild + restart)
set -e

SERVER="root@24.144.84.83"
PASS='Cs=A:>s?^2e>d~v'

run() {
  sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "$1"
}

echo "=> Pulling latest 49Agents..."
run 'cd /opt/49agents && git pull origin main'

echo "=> Installing cloud dependencies..."
run 'cd /opt/49agents/cloud && npm install --include=dev'

echo "=> Installing agent dependencies..."
# The agent tarball below bundles agent/node_modules. If we skip this
# step, the rebuilt tarball ships either stale modules (whatever the
# server happened to have on disk from a previous deploy) or none at
# all on a fresh checkout, and downstream `49-agent.js start` blows up
# at import time.
run 'cd /opt/49agents/agent && npm install'

echo "=> Rebuilding cloud JS..."
run 'cd /opt/49agents/cloud && npm run build'

echo "=> Rebuilding agent tarball..."
# `cloud/dl/49-agent.tar.gz` is the binary served by /dl/49-agent.tar.gz
# and consumed by the curl|sh installer that the "Add Machine" UI button
# hands out. It is NOT committed to the repo (cloud/dl/ is gitignored),
# so a `git pull` only updates agent/src/. Without rebuilding this
# tarball after the pull, every fresh install — including the supervised
# 49Agents agent inside the agent-stack container — re-extracts the
# previous tarball's frozen agent/src/ snapshot, and source-level fixes
# never reach the running agent. start.sh does this on initial setup;
# this line ensures redeploys do it too.
run 'cd /opt/49agents && mkdir -p cloud/dl && tar czf cloud/dl/49-agent.tar.gz agent/'

echo "=> Restarting server..."
run 'cd /opt/49agents/cloud && ADMIN_PORT=1071 TAILSCALE_IP=100.110.195.110 pm2 restart 49agents --update-env && pm2 save'

echo "=> Done! Checking status..."
run 'pm2 logs 49agents --lines 3 --nostream 2>&1'
