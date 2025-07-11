#!/bin/bash

# Exit on error
set -e

echo "Deploying Lucy Backend to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "Heroku CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "You are not logged in to Heroku. Please run 'heroku login' first."
    exit 1
fi

# Set app name
APP_NAME="lucy-backend"

# Check if app exists
if ! heroku apps:info --app $APP_NAME &> /dev/null; then
    echo "Creating Heroku app $APP_NAME..."
    heroku create $APP_NAME
else
    echo "Using existing Heroku app $APP_NAME..."
fi

# Set environment variables
echo "Setting environment variables..."
heroku config:set NODE_ENV=production --app $APP_NAME
heroku config:set SUPABASE_URL=https://bxgdijqjdtbgzycvngug.supabase.co --app $APP_NAME
heroku config:set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2RpanFqZHRiZ3p5Y3ZuZ3VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk5MjQ1MywiZXhwIjoyMDY3NTY4NDUzfQ.oGMI_qLzaQhYQ7Vc_Yx-_Wvw8CJb5xAiZEZb8gAXA3M --app $APP_NAME
heroku config:set FRONTEND_URL=https://lucy-frontend.herokuapp.com --app $APP_NAME

# Create a temporary Git repository for deployment
echo "Creating temporary Git repository for deployment..."
TMP_DIR=$(mktemp -d)
cp -r ./* $TMP_DIR
cp -r .env* $TMP_DIR 2>/dev/null || true
cp -r .git* $TMP_DIR 2>/dev/null || true
cd $TMP_DIR

# Initialize Git repository
git init
git add .
git commit -m "Deploy to Heroku"

# Set Heroku remote
git remote add heroku https://git.heroku.com/$APP_NAME.git

# Push to Heroku
echo "Deploying to Heroku..."
git push heroku master --force

# Clean up
cd ..
rm -rf $TMP_DIR

echo "Deployment completed successfully!"
echo "Your API is now available at https://$APP_NAME.herokuapp.com" 