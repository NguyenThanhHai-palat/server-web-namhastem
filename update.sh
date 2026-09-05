sudo systemctl stop web-service.service
echo "UPDATE"
git add .
git commit -m "auto update"
git push origin
echo "UPDATE - 2"
git pull
sudo systemctl start web-service.service
