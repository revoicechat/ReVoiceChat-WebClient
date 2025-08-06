#!/bin/bash

echo "Configuring Apache2 ..."
if [ -f "/etc/apache2/sites-enabled/rvc-client.conf" ]; then
    echo -e "\t- rvc-client config already enabled."
else 
    sudo cp virtualhost.conf /etc/apache2/sites-available/rvc-client.conf
    sudo a2ensite rvc-client.conf
    sudo systemctl reload apache2
fi