# ReVoiceChat-WebClient

Proof of concept RevoiceChat Webclient

# Install

### Install Apache2
```sh
sudo apt-get install apache2-utils apache2 -y
sudo systemctl enable apache2
sudo a2enmod headers
```
### Create VirtualHost

Create new **VirtualHost**
```sh
sudo nano /etc/apache2/sites-available/rvc-client.conf
```

VirtualHost exemple
```apache
<VirtualHost *:80>
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "max-age=86400, must-revalidate"

    DocumentRoot /var/www/html/ReVoiceChat-WebClient/www/
    DirectoryIndex index.html

    <Directory /var/www/html/ReVoiceChat-WebClient/www/>
            AllowOverride All
            Require all granted
    </Directory>

    ErrorLog /var/www/html/logs/rvcs_http_error.log
    LogLevel info
</VirtualHost>
```
**Cache-Control** can be set to **no-cache, must-revalidate**

Enable **VirtualHost**
```sh
sudo a2ensite rvc-client.conf
sudo systemctl reload apache2
```

