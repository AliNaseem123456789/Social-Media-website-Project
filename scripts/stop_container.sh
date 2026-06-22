#!/bin/bash
echo "🛑 Stopping containers..."
cd /home/ubuntu/app
docker-compose down
echo "✅ Containers stopped"