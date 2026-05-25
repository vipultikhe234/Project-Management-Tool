# Stage 1: Build composer dependencies
FROM composer:2.6 as composer_build
WORKDIR /app
COPY composer.json composer.lock ./
# Install dependencies without dev requirements and optimize autoloader
RUN composer install --no-dev --no-interaction --no-plugins --no-scripts --prefer-dist --optimize-autoloader

# Stage 2: Runtime image
FROM php:8.3-apache

# Set shell to bash and enable pipefail
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Update package lists and install required libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libxml2-dev \
    libpq-dev \
    libsqlite3-dev \
    libicu-dev \
    unzip \
    zip \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        bcmath \
        gd \
        intl \
        opcache \
        pdo_mysql \
        pdo_pgsql \
        pdo_sqlite \
        zip \
        xml

# Configure OPcache for production
RUN { \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=4000'; \
        echo 'opcache.revalidate_freq=2'; \
        echo 'opcache.fast_shutdown=1'; \
        echo 'opcache.enable_cli=1'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Enable Apache rewrite module
RUN a2enmod rewrite

# Configure Apache DocumentRoot to point to Laravel's public directory
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf
RUN sed -ri -e 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

# Set working directory
WORKDIR /var/www/html

# Copy application source code
COPY . .

# Copy composer dependencies from build stage
COPY --from=composer_build /app/vendor ./vendor

# Set correct permissions for Laravel storage and bootstrap cache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose the default Apache port (Render will override or map this)
EXPOSE 80

# Create a startup script to dynamically set the port Apache listens on and run migrations/seeders
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh \
    && echo 'PORT=${PORT:-80}' >> /usr/local/bin/docker-entrypoint.sh \
    && echo 'sed -i "s/Listen 80/Listen \${PORT}/g" /etc/apache2/ports.conf' >> /usr/local/bin/docker-entrypoint.sh \
    && echo 'sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:\${PORT}>/g" /etc/apache2/sites-available/000-default.conf' >> /usr/local/bin/docker-entrypoint.sh \
    && echo 'mkdir -p database && touch database/database.sqlite && chown www-data:www-data database/database.sqlite' >> /usr/local/bin/docker-entrypoint.sh \
    && echo 'php artisan migrate --force' >> /usr/local/bin/docker-entrypoint.sh \
    && echo 'php artisan db:seed --force' >> /usr/local/bin/docker-entrypoint.sh \
    && echo 'exec apache2-foreground' >> /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Run our custom entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
