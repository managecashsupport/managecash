# CashBook Pro

A complete business management solution built with modern technologies, featuring multi-tenant architecture, real-time analytics, and comprehensive financial tracking.

## 🚀 Features

### Core Functionality
- **Multi-Tenant Architecture**: Schema-per-tenant approach for complete data isolation
- **Real-time Analytics**: Interactive charts and comprehensive business insights
- **Transaction Management**: Complete CRUD operations with advanced filtering
- **User Management**: Role-based access control (Admin, Staff, Super Admin)
- **File Upload**: Image support for transaction documentation
- **Billing & Subscriptions**: Integrated payment processing with Razorpay

### Business Features
- **Income & Expense Tracking**: Categorized financial management
- **Customer & Supplier Management**: Complete contact tracking
- **Payment Mode Tracking**: Cash and online payment support
- **Staff Management**: Multi-user support with permission controls
- **Search & Filter**: Advanced search capabilities across all data
- **Export & Reports**: PDF and Excel export functionality

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Real-time Updates**: Live data synchronization
- **Responsive Design**: Mobile-first responsive interface
- **Modern Tech Stack**: React 18, Node.js, PostgreSQL, Prisma
- **Cloud Storage**: Cloudflare R2 integration for file storage
- **Email Notifications**: Automated email system for important events

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Prisma ORM** - Database ORM with multi-tenant support
- **PostgreSQL** - Primary database (Aiven hosting)
- **JWT** - Authentication and authorization
- **Cloudflare R2** - File storage
- **Razorpay** - Payment processing
- **Nodemailer** - Email service

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **React Router** - Client-side routing
- **Chart.js** - Data visualization
- **React Hook Form** - Form management
- **React Query** - State management and caching

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Conventional Commits** - Commit message standards

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Cloudflare R2 account (for file storage)
- Razorpay account (for billing)
- SMTP email service

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd cashbook-pro
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Cloudflare R2
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="cashbook-pro-uploads"
R2_ACCOUNT_ID="your-r2-account-id"

# Razorpay
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Application
PORT=5000
NODE_ENV=development
```

#### Database Setup
```bash
# Run migrations
npx prisma migrate dev

# Seed database with sample data
node src/scripts/seed.js
```

#### Start Backend
```bash
npm run dev
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Configuration
Create `.env` file in the frontend directory:
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

#### Start Frontend
```bash
npm run dev
```

## 🏗 Project Structure

```
cashbook-pro/
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── middleware/         # Authentication & authorization
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── prisma/            # Database schema
│   │   └── scripts/           # Database scripts
│   └── package.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── context/           # React context
│   │   ├── services/          # API services
│   │   └── styles/            # Global styles
│   └── package.json
└── README.md
```

## 🔐 Authentication

The application uses JWT-based authentication with role-based access control:

- **Super Admin**: Platform-wide management
- **Admin**: Shop owner with full access
- **Staff**: Limited access based on permissions

### Login Credentials (After Seeding)
- **Super Admin**: superadmin@cashbookpro.com / superadmin123
- **Sample Shop 1**: john@abcstore.com / password123
- **Sample Shop 2**: jane@xyzelectronics.com / password123

## 📊 Multi-Tenant Architecture

The application implements a schema-per-tenant approach:

- Each tenant gets their own database schema
- Complete data isolation between tenants
- Automatic tenant resolution from JWT tokens
- Schema provisioning on tenant registration

## 🎨 UI Components

### Available Components
- **Layout**: Responsive layout system
- **AuthContext**: Authentication state management
- **ProtectedRoute**: Route protection
- **SummaryCards**: Dashboard summary widgets
- **TransactionCard**: Transaction display cards
- **DonutChart**: Chart.js integration
- **Pagination**: Advanced pagination
- **Modal**: Modal dialogs
- **Toast**: Notification system
- **LoadingSpinner**: Loading indicators

### Available Hooks
- **useAuth**: Authentication state
- **useTransactions**: Transaction data management
- **useUpload**: File upload functionality
- **useLocalStorage**: Local storage management
- **useDebounce**: Debounced values

## 📈 Analytics & Reports

The application provides comprehensive analytics:

- **Real-time Charts**: Interactive Chart.js visualizations
- **Business Insights**: AI-powered recommendations
- **Export Options**: PDF and Excel export
- **Custom Reports**: User-defined report parameters

## 💳 Billing & Subscriptions

Integrated billing system with:
- **Multiple Plans**: Starter, Growth, Pro tiers
- **Payment Processing**: Razorpay integration
- **Subscription Management**: Automatic renewals
- **Invoice Generation**: PDF invoice creation

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Billing
- `GET /api/billing/plans` - Get available plans
- `POST /api/billing/subscribe` - Subscribe to plan
- `GET /api/billing/history` - Get billing history

### Super Admin
- `GET /api/superadmin/tenants` - List all tenants
- `POST /api/superadmin/tenants` - Create tenant
- `PUT /api/superadmin/tenants/:id` - Update tenant
- `DELETE /api/superadmin/tenants/:id` - Delete tenant

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `npx prisma migrate deploy`
4. Start the server: `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Serve the build files with a web server (Nginx, Apache, etc.)

### Docker Deployment
Docker support is planned for future releases.

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit your changes: `git commit -m 'Add feature-name'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 🐛 Bug Reports

To report a bug or request a feature, please use the GitHub Issues section.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Prisma** - For the excellent ORM
- **React** - For the fantastic UI library
- **Tailwind CSS** - For the beautiful styling framework
- **Chart.js** - For the data visualization
- **Cloudflare** - For the R2 storage service

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@cashbookpro.com

---

**CashBook Pro** - Your complete business management solution! 🚀