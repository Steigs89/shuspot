# Alibaba Cloud ECS Deployment Guide

This guide will help you deploy Shuspot to your Alibaba Cloud ECS instance.

## Prerequisites

- Alibaba Cloud ECS instance running (Ubuntu 20.04+ or CentOS 7+)
- Domain name configured and pointing to your ECS IP
- SSH access to your ECS instance
- Root or sudo access

## Step 1: Prepare Your Local Machine

1. Build and package the application:
```bash
chmod +x deploy-to-alibaba.sh
./deploy-to-alibaba.sh
```

2. Upload the package to your ECS instance:
```bash
scp shuspot-deploy-*.tar.gz root@YOUR_ECS_IP:/root/
```

## Step 2: Set Up ECS Instance

SSH into your ECS instance:
```bash
ssh root@YOUR_ECS_IP
```

### Install Required Software

#### For Ubuntu/Debian:
```bash
# Update system
apt update && apt upgrade -y

# Install Nginx
apt install nginx -y

# Install Python 3 and pip
apt install python3 python3-pip python3-venv -y

# Install Node.js (optional, for future builds on server)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs -y

# Install certbot for SSL
apt install certbot python3-certbot-nginx -y
```

#### For CentOS/AliyunOS:
```bash
# Update system
yum update -y

# Install Nginx
yum install nginx -y

# Install Python 3
yum install python3 python3-pip -y

# Install Node.js (optional)
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install nodejs -y

# Install certbot for SSL
yum install certbot python3-certbot-nginx -y
```

## Step 3: Deploy the Application

1. Create application directory:
```bash
mkdir -p /var/www/shuspot
cd /var/www/shuspot
```

2. Extract the deployment package:
```bash
tar -xzf ~/shuspot-deploy-*.tar.gz -C /var/www/shuspot
```

3. Set up Python virtual environment (if using backend):
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Copy and edit the production environment file
cp .env.production .env
nano .env

# Make sure to update:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - Any other production-specific variables
```

5. Set proper permissions:
```bash
chown -R www-data:www-data /var/www/shuspot
chmod -R 755 /var/www/shuspot
```

## Step 4: Configure Nginx

1. Copy the nginx configuration:
```bash
cp /var/www/shuspot/nginx-shuspot.conf /etc/nginx/sites-available/shuspot
```

2. Edit the configuration with your domain:
```bash
nano /etc/nginx/sites-available/shuspot
# Replace 'your-domain.com' with your actual domain
```

3. Enable the site:
```bash
# For Ubuntu/Debian
ln -s /etc/nginx/sites-available/shuspot /etc/nginx/sites-enabled/

# For CentOS (if sites-enabled doesn't exist)
# Add 'include /etc/nginx/sites-enabled/*;' to /etc/nginx/nginx.conf
# Then create the symlink
```

4. Test and reload Nginx:
```bash
nginx -t
systemctl restart nginx
systemctl enable nginx
```

## Step 5: Set Up Backend Service (Optional)

If you're running the Python backend:

1. Copy the service file:
```bash
cp /var/www/shuspot/shuspot-api.service /etc/systemd/system/
```

2. Start and enable the service:
```bash
systemctl daemon-reload
systemctl start shuspot-api
systemctl enable shuspot-api
systemctl status shuspot-api
```

## Step 6: Configure Firewall

### Alibaba Cloud Security Group

In your Alibaba Cloud console:
1. Go to ECS → Security Groups
2. Add inbound rules:
   - HTTP: Port 80, Source: 0.0.0.0/0
   - HTTPS: Port 443, Source: 0.0.0.0/0
   - SSH: Port 22, Source: Your IP (for security)

### Server Firewall (UFW for Ubuntu)

```bash
# Allow SSH (important - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

## Step 7: Set Up SSL Certificate (HTTPS)

1. Get a free SSL certificate from Let's Encrypt:
```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

2. Follow the prompts and choose to redirect HTTP to HTTPS

3. Test auto-renewal:
```bash
certbot renew --dry-run
```

## Step 8: Verify Deployment

1. Check if Nginx is running:
```bash
systemctl status nginx
```

2. Check if API is running (if applicable):
```bash
systemctl status shuspot-api
```

3. Check logs if there are issues:
```bash
# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# API logs (if using systemd service)
journalctl -u shuspot-api -f
```

4. Visit your domain in a browser:
```
http://your-domain.com
```

## Updating the Application

To update your application:

1. On your local machine:
```bash
# Make your changes
git add .
git commit -m "Your changes"
git push

# Build and package
./deploy-to-alibaba.sh

# Upload to server
scp shuspot-deploy-*.tar.gz root@YOUR_ECS_IP:/root/
```

2. On your ECS instance:
```bash
cd /var/www/shuspot

# Backup current version
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Extract new version
tar -xzf ~/shuspot-deploy-*.tar.gz

# Restart services if needed
systemctl restart shuspot-api  # if using backend
systemctl reload nginx
```

## Monitoring and Maintenance

### Check disk space:
```bash
df -h
```

### Monitor logs:
```bash
# Real-time nginx access log
tail -f /var/log/nginx/access.log

# Real-time API logs
journalctl -u shuspot-api -f
```

### Backup database:
```bash
# If using local SQLite database
cp /var/www/shuspot/books.db /root/backups/books.db.$(date +%Y%m%d)
```

## Troubleshooting

### Nginx won't start:
```bash
nginx -t  # Check configuration
systemctl status nginx  # Check status
journalctl -xe  # Check system logs
```

### 502 Bad Gateway:
- Check if API service is running: `systemctl status shuspot-api`
- Check API logs: `journalctl -u shuspot-api -n 50`
- Verify port 8000 is listening: `netstat -tlnp | grep 8000`

### Permission denied errors:
```bash
chown -R www-data:www-data /var/www/shuspot
chmod -R 755 /var/www/shuspot
```

### SSL certificate issues:
```bash
certbot certificates  # Check certificate status
certbot renew  # Manually renew
```

## Performance Optimization

### Enable Nginx caching:
Add to your nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
```

### Enable HTTP/2:
Already enabled in the nginx config if using SSL

### Monitor server resources:
```bash
htop  # Install with: apt install htop
```

## Security Best Practices

1. Keep system updated:
```bash
apt update && apt upgrade -y  # Ubuntu
yum update -y  # CentOS
```

2. Set up automatic security updates
3. Use strong SSH keys instead of passwords
4. Regularly backup your data
5. Monitor access logs for suspicious activity
6. Keep your SSL certificates up to date

## Support

If you encounter issues:
1. Check the logs (nginx, API, system)
2. Verify all services are running
3. Check firewall and security group settings
4. Ensure DNS is properly configured
5. Test with curl: `curl -I http://your-domain.com`

---

**Note**: Replace `YOUR_ECS_IP` and `your-domain.com` with your actual values throughout this guide.
