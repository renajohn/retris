FROM nginx:alpine
COPY index.html style.css game.js manifest.json sw.js icon.svg icon-192.png icon-512.png /usr/share/nginx/html/
EXPOSE 80
