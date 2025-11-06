# Production Deployment Guide

This guide covers deploying the chat application to production on various platforms.

## Table of Contents
1. [VPS/Cloud Server Deployment](#vps-deployment)
2. [AWS Deployment](#aws-deployment)
3. [DigitalOcean Deployment](#digitalocean-deployment)
4. [Heroku Deployment](#heroku-deployment)
5. [Monitoring & Maintenance](#monitoring)

---

## Prerequisites

- Domain name pointed to your server
- Server with:
  - Ubuntu 20.04+ / Debian 11+
  - 2GB+ RAM (4GB recommended)
  - 20GB+ storage
  - Docker & Docker Compose installed

---

## VPS Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository

```bash
# Clone your repository
git clone <your-repo-url> chat-app
cd chat-app
```

### Step 3: Configure Environment

```bash
# Copy production environment template
cp .env.production .env.production.local

# Edit with your values
nano .env.production.local
```

**Required Configuration:**

```env
# Strong passwords
DB_PASSWORD=your_secure_database_password_here
REDIS_PASSWORD=your_secure_redis_password_here

# Generate JWT secret (run this command):
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_character_hex_string_here

# Your domain
CLIENT_URL=https://yourdomain.com
API_URL=https://yourdomain.com

# SSL email for Let's Encrypt
SSL_EMAIL=admin@yourdomain.com
DOMAIN=yourdomain.com
```

### Step 4: Deploy

```bash
# Run deployment script
./deploy.sh
```

The script will:
- ✅ Validate configuration
- ✅ Setup SSL certificates (Let's Encrypt or self-signed)
- ✅ Build Docker images
- ✅ Start all services
- ✅ Run database migrations
- ✅ Verify health

### Step 5: Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://yourdomain.com/health
```

---

## AWS Deployment

### Option 1: EC2 with Docker

1. **Launch EC2 Instance**
   - AMI: Ubuntu 20.04
   - Instance type: t3.medium or larger
   - Security group: Allow ports 80, 443, 22

2. **Setup RDS (PostgreSQL)**
   - Engine: PostgreSQL 15
   - Instance class: db.t3.micro or larger
   - Note the endpoint URL

3. **Setup ElastiCache (Redis)**
   - Engine: Redis 7
   - Node type: cache.t3.micro or larger
   - Note the endpoint URL

4. **Deploy Application**

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Follow VPS deployment steps above
# Update .env.production with RDS and ElastiCache endpoints

DB_HOST=your-rds-endpoint.rds.amazonaws.com
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
```

### Option 2: ECS with Fargate

See `docs/aws-ecs-deployment.md` for ECS setup.

---

## DigitalOcean Deployment

### Option 1: Droplet

1. **Create Droplet**
   - Distribution: Ubuntu 22.04
   - Plan: Basic ($12/month or higher)
   - Add SSH key

2. **Setup Managed Databases** (Optional but recommended)
   - Create PostgreSQL cluster
   - Create Redis cluster

3. **Deploy**

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Follow VPS deployment steps
# If using managed databases, update .env.production:
DB_HOST=your-db-cluster.db.ondigitalocean.com
DB_PORT=25060
REDIS_HOST=your-redis-cluster.db.ondigitalocean.com
```

### Option 2: App Platform

1. Fork the repository
2. Connect to DigitalOcean App Platform
3. Configure build settings:
   - Backend: Dockerfile
   - Frontend: client/Dockerfile
4. Add environment variables from `.env.production`
5. Deploy

---

## Heroku Deployment

### Prepare Application

```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or
curl https://cli-assets.heroku.com/install.sh | sh  # Linux

# Login
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini
```

### Deploy

```bash
# Set environment variables
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set NODE_ENV=production
heroku config:set CLIENT_URL=https://your-app-name.herokuapp.com

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate

# Open app
heroku open
```

---

## Post-Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (64+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (UFW)
- [ ] Set up fail2ban
- [ ] Enable rate limiting
- [ ] Restrict database access
- [ ] Enable Redis password
- [ ] Regular security updates

### Performance Optimization

```bash
# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Monitor resource usage
docker stats

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

---

## Monitoring

### Setup Monitoring (Optional)

1. **Application Monitoring**
   ```bash
   # Install PM2 for process monitoring
   npm install -g pm2

   # Or use Docker health checks
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Log Aggregation**
   ```bash
   # View all logs
   docker-compose -f docker-compose.prod.yml logs -f

   # Specific service
   docker-compose -f docker-compose.prod.yml logs -f backend
   ```

3. **Uptime Monitoring**
   - Use UptimeRobot (free)
   - Monitor: `https://yourdomain.com/health`

### Backup Strategy

```bash
# Backup database
docker exec chat-postgres pg_dump -U postgres chatapp > backup_$(date +%Y%m%d).sql

# Automate with cron
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Rebuild if needed
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker exec chat-postgres pg_isready

# Check Redis
docker exec chat-redis redis-cli ping

# View connection logs
docker-compose -f docker-compose.prod.yml logs postgres redis
```

### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ssl/

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### WebSocket Connection Failed

1. Check nginx configuration supports WebSocket
2. Verify firewall allows WebSocket connections
3. Check CORS settings in backend
4. Test with: `wscat -c wss://yourdomain.com/socket.io`

---

## Scaling

### Horizontal Scaling

```bash
# Scale backend to 5 instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=5

# Load balancer (nginx) automatically distributes traffic
```

### Database Scaling

1. **Read Replicas**: Add PostgreSQL read replicas
2. **Connection Pooling**: Already configured (max 20 per instance)
3. **Partitioning**: Partition messages table by date

### Redis Scaling

1. **Redis Cluster**: Use Redis Cluster for high availability
2. **Sentinel**: Setup Redis Sentinel for automatic failover

---

## Updates & Rollbacks

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
docker-compose -f docker-compose.prod.yml up -d --build

# Run new migrations
docker exec chat-backend npm run migrate
```

### Rollback

```bash
# Revert to previous version
git checkout <previous-commit>

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Cost Estimates

### DigitalOcean
- Droplet (2GB): $12/month
- Managed PostgreSQL: $15/month
- Managed Redis: $15/month
- **Total: ~$42/month**

### AWS
- EC2 t3.medium: ~$30/month
- RDS db.t3.micro: ~$15/month
- ElastiCache t3.micro: ~$15/month
- **Total: ~$60/month**

### Heroku
- Hobby tier: $7/month (app)
- PostgreSQL Mini: $5/month
- Redis Mini: $3/month
- **Total: ~$15/month**

---

## Support

For deployment issues:
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- GitHub Issues: <your-repo-url>/issues
- Documentation: README.md, ARCHITECTURE.md

---

## Quick Commands Reference

```bash
# Start application
docker-compose -f docker-compose.prod.yml up -d

# Stop application
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Check status
docker-compose -f docker-compose.prod.yml ps

# Run migrations
docker exec chat-backend npm run migrate

# Backup database
docker exec chat-postgres pg_dump -U postgres chatapp > backup.sql

# Restore database
cat backup.sql | docker exec -i chat-postgres psql -U postgres chatapp
```
