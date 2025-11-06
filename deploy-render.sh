#!/bin/bash

# Render.com Deployment Helper Script
set -e

echo "================================================"
echo "   Chat App - Render.com Free Deployment"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you deploy to Render.com (FREE)${NC}"
echo ""

# Check if git repo exists
if [ ! -d .git ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    echo "Please initialize git first:"
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    exit 1
fi

# Check if render.yaml exists
if [ ! -f render.yaml ]; then
    echo -e "${RED}Error: render.yaml not found${NC}"
    exit 1
fi

# Get GitHub repo URL
echo -e "${YELLOW}Step 1: GitHub Repository${NC}"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$CURRENT_REMOTE" ]; then
    echo "No git remote found. Please add your GitHub repository:"
    read -p "Enter your GitHub repo URL: " REPO_URL
    git remote add origin "$REPO_URL"
else
    echo "Current remote: $CURRENT_REMOTE"
    read -p "Is this correct? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        read -p "Enter your GitHub repo URL: " REPO_URL
        git remote set-url origin "$REPO_URL"
    else
        REPO_URL=$CURRENT_REMOTE
    fi
fi

# Update render.yaml with repo URL
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|https://github.com/YOUR_USERNAME/YOUR_REPO.git|$REPO_URL|g" render.yaml
else
    sed -i "s|https://github.com/YOUR_USERNAME/YOUR_REPO.git|$REPO_URL|g" render.yaml
fi

echo -e "${GREEN}✓${NC} Repository configured"
echo ""

# Commit changes
echo -e "${YELLOW}Step 2: Commit and Push${NC}"
git add render.yaml
git add .
git commit -m "Add Render deployment configuration" 2>/dev/null || echo "No changes to commit"

echo "Pushing to GitHub..."
git push origin main || git push origin master

echo -e "${GREEN}✓${NC} Code pushed to GitHub"
echo ""

# Instructions for Render
echo "================================================"
echo -e "${GREEN}   Ready to Deploy!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}Next Steps (on Render.com):${NC}"
echo ""
echo "1. Go to: ${BLUE}https://render.com${NC}"
echo "2. Sign up/Login (free account)"
echo "3. Click: ${BLUE}New +${NC} → ${BLUE}Blueprint${NC}"
echo "4. Connect your GitHub account"
echo "5. Select this repository: ${BLUE}$REPO_URL${NC}"
echo "6. Click: ${BLUE}Apply${NC}"
echo ""
echo "Render will automatically:"
echo "  ✓ Create PostgreSQL database (free)"
echo "  ✓ Create Redis instance (free)"
echo "  ✓ Deploy backend service"
echo "  ✓ Deploy frontend service"
echo "  ✓ Generate SSL certificates"
echo ""
echo -e "${YELLOW}After Deployment:${NC}"
echo ""
echo "1. Go to your ${BLUE}backend service${NC} on Render"
echo "2. Click ${BLUE}Shell${NC} tab"
echo "3. Run: ${BLUE}npm run migrate${NC}"
echo ""
echo "4. Go to ${BLUE}Environment${NC} tab of backend"
echo "5. Update ${BLUE}CLIENT_URL${NC} to your frontend URL"
echo "   (e.g., https://chat-frontend-xxxx.onrender.com)"
echo ""
echo "6. Go to ${BLUE}Environment${NC} tab of frontend"
echo "7. Set ${BLUE}REACT_APP_API_URL${NC} to: your-backend-url/api"
echo "8. Set ${BLUE}REACT_APP_SOCKET_URL${NC} to: your-backend-url"
echo ""
echo "================================================"
echo -e "${GREEN}Your app will be live in ~5 minutes!${NC}"
echo "================================================"
echo ""
echo "URLs will be like:"
echo "  Backend:  https://chat-backend-xxxx.onrender.com"
echo "  Frontend: https://chat-frontend-xxxx.onrender.com"
echo ""
echo -e "${BLUE}Pro Tip:${NC} First request after 15min inactivity takes 30-60s (free tier)"
echo "Use UptimeRobot to keep it awake: https://uptimerobot.com"
echo ""
