#!/bin/bash
sudo rm -rf /var/www/game/
sudo mkdir -p /var/www/game/
sudo cp -r web/* /var/www/game/
sudo chown -R www-data:www-data /var/www/game/
