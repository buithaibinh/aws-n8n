#!/bin/bash
# Update system and install necessary software for Debian
sudo apt-get update -y
sudo apt-get install -y nodejs npm
sudo npm install -g yarn
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker admin
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo reboot
