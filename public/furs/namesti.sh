#!/usr/bin/env bash
# 69SLAM — namestitev FURS posrednika na slovenski VPS (Ubuntu/Debian). Zaženi kot root.
set -e
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1
PORT=8443
echo "== 69SLAM FURS posrednik =="
if ! command -v node >/dev/null 2>&1; then
  echo "Nameščam Node.js (1–2 min) …"; apt-get update -qq && apt-get install -y -qq -o Dpkg::Options::=--force-confdef nodejs curl openssl >/dev/null; echo "Node.js nameščen ✓"
fi
mkdir -p /opt/furs-relay
curl -fsSL https://69slam-slovenija.vercel.app/furs/relay.js -o /opt/furs-relay/relay.js
if [ ! -f /opt/furs-relay/token ]; then openssl rand -hex 32 > /opt/furs-relay/token; chmod 600 /opt/furs-relay/token; fi
TOKEN=$(cat /opt/furs-relay/token)
cat > /etc/systemd/system/furs-relay.service <<UNIT
[Unit]
Description=69SLAM FURS posrednik
After=network-online.target
[Service]
Environment=RELAY_TOKEN=${TOKEN}
Environment=PORT=${PORT}
ExecStart=$(command -v node) /opt/furs-relay/relay.js
Restart=always
DynamicUser=yes
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now furs-relay >/dev/null
systemctl restart furs-relay
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q active; then ufw allow ${PORT}/tcp >/dev/null; fi
sleep 1
IP=$(curl -fsS -4 https://api.ipify.org || hostname -I | awk '{print $1}')
echo
if curl -sk --max-time 10 https://blagajne.fu.gov.si:9003/v1/cash_registers/echo | grep -qi "Request Rejected"; then
  echo "⚠️  FURS zavrača ta IP (${IP}) — strežnik verjetno ni v Sloveniji. Javi Claudu."
else
  echo "✅ FURS ta IP sprejema."
fi
echo
echo "Kopiraj spodnjo vrstico v admin (Računi → Oblika → Davčno potrjevanje → FURS posrednik):"
echo
echo "furs://${TOKEN}@${IP}:${PORT}"
echo
