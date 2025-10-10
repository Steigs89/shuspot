# Quick Deployment to 47.76.248.16

## Option 1: Upload via SCP (if you have SSH key or password)

### If you have password authentication enabled:
```bash
# Upload the package
scp shuspot-deploy-20251010_085522.tar.gz root@47.76.248.16:/root/

# SSH into the server
ssh root@47.76.248.16
```

### If you need to set up SSH key:
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096

# Copy your public key to the server (you'll need to enter password)
ssh-copy-id root@47.76.248.16

# Then try uploading again
scp shuspot-deploy-20251010_085522.tar.gz root@47.76.248.16:/root/
```

## Option 2: Upload via Alibaba Cloud Console

1. Go to Alibaba Cloud Console
2. Navigate to your ECS instance
3. Use the "Connect" button to access the web terminal
4. In the web terminal, run:
```bash
cd /root
# Then use the upload feature in the web terminal, or:
wget https://github.com/Steigs89/shuspot/archive/refs/heads/main.zip
unzip main.zip
cd shuspot-main
```

## Option 3: Clone from GitHub (Recommended)

Since everything is pushed to GitHub, you can clone directly on the server:

```bash
# SSH into your server (via Alibaba console or terminal)
ssh root@47.76.248.16

# Once connected, run:
cd /root
git clone https://github.com/Steigs89/shuspot.git
cd shuspot

# Build on the server
npm install
npm run build

# Or if you prefer the pre-built package:
# Download the deployment package from your local machine another way
```

## After Upload - Deployment Steps

Once you have the files on the server, follow these steps:

### 1. Extract (if using tar.gz package):
```bash
cd /root
tar -xzf shuspot-deploy-20251010_085522.tar.gz
```

### 2. Install Dependencies:

#### Update system:
```bash
apt update && apt upgrade -y
```

#### Install Nginx:
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

#### Install Python:
```bash
apt install python3 python3-pip python3-venv -y
```

#### Install Node.js (if building on server):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs -y
```

### 3. Set Up Application:

```bash
# Create app directory
mkdir -p /var/www/shuspot
cd /var/www/shuspot

# If you extracted the tar.gz in /root:
cp -r /root/dist /var/www/shuspot/
cp -r /root/api /var/www/shuspot/
cp /root/api.py /var/www/shuspot/
cp /root/requirements.txt /var/www/shuspot/
cp /root/.env.production /var/www/shuspot/.env

# Or if you cloned from GitHub:
cp -r /root/shuspot/dist /var/www/shuspot/
cp -r /root/shuspot/api /var/www/shuspot/
cp /root/shuspot/api.py /var/www/shuspot/
cp /root/shuspot/requirements.txt /var/www/shuspot/
cp /root/shuspot/.env.production /var/www/shuspot/.env

# Set up Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configure Nginx:

```bash
# Copy nginx config
cp /root/shuspot/nginx-shuspot.conf /etc/nginx/sites-available/shuspot

# Edit with your domain (or use IP for now)
nano /etc/nginx/sites-available/shuspot
# Change 'your-domain.com' to '47.76.248.16' or your actual domain

# Enable the site
ln -s /etc/nginx/sites-available/shuspot /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test and restart
nginx -t
systemctl restart nginx
```

### 5. Set Up Backend Service (Optional):

```bash
# Copy service file
cp /root/shuspot/shuspot-api.service /etc/systemd/system/

# Start service
systemctl daemon-reload
systemctl start shuspot-api
systemctl enable shuspot-api
systemctl status shuspot-api
```

### 6. Configure Firewall:

#### Alibaba Cloud Security Group:
1. Go to ECS Console → Security Groups
2. Add rules:
   - HTTP: Port 80, Source: 0.0.0.0/0
   - HTTPS: Port 443, Source: 0.0.0.0/0

#### Server Firewall:
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 7. Test:

Visit in your browser:
```
http://47.76.248.16
```

## Troubleshooting:

### Check Nginx status:
```bash
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Check if port 80 is listening:
```bash
netstat -tlnp | grep :80
```

### Check file permissions:
```bash
chown -R www-data:www-data /var/www/shuspot
chmod -R 755 /var/www/shuspot
```

### Test Nginx config:
```bash
nginx -t
```

## Need Help?

If you encounter issues:
1. Check the logs: `tail -f /var/log/nginx/error.log`
2. Verify services are running: `systemctl status nginx`
3. Check firewall: `ufw status`
4. Verify files exist: `ls -la /var/www/shuspot/dist`

---

**Your ECS IP**: 47.76.248.16
**Deployment Package**: shuspot-deploy-20251010_085522.tar.gz (14MB)
