#!/usr/bin/env bash
# ==============================================================================
# Bagstack — Oracle Cloud Always-Free Automated VPS Setup Script
# ==============================================================================
set -euo pipefail

echo "====================================================="
echo "🚀 Initializing Bagstack on Oracle Cloud VPS"
echo "====================================================="

# 1. Update OS packages
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Configure Oracle Cloud Ubuntu Firewall (Crucial Gotcha Fix)
# Oracle Ubuntu images have default iptables DROP rules that block ports 80/443.
echo "🛡️ Opening ports 80 & 443 in OS firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo apt-get install -y iptables-persistent netfilter-persistent
sudo netfilter-persistent save

# 3. Install Docker and Docker Compose (if not already installed)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker "$USER"
    echo "✅ Docker installed successfully."
fi

# 4. Check for .env.local configuration
if [ ! -f ".env.local" ]; then
    echo "⚠️ No .env.local found. Creating from .env.example..."
    cp .env.example .env.local
    echo "➡️ Please edit .env.local with your SMTP_PASS and DOMAIN before running the app!"
fi

echo "====================================================="
echo "🚀 Building & Starting Bagstack with Caddy SSL..."
echo "====================================================="
docker compose -f docker-compose.prod.yml up -d --build

echo "====================================================="
echo "✅ Bagstack is now running in production!"
echo "Check container status: docker compose -f docker-compose.prod.yml ps"
echo "View live app logs:   docker compose -f docker-compose.prod.yml logs -f"
echo "====================================================="
