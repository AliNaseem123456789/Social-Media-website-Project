#!/usr/bin/env bash
# Prepares a fresh EC2 instance to build and run this stack. Run once, as root or with sudo:
#
#   sudo ./scripts/ec2-bootstrap.sh
#
# Installs Docker with the compose plugin and creates swap. The swap is not optional on a 1 GB
# instance: `npm ci` plus a Docker build needs more memory than the box has, and without swap the
# build is killed partway through with no useful error.
set -euo pipefail

SWAP_SIZE="${SWAP_SIZE:-4G}"
SWAP_FILE="/swapfile"

log() { printf '\n== %s\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo." >&2
  exit 1
fi

log "swap"
if swapon --show | grep -q "$SWAP_FILE"; then
  echo "  $SWAP_FILE is already active"
else
  fallocate -l "$SWAP_SIZE" "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE" >/dev/null
  swapon "$SWAP_FILE"
  grep -q "$SWAP_FILE" /etc/fstab || echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  echo "  created $SWAP_SIZE of swap"
fi

# Swap is here as a safety net, not as working memory: prefer RAM until it is genuinely full.
cat > /etc/sysctl.d/99-swap.conf <<'EOF'
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
sysctl -p /etc/sysctl.d/99-swap.conf >/dev/null
echo "  swappiness set to 10"

log "docker"
if command -v docker >/dev/null 2>&1; then
  echo "  docker is already installed: $(docker --version)"
else
  if command -v dnf >/dev/null 2>&1; then
    # Amazon Linux 2023
    dnf install -y docker
    systemctl enable --now docker
    DOCKER_USER="${SUDO_USER:-ec2-user}"
    # Amazon Linux ships Docker without the compose plugin.
    COMPOSE_DIR=/usr/libexec/docker/cli-plugins
    mkdir -p "$COMPOSE_DIR"
    ARCH=$(uname -m)
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
      -o "$COMPOSE_DIR/docker-compose"
    chmod +x "$COMPOSE_DIR/docker-compose"
  else
    # Ubuntu
    apt-get update -qq
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    . /etc/os-release
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    DOCKER_USER="${SUDO_USER:-ubuntu}"
  fi
  usermod -aG docker "$DOCKER_USER"
  echo "  added $DOCKER_USER to the docker group (log out and back in for it to take effect)"
fi

log "docker daemon"
# Caps the log growth of anything started outside compose, and keeps the daemon's own footprint small.
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
EOF
systemctl restart docker

log "done"
free -h
docker --version
docker compose version
cat <<'EOF'

Next:
  1. Copy this checkout to the instance (git clone, or scp the folder).
  2. Create backend/.env and email-microservice/.env from the .env.example files next to them.
  3. Create .env beside docker-compose.ec2.yml with API_DOMAIN and ACME_EMAIL.
  4. Point API_DOMAIN's DNS A record at this instance's public IP.
  5. Open ports 22, 80 and 443 in the security group. Nothing else.
  6. ./scripts/ec2-deploy.sh
EOF
