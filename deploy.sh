#!/bin/bash

# Chat App Deployment Script
set -e

echo "================================================"
echo "   Chat App Production Deployment"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check required variables
required_vars=("DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "CLIENT_URL" "API_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set in .env.production${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓${NC} Environment variables loaded"

# Create necessary directories
mkdir -p uploads ssl

# Check if SSL certificates exist
if [ ! -f ssl/fullchain.pem ] || [ ! -f ssl/privkey.pem ]; then
    echo -e "${YELLOW}⚠${NC} SSL certificates not found in ./ssl/"
    echo "Would you like to:"
    echo "1) Use Let's Encrypt (requires domain pointing to this server)"
    echo "2) Use self-signed certificates (for testing only)"
    echo "3) I'll add certificates manually later"
    read -p "Enter choice (1-3): " ssl_choice

    case $ssl_choice in
        1)
            echo "Setting up Let's Encrypt..."
            # Install certbot if not available
            if ! command -v certbot &> /dev/null; then
                echo "Installing certbot..."
                sudo apt-get update && sudo apt-get install -y certbot
            fi

            # Get certificate
            sudo certbot certonly --standalone \
                --non-interactive \
                --agree-tos \
                --email ${SSL_EMAIL:-admin@example.com} \
                -d ${DOMAIN}

            # Copy certificates
            sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ssl/
            sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ssl/
            sudo chmod 644 ssl/*.pem
            ;;
        2)
            echo "Generating self-signed certificate..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout ssl/privkey.pem \
                -out ssl/fullchain.pem \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN:-localhost}"
            echo -e "${YELLOW}⚠ Self-signed certificate created (not for production!)${NC}"
            ;;
        3)
            echo -e "${YELLOW}⚠ Please add your certificates to ./ssl/ before starting${NC}"
            echo "Required files: fullchain.pem and privkey.pem"
            ;;
    esac
fi

echo -e "${GREEN}✓${NC} SSL certificates ready"

# Pull latest images
echo "Pulling Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build images
echo "Building application images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker exec chat-backend npm run migrate || {
    echo -e "${RED}Migration failed! Check logs with: docker-compose -f docker-compose.prod.yml logs backend${NC}"
    exit 1
}

echo -e "${GREEN}✓${NC} Database migrations completed"

# Check service health
echo "Checking service health..."
services=("postgres" "redis" "backend" "frontend" "nginx")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*Up"; then
        echo -e "${GREEN}✓${NC} $service is running"
    else
        echo -e "${RED}✗${NC} $service is not running"
    fi
done

# Display status
echo ""
echo "================================================"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Your chat app is now running:"
echo "  • Frontend: ${CLIENT_URL}"
echo "  • Backend API: ${API_URL}/api"
echo "  • Health Check: ${API_URL}/health"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop app:      docker-compose -f docker-compose.prod.yml down"
echo "  Restart app:   docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "================================================"
