# Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Deployments](#cloud-deployments)
5. [Monitoring](#monitoring)

## Local Development

### Setup
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your local configuration

# Start PostgreSQL and Redis
# Option 1: Use Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d -p 6379:6379 redis:7

# Option 2: Use local installations
brew install postgresql redis
brew services start postgresql
brew services start redis

# Create database and run migrations
createdb chatapp
npm run migrate

# Start development servers
npm run dev
```

## Docker Deployment

### Basic Docker Compose

```bash
# Start all services
docker-compose up -d

# Run migrations
docker exec chat-backend npm run migrate

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Scaling with Docker

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# With load balancer (uncomment nginx service in docker-compose.yml)
docker-compose up -d backend backend-2 nginx
```

## Production Deployment

### Prerequisites
- VPS or Cloud instance (2GB+ RAM recommended)
- Domain name
- SSL certificate

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install Nginx
sudo apt install nginx -y

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Step 2: Database Setup

```bash
# Create database user
sudo -u postgres createuser --interactive --pwprompt chatuser

# Create database
sudo -u postgres createdb -O chatuser chatapp

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host    all    all    0.0.0.0/0    md5

sudo systemctl restart postgresql
```

### Step 3: Application Deployment

```bash
# Clone repository
git clone <your-repo-url> /var/www/chat
cd /var/www/chat

# Install dependencies
npm ci --production
cd client && npm ci && npm run build && cd ..

# Setup environment
cp .env.example .env
nano .env  # Configure production values

# Run migrations
npm run migrate

# Create uploads directory
mkdir -p uploads
```

### Step 4: Process Manager (PM2)

```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start server/index.js --name chat-backend -i max

# Or use clustering
pm2 start server/cluster.js --name chat-cluster

# Setup PM2 startup
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs chat-backend
```

### Step 5: Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/chat
```

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend (React build)
    location / {
        root /var/www/chat/client/build;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket (Socket.io)
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploaded files
    location /uploads {
        alias /var/www/chat/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

## Cloud Deployments

### AWS Deployment

#### Architecture
- **EC2**: Application servers
- **RDS PostgreSQL**: Database
- **ElastiCache Redis**: Cache/sessions
- **S3**: File uploads
- **CloudFront**: CDN
- **ALB**: Load balancer
- **Route 53**: DNS

#### Steps

1. **Create RDS PostgreSQL instance**
2. **Create ElastiCache Redis cluster**
3. **Create S3 bucket for uploads**
4. **Launch EC2 instances** (Auto Scaling Group)
5. **Configure Application Load Balancer**
6. **Setup CloudFront distribution**
7. **Configure Route 53**

### DigitalOcean Deployment

```bash
# Create Droplet (Ubuntu 22.04, 2GB RAM+)
# Add your SSH key

# SSH into droplet
ssh root@your-droplet-ip

# Follow production deployment steps above

# Use DigitalOcean Managed Databases
# - Create PostgreSQL cluster
# - Create Redis cluster
# Update .env with connection strings
```

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add buildpacks
heroku buildpacks:add heroku/nodejs

# Provision add-ons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate

# Open app
heroku open
```

## Monitoring

### Application Monitoring

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# PM2 Web Dashboard
pm2 link <secret> <public>  # Get from pm2.io
```

### Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Database connectivity
psql -h localhost -U postgres -d chatapp -c "SELECT 1"

# Redis connectivity
redis-cli ping
```

### Log Management

```bash
# View application logs
pm2 logs chat-backend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Performance Monitoring

Tools to consider:
- **PM2 Plus**: Application monitoring
- **Datadog**: Full-stack monitoring
- **New Relic**: APM
- **Prometheus + Grafana**: Metrics and dashboards
- **ELK Stack**: Log aggregation

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump -h localhost -U postgres chatapp > backup_$(date +%Y%m%d).sql

# Automated daily backups (cron)
echo "0 2 * * * pg_dump -h localhost -U postgres chatapp > /backups/chatapp_\$(date +\%Y\%m\%d).sql" | crontab -

# Restore from backup
psql -h localhost -U postgres chatapp < backup_20231201.sql
```

### Redis Backups

```bash
# Manual snapshot
redis-cli BGSAVE

# Configure automatic snapshots (redis.conf)
save 900 1
save 300 10
save 60 10000
```

## Rollback Strategy

```bash
# Using PM2
pm2 deploy production revert 1

# Using Git
git checkout <previous-commit>
npm install
npm run build
pm2 restart all

# Database rollback
psql -h localhost -U postgres chatapp < backup_before_migration.sql
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (UFW)
- [ ] Set up fail2ban
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] Redis password protection
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Regular backups enabled

## Troubleshooting

### Common Issues

**WebSocket not connecting:**
- Check nginx WebSocket configuration
- Verify firewall allows WebSocket connections
- Check CORS settings

**Database connection errors:**
- Verify credentials
- Check PostgreSQL is running
- Verify network connectivity
- Check connection pool limits

**High memory usage:**
- Check for memory leaks
- Adjust PM2 max memory restart
- Scale horizontally with more instances

**Slow performance:**
- Check database query performance
- Add database indexes
- Enable Redis caching
- Use CDN for static assets
