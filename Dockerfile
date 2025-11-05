# Utiliser une image nginx légère
FROM nginx:alpine

# Copier les fichiers du projet dans le dossier de nginx
COPY ./www /usr/share/nginx/html

# Exposer le port 5000
EXPOSE 5000

# Créer une configuration nginx personnalisée pour le port 5000
RUN echo 'server { \
    listen 5000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]