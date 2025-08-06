#!/bin/bash

echo "Searching for update ..."
sudo apt update && sudo apt -y upgrade

echo "Installing Apache2 ..."
sudo apt-get install apache2-utils apache2 -y

echo "Enabling Apache2 service ..."
sudo systemctl enable apache2