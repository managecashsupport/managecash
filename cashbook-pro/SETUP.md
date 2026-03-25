# CashBook Pro - Setup Guide

This guide provides step-by-step instructions to set up CashBook Pro with your Aiven PostgreSQL database.

## 🗄️ Database Setup with Aiven PostgreSQL

### 1. Database Connection Test

First, let's test your Aiven PostgreSQL connection:

```bash
cd backend
node src/scripts/test-connection.js
```

This script will:
- Test the database connection
- Verify SSL configuration
- Check available schemas
- List existing tables

### 2. Environment Configuration

Update your `backend/.env` file with the correct Aiven PostgreSQL connection:

```env
# Database (Aiven PostgreSQL)
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority"

# JWT Configuration
JWT_ACCESS_SECRET="your-super-secret-access-jwt-key-change-this"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-this"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="30d"
SUPERADMIN_JWT_SECRET="your-superadmin-jwt-secret-change-this"

# Cookie
COOKIE_SECRET="your-cookie-secret-change-this"

# Cloudflare R2 (Optional - for file uploads)
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="cashbook-pro-uploads"
R2_ACCOUNT_ID="your-r2-account-id"
R2_PUBLIC_URL="https://your-r2-public-url"

# Razorpay (Optional - for billing)
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"

# Email (Optional - for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Application
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Database Migrations

Run the database migrations to create the schema:

```bash
# Install Prisma CLI if not already installed
npm install -g prisma

# Run migrations
npx prisma migrate dev --name init

# This will create the initial schema in your Aiven PostgreSQL database
```

### 4. Database Seeding

Seed the database with sample data:

```bash
node src/scripts/seed.js
```

This will create:
- Super Admin user
- Sample tenant shops
- Sample transactions
- Sample staff members

## 🚀 Application Setup

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the backend server:**
   ```bash
   npm run dev
   ```

   The backend will start on `http://localhost:5000`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure frontend environment:**
   Create `frontend/.env`:
   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_API_TIMEOUT=10000

   # Feature Flags
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_BILLING=true
   VITE_ENABLE_SUPERADMIN=false

   # App Configuration
   VITE_APP_NAME=CashBook Pro
   VITE_APP_VERSION=1.0.0
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:5173`

## 🔐 Authentication Setup

### Default Login Credentials

After seeding, you can use these credentials:

**Super Admin:**
- Email: `superadmin@cashbookpro.com`
- Password: `superadmin123`

**Sample Shop Owners:**
- Email: `john@abcstore.com` / Password: `password123`
- Email: `jane@xyzelectronics.com` / Password: `password123`
- Email: `bob@quickmart.com` / Password: `password123`

## 🛠️ Configuration Options

### Optional Services Setup

#### Cloudflare R2 (File Uploads)
1. Create a Cloudflare R2 bucket
2. Generate access keys
3. Update the R2 environment variables in `backend/.env`

#### Razorpay (Billing)
1. Create a Razorpay account
2. Get API keys from Razorpay dashboard
3. Update the Razorpay environment variables in `backend/.env`

#### Email Notifications
1. Set up SMTP credentials (Gmail, SendGrid, etc.)
2. Update the SMTP environment variables in `backend/.env`

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
- **SSL Issues**: Ensure `sslmode=require` is in your connection string
- **Network Issues**: Check if your Aiven PostgreSQL allows connections from your IP
- **Credentials**: Verify username and password are correct

#### 2. CORS Issues
- Ensure `FRONTEND_URL` is correctly set in `backend/.env`
- The backend automatically configures CORS based on this value

#### 3. Migration Issues
- If migrations fail, try: `npx prisma migrate reset`
- This will drop and recreate the database (use with caution in production)

#### 4. Port Conflicts
- Change the `PORT` in `backend/.env` if 5000 is already in use
- Update `VITE_API_BASE_URL` in `frontend/.env` accordingly

### Testing the Setup

1. **Test backend API:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Test database connection:**
   ```bash
   node src/scripts/test-connection.js
   ```

3. **Test frontend:**
   - Open `http://localhost:5173` in your browser
   - Try logging in with the sample credentials

## 🚀 Production Deployment

### Backend Production Setup

1. **Environment Variables:**
   - Set `NODE_ENV=production`
   - Use strong, unique secrets for JWT and cookies
   - Configure production database URL

2. **Database Migration:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start Production Server:**
   ```bash
   npm start
   ```

### Frontend Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Serve the build:**
   ```bash
   npm install -g serve
   serve -s dist
   ```

## 📊 Monitoring and Maintenance

### Database Monitoring
- Use Aiven console to monitor database performance
- Set up alerts for connection limits and storage usage

### Application Monitoring
- Monitor API response times
- Check error logs regularly
- Set up health checks

### Security Best Practices
- Use strong, unique passwords
- Enable 2FA where possible
- Regularly update dependencies
- Use HTTPS in production

## 🆘 Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test database connection independently
4. Check the [main README](README.md) for additional troubleshooting

For additional help:
- Create an issue on GitHub
- Check the project documentation
- Review the code comments for implementation details

---

**🎉 Your CashBook Pro application is now ready to use with Aiven PostgreSQL!**