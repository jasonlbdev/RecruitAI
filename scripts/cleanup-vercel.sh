#!/bin/bash

# 🧹 Vercel Deployment Cleanup Script
# This script helps clean up old and failed Vercel deployments

echo "🚀 RecruitAI - Vercel Cleanup Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed. Please install it first:${NC}"
    echo "npm i -g vercel"
    exit 1
fi

echo -e "${BLUE}📊 Current deployment status:${NC}"
vercel ls

echo ""
echo -e "${YELLOW}⚠️  CLEANUP OPTIONS:${NC}"
echo "1. Clean all ERROR deployments (recommended)"
echo "2. Clean all deployments except latest 3"
echo "3. Clean specific deployment URL"
echo "4. Show deployment info only"
echo "5. Exit"

read -p "Choose option (1-5): " option

case $option in
    1)
        echo -e "${BLUE}🧹 Cleaning all ERROR deployments...${NC}"
        
        # Get error deployment URLs
        ERROR_DEPLOYMENTS=$(vercel ls | grep "● Error" | awk '{print $2}')
        
        if [ -z "$ERROR_DEPLOYMENTS" ]; then
            echo -e "${GREEN}✅ No error deployments found!${NC}"
        else
            echo "Found error deployments:"
            echo "$ERROR_DEPLOYMENTS"
            echo ""
            read -p "Confirm cleanup of error deployments? (y/N): " confirm
            
            if [[ $confirm =~ ^[Yy]$ ]]; then
                echo "$ERROR_DEPLOYMENTS" | while read url; do
                    if [ ! -z "$url" ]; then
                        echo -e "${BLUE}Removing: $url${NC}"
                        vercel rm "$url" --yes
                    fi
                done
                echo -e "${GREEN}✅ Error deployments cleaned!${NC}"
            else
                echo -e "${YELLOW}⏭️  Cleanup cancelled.${NC}"
            fi
        fi
        ;;
        
    2)
        echo -e "${BLUE}🧹 Cleaning old deployments (keeping latest 3)...${NC}"
        echo -e "${YELLOW}⚠️  This will remove all but the 3 most recent deployments${NC}"
        read -p "Are you sure? (y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            # Get all deployment URLs except the first 3
            OLD_DEPLOYMENTS=$(vercel ls | tail -n +5 | awk '{print $2}')
            
            if [ -z "$OLD_DEPLOYMENTS" ]; then
                echo -e "${GREEN}✅ No old deployments to clean!${NC}"
            else
                echo "$OLD_DEPLOYMENTS" | while read url; do
                    if [ ! -z "$url" ]; then
                        echo -e "${BLUE}Removing: $url${NC}"
                        vercel rm "$url" --yes
                    fi
                done
                echo -e "${GREEN}✅ Old deployments cleaned!${NC}"
            fi
        else
            echo -e "${YELLOW}⏭️  Cleanup cancelled.${NC}"
        fi
        ;;
        
    3)
        echo -e "${BLUE}🎯 Remove specific deployment${NC}"
        read -p "Enter deployment URL: " url
        
        if [ ! -z "$url" ]; then
            echo -e "${BLUE}Removing: $url${NC}"
            vercel rm "$url"
            echo -e "${GREEN}✅ Deployment removed!${NC}"
        else
            echo -e "${RED}❌ No URL provided${NC}"
        fi
        ;;
        
    4)
        echo -e "${BLUE}📊 Current deployment information:${NC}"
        echo ""
        vercel ls
        echo ""
        echo -e "${BLUE}📈 Deployment statistics:${NC}"
        TOTAL=$(vercel ls | grep -c "https://")
        ERRORS=$(vercel ls | grep -c "● Error")
        READY=$(vercel ls | grep -c "● Ready")
        
        echo "Total deployments: $TOTAL"
        echo "Error deployments: $ERRORS"
        echo "Ready deployments: $READY"
        echo ""
        
        if [ $TOTAL -gt 50 ]; then
            echo -e "${YELLOW}⚠️  Warning: High number of deployments detected${NC}"
            echo "Consider cleaning up to avoid hitting daily limits"
        fi
        ;;
        
    5)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}📊 Updated deployment status:${NC}"
vercel ls

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "1. Wait for daily deployment limit to reset (~2 hours)"
echo "2. Run: npm run build"
echo "3. Run: vercel --prod"
echo "4. Configure OpenAI API key in deployed app"

echo ""
echo -e "${YELLOW}📚 For more details, see DEPLOYMENT_GUIDE.md${NC}" 