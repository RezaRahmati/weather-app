#!/usr/bin/env bash
# Starts the weather-app dev server in the background for CALYX verification.
# Usage: bash .calyx/scripts/start_app.sh
set -e
cd "$(dirname "$0")/../.."
export BROWSER=none
export PORT=3000
nohup npm start > /tmp/weather-app.log 2>&1 &
echo "Started weather-app with PID $!"
