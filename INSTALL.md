## How to install ReVoiceChat-WebClient

### Install Apache2
```sh
sudo apt-get install apache2-utils apache2 -y
```

```sh
sudo systemctl enable apache2
```

```sh
sudo a2enmod headers
```

### Clone this repository

For this guide, we will use ```/srv/rvc``` but you can use any directory (don't forget to change ```/srv/rvc``` to your path)

```sh
git clone https://github.com/revoicechat/ReVoiceChat-WebClient
```

### Create VirtualHost

Create new **VirtualHost**

```sh 
sudo nano /etc/apache2/sites-available/rvc_client.conf
```

VirtualHost exemple
```apache
<VirtualHost *:80>
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "no-cache, must-revalidate"

    DocumentRoot /srv/rvc/ReVoiceChat-WebClient/www/
    DirectoryIndex index.html

    <Directory /srv/rvc/ReVoiceChat-WebClient/www/>
            AllowOverride All
            Require all granted
    </Directory>

    ErrorLog /var/log/rvc/client_error.log
    TransferLog /var/log/rvc/client_access.log
    LogLevel info
</VirtualHost>
```
**Cache-Control** can be set to **max-age=86400, must-revalidate**

Make sure **/var/log/rvc/** exist and apache2 can write to it

Enable **VirtualHost**
```sh
sudo a2ensite rvc_client.conf
```

```sh
sudo systemctl reload apache2
```