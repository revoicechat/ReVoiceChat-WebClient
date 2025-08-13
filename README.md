# ReVoiceChat-WebClient

Proof of concept RevoiceChat Webclient

# Install

### Install Apache2
```sh
sudo apt-get install apache2-utils apache2 -y
sudo systemctl enable apache2
```
### Create VirtualHost

Create new VirtualHost
```sh
sudo nano /etc/apache2/sites-available/rvc-client.conf
```

VirtualHost exemple
```apache
<VirtualHost *:80>
	Alias / /var/www/html/ReVoiceChat-Client/src/www/
    DirectoryIndex index.html
	
	<Directory /var/www/html/ReVoiceChat-Client/src/www/>
        	AllowOverride All
        	Require all granted
    </Directory>

    ErrorLog /var/www/html/logs/rvcs_http_error.log
    LogLevel info
</VirtualHost>
```

Enable VirtualHost
```sh
sudo a2ensite rvc-client.conf
sudo systemctl reload apache2
```

