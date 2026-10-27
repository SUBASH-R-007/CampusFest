FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM php:8.4-apache-bookworm
RUN a2enmod rewrite \
    && sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf
WORKDIR /var/www/html
COPY backend/src/ backend/src/
RUN rm backend/src/services/DemoSeed.php
COPY backend/public/index.php backend/public/.htaccess backend/public/
COPY backend/scripts/cli.php backend/scripts/setup.php backend/scripts/organizer.php backend/scripts/
COPY --from=frontend /build/frontend/dist/ backend/public/
COPY deploy/render-apache.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/render-init.php deploy/render-init.php
COPY deploy/render-start.sh /usr/local/bin/campusfest-start
RUN sed -i 's/\r$//' /usr/local/bin/campusfest-start \
    && chmod 755 /usr/local/bin/campusfest-start \
    && printf 'expose_php=Off\ndisplay_errors=Off\nlog_errors=On\n' > /usr/local/etc/php/conf.d/campusfest.ini
ENV CAMPUSFEST_STORAGE=/var/data/campusfest
EXPOSE 8080
CMD ["campusfest-start"]
