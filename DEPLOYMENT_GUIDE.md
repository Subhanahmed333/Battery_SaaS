# 🚀 Murick Battery Shop Management System - Deployment Guide

## Overview
This guide provides deployment options for the Murick Battery Shop Management System, a secure offline-first application for battery retail shops.

## 🏗️ System Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: In-memory storage (easily upgradeable to MongoDB/PostgreSQL)
- **Authentication**: Shop-based secure authentication system

---

## 🔐 Security Features Implemented
✅ **Secure Authentication**: Shop ID + Username + Password required  
✅ **Shop Isolation**: Complete data separation between shops  
✅ **No Global Shop List**: Prevents unauthorized shop discovery  
✅ **Role-based Access**: Owner, Manager, Cashier roles  
✅ **Settings Management**: Shop details and user management  

---

## 📋 Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **yarn** package manager
- **Docker** (for containerized deployment)

---

## 🏠 Option 1: Local Development Deployment

### Step 1: Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd murick-battery-shop

# Install frontend dependencies
cd frontend
yarn install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```

### Step 2: Environment Configuration
The application comes pre-configured with:
- Frontend: `REACT_APP_BACKEND_URL` (configured for local development)
- Backend: In-memory storage (no database setup required)

### Step 3: Start Services
```bash
# Start backend (from backend directory)
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Start frontend (from frontend directory, new terminal)
cd frontend
yarn start
```

### Step 4: Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001

---

## 🐳 Option 2: Docker Deployment (Recommended for Production)

### Step 1: Create Docker Files

**Dockerfile** (in root directory):
```dockerfile
# Multi-stage build for production

# Backend stage
FROM python:3.9-slim as backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Frontend build stage
FROM node:16-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ .
RUN yarn build

# Production stage
FROM python:3.9-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Install nginx to serve frontend
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80 8001

# Start script
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  murick-app:
    build: .
    ports:
      - "80:80"
      - "8001:8001"
    volumes:
      - app-data:/app/data
    environment:
      - ENVIRONMENT=production
    restart: unless-stopped

volumes:
  app-data:
```

**nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream backend {
        server localhost:8001;
    }

    server {
        listen 80;
        server_name localhost;

        # Serve React frontend
        location / {
            root /app/frontend/build;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Proxy API requests to backend
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

**start.sh**:
```bash
#!/bin/bash
# Start nginx
nginx &

# Start backend
cd /app/backend && python -m uvicorn server:app --host 0.0.0.0 --port 8001 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
```

### Step 2: Deploy
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## ☁️ Option 3: Cloud Deployment

### AWS EC2 Deployment
```bash
# Launch EC2 instance (Ubuntu 20.04 LTS)
# Install Docker and Docker Compose

# Clone repository
git clone <your-repo-url>
cd murick-battery-shop

# Deploy with Docker Compose
docker-compose up -d

# Configure security groups:
# - Allow HTTP (port 80) from anywhere
# - Allow HTTPS (port 443) if using SSL
# - Allow SSH (port 22) from your IP
```

### DigitalOcean Droplet
```bash
# Create droplet with Docker pre-installed
# SSH into droplet
ssh root@your-droplet-ip

# Clone and deploy
git clone <your-repo-url>
cd murick-battery-shop
docker-compose up -d
```

### VPS Deployment (Any Provider)
1. **Provision VPS** with Ubuntu 20.04+
2. **Install Docker**: `curl -sSL https://get.docker.com/ | sh`
3. **Clone repo** and run `docker-compose up -d`
4. **Configure firewall** to allow ports 80 and 443

---

## 🔧 Configuration Options

### Environment Variables
```bash
# Frontend (.env)
REACT_APP_BACKEND_URL=http://localhost:8001

# Backend (.env)
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Persistent Data Storage
For production, modify `docker-compose.yml` to use volumes:
```yaml
volumes:
  - ./data:/app/backend/data  # For persistent storage
```

---

## 🛡️ Security Recommendations

### For Local Deployment:
- ✅ Use in a controlled local network
- ✅ Regular backups of shop data
- ✅ Strong passwords for shop users

### For Cloud Deployment:
- 🔒 **Use HTTPS**: Set up SSL certificates (Let's Encrypt)
- 🔒 **Firewall**: Configure proper security groups/firewall rules
- 🔒 **Regular Updates**: Keep system and dependencies updated
- 🔒 **Backup Strategy**: Implement automated backups
- 🔒 **Monitoring**: Set up basic monitoring and alerts

### SSL Certificate Setup (Production)
```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot
sudo certbot --nginx -d yourdomain.com

# Update nginx config for HTTPS
```

---

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Check application status
curl http://localhost:8001/api/health

# Check frontend
curl http://localhost
```

### Backup Strategy
```bash
# Backup shop data (if using file storage)
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec murick-app tar -czf /tmp/backup_$DATE.tar.gz /app/data
docker cp murick-app:/tmp/backup_$DATE.tar.gz ./backups/
```

---

## 🚨 Troubleshooting

### Common Issues:

**Frontend not loading:**
```bash
# Check if backend is running
curl http://localhost:8001/api/health

# Check frontend build
ls frontend/build/
```

**Authentication not working:**
```bash
# Verify shop configuration
# Check browser console for errors
# Ensure Shop ID format is correct
```

**Docker issues:**
```bash
# View logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild if needed
docker-compose down && docker-compose up --build -d
```

---

## 🎯 Post-Deployment Checklist

- [ ] ✅ Application accessible via web browser
- [ ] ✅ Shop setup wizard works correctly
- [ ] ✅ Authentication with Shop ID + credentials works
- [ ] ✅ All features (inventory, sales, reports, settings) functional
- [ ] ✅ Data persistence verified
- [ ] ✅ Backup strategy implemented (for production)
- [ ] ✅ SSL certificate configured (for cloud deployment)
- [ ] ✅ Basic monitoring set up (for production)

---

## 📞 Support and Maintenance

### Application Updates:
1. Pull latest code changes
2. Rebuild Docker images: `docker-compose up --build -d`
3. Test functionality

### Database Migration (Future):
The current system uses in-memory storage. To upgrade to persistent database:
1. Install MongoDB/PostgreSQL
2. Update backend configuration
3. Implement data migration scripts

---

## 🏁 Getting Started

1. **Choose deployment option** based on your needs
2. **Follow setup instructions** for your chosen option
3. **Access application** and create your first shop
4. **Save your Shop ID** securely (displayed during setup)
5. **Configure users** and shop settings as needed

**Your first login will require:**
- Shop ID (generated during setup)
- Username (created during setup)
- Password (created during setup)

---

*This deployment guide covers all major deployment scenarios. Choose the option that best fits your technical requirements and infrastructure setup.*