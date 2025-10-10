# Deployment Automation Scripts

I can't directly connect to your server, but I've created automation scripts to make deployment super fast!

## 🚀 Three Deployment Options

### **Option 1: One-Command Deploy (Recommended)**
```bash
./deploy-one-command.sh "Your commit message"
```
**What it does:**
- Adds all changes
- Commits with your message
- Pushes to GitHub
- Pulls on server
- Builds and deploys
- Reloads nginx

**Example:**
```bash
./deploy-one-command.sh "Add import books tab"
```

### **Option 2: Git-Based Deploy**
```bash
# First commit your changes
git add .
git commit -m "Your changes"

# Then deploy
./deploy-with-git.sh
```
**What it does:**
- Pushes to GitHub
- Pulls on server
- Builds and deploys

### **Option 3: Quick Deploy (No Git)**
```bash
./deploy-quick.sh
```
**What it does:**
- Builds locally
- Uploads directly to server
- Deploys without Git

## ⚡ Super Fast Workflow

**For our development sessions:**
1. I make code changes
2. You run: `./deploy-one-command.sh "Feature description"`
3. Visit https://shuspot.com to test
4. Repeat!

**One command = Full deployment in ~30 seconds!**

## 🔧 Setup (One-time)

Make sure you have SSH key access to your server:
```bash
# Test SSH connection
ssh root@47.76.248.16

# If it asks for password, set up SSH key:
ssh-copy-id root@47.76.248.16
```

## 🎯 Usage Examples

```bash
# Deploy current Import Books tab
./deploy-one-command.sh "Add Import Books tab with clean interface"

# Quick test deployment
./deploy-quick.sh

# Deploy after manual commit
./deploy-with-git.sh
```

## 🔍 What Each Script Does

### deploy-one-command.sh
✅ Commits all changes  
✅ Pushes to GitHub  
✅ Pulls on server  
✅ Builds on server  
✅ Deploys with backup  
✅ Reloads nginx  

### deploy-with-git.sh
✅ Pushes to GitHub  
✅ Pulls on server  
✅ Builds and deploys  

### deploy-quick.sh
✅ Builds locally  
✅ Uploads via SCP  
✅ Deploys directly  

## 🛡️ Safety Features

- **Automatic backups** - Previous deployment saved before replacing
- **Build verification** - Stops if build fails
- **Error handling** - Stops on any error
- **Permission fixing** - Sets correct nginx permissions
- **Service reload** - Gracefully reloads nginx

## 🎉 Result

Instead of running 6+ commands manually, you now run **ONE COMMAND** and everything deploys automatically!

Perfect for our rapid development workflow! 🚀