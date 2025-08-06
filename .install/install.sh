#!/bin/bash

echo "Searching for update ..."
sudo apt update && sudo apt -y upgrade

echo "Installing Apache2 ..."
sudo apt-get install apache2-utils apache2 -y

echo "Enabling Apache2 service ..."
sudo systemctl enable apache2

echo "Configuring Apache2 ..."
if [ -f "/etc/apache2/sites-enabled/rvc-client.conf" ]; then
    echo -e "\t- rvc-client config already enabled."
else 
    sudo cp virtualhost.conf /etc/apache2/sites-available/rvc-client.conf
    sudo a2ensite rvc-client.conf
    sudo systemctl reload apache2
fi
