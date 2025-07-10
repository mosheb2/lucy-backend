const fs = require('fs');
const path = require('path');

// Environment variables
const envVars = `# Server Configuration
PORT=3000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://bxgdijqjdtbgzycvngug.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2RpanFqZHRiZ3p5Y3ZuZ3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTI0NTMsImV4cCI6MjA2NzU2ODQ1M30.T_KZxQHOxYvgIYLGpDXVqCj9Vgdp8YFvgSt0JHsLvAc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2RpanFqZHRiZ3p5Y3ZuZ3VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk5MjQ1MywiZXhwIjoyMDY3NTY4NDUzfQ.pRE9GgKg8VhcBfMK3RdrwYruxZxDvQuHe4nS376yJSQ

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5174

# JWT Secret (for custom JWT)
JWT_SECRET=your_jwt_secret_here_replace_in_production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100`;

// Write to .env file
fs.writeFileSync(path.join(__dirname, '.env'), envVars);

console.log('Environment variables set up successfully for backend!'); 