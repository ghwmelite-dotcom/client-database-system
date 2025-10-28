# 🚀 ClientPro Database

> **A Premium Client Database Management System built on Cloudflare's Edge Platform**

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://client-database-tji.pages.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://client-database-api.ghwmelite.workers.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern, full-stack client management platform with advanced analytics, file management, and user administration capabilities. Built for speed, security, and scalability on Cloudflare's global edge network.

---

## ✨ Features

### 🎨 **Beautiful User Interface**
- Stunning gradient-based design (Blue → Purple → Pink)
- Smooth animations and hover effects
- Fully responsive (mobile, tablet, desktop)
- Dark mode ready
- Professional modal designs

### 📊 **Advanced Dashboard**
- Real-time statistics (Total, Active, New, Inactive clients)
- Interactive charts with Recharts
  - Client Status Distribution (Pie Chart)
  - Client Growth Over Time (Line Chart)
  - New Clients by Month (Bar Chart)
- Quick action cards for easy navigation

### 📈 **Analytics & Reports**
- Comprehensive analytics dashboard
- Time range filtering (3/6/12 months)
- Multiple visualization types
  - Growth trend analysis
  - Status distribution
  - Geographic distribution (Top 10 states)
  - Monthly acquisition metrics
- CSV export functionality
- Monthly summary tables with growth calculations

### 👥 **Client Management**
- Full CRUD operations (Create, Read, Update, Delete)
- Advanced search and filtering
  - Search by name, phone, email
  - Filter by status (Active/Inactive/Archived)
- Detailed client view with:
  - Complete profile information
  - Notes system (add, view, delete)
  - File attachments (upload, download, delete)
  - Activity timeline
  - Quick stats sidebar
- CSV import/export
- Bulk operations support

### 📁 **File Management**
- Cloudflare R2 storage integration
- Drag-and-drop file upload
- Support for multiple file types (PDF, images, documents)
- 10MB file size limit
- File preview and download
- Secure file deletion
- File metadata tracking

### 👤 **User Management**
- Role-based access control (Admin/User)
- Complete user administration
  - Create new users
  - Edit user details
  - Delete users
  - Toggle active/inactive status
- User statistics dashboard
- Last login tracking
- Search and filter capabilities

### ⚙️ **Settings & Preferences**
- **Profile Management**
  - Update email
  - View username and role
- **Security**
  - Change password
  - Current password verification
  - Password strength requirements
- **Preferences**
  - Email notifications
  - SMS notifications
  - Language selection
  - Timezone configuration
- **Database Management**
  - Database information
  - Export/import capabilities
  - Data management tools

### 🔐 **Security Features**
- JWT-based authentication
- Bcrypt password hashing
- AES-256 SSN encryption
- Role-based access control
- Secure API endpoints
- CORS protection
- Input validation
- SQL injection prevention

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **Notifications:** React Hot Toast
- **Hosting:** Cloudflare Pages

### **Backend**
- **Framework:** Hono
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Authentication:** JWT (jose)
- **Password Hashing:** bcryptjs
- **Encryption:** Web Crypto API (AES-256)

### **DevOps**
- **CLI:** Wrangler
- **Version Control:** Git
- **Hosting:** Cloudflare Edge Network
- **CI/CD:** Cloudflare Pages CI

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Git

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/ghwmelite-dotcom/client-database-system.git
cd client-database-system
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
npm install
```

4. **Configure Environment**
```bash
# Frontend: Create .env.production
VITE_API_URL=https://your-worker.workers.dev/api

# Backend: Configure wrangler.toml
name = "client-database-api"
compatibility_date = "2024-01-01"
```

5. **Setup Database**
```bash
# Create D1 database
wrangler d1 create client-database

# Run migrations
wrangler d1 execute client-database --file=./migrations/0001_initial_schema.sql
```

6. **Deploy Frontend**
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name=client-database
```

7. **Deploy Backend**
```bash
cd backend
wrangler deploy
```

---

## 📖 Usage

### **Default Login Credentials**
```
Username: admin
Password: Admin@123
```

⚠️ **Important:** Change the default password immediately after first login!

### **Creating Your First Client**
1. Navigate to the **Clients** page
2. Click **"Add New Client"**
3. Fill in the client information
4. Optionally add initial notes
5. Click **"Save"**

### **Adding Notes to a Client**
1. Open a client's detail page
2. Navigate to the **Notes** tab
3. Enter your note in the text area
4. Click **"Add Note"**

### **Uploading Files**
1. Open a client's detail page
2. Navigate to the **Files** tab
3. Drag and drop files or click to browse
4. Files are automatically uploaded to Cloudflare R2

### **Managing Users (Admin Only)**
1. Navigate to the **Users** page
2. Click **"Add New User"**
3. Fill in user details and select role
4. Save to create the user

### **Viewing Analytics**
1. Go to the **Analytics** page
2. Select time range (3/6/12 months)
3. View charts and metrics
4. Export reports as CSV

---

## 📁 Project Structure

```
client-database-system/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── Layout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/         # React context providers
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Clients.jsx
│   │   │   ├── ClientDetail.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Users.jsx
│   │   │   └── Login.jsx
│   │   ├── services/        # API service layer
│   │   │   └── api.js
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/          # API routes
│   │   │   ├── auth.js      # Authentication endpoints
│   │   │   ├── clients.js   # Client CRUD operations
│   │   │   ├── notes.js     # Notes management
│   │   │   ├── files.js     # File upload/download
│   │   │   └── users.js     # User management
│   │   ├── middleware/      # Custom middleware
│   │   │   ├── auth.js      # JWT verification
│   │   │   ├── cors.js      # CORS configuration
│   │   │   └── validation.js # Input validation
│   │   ├── utils/           # Utility functions
│   │   │   ├── auth.js      # Auth helpers
│   │   │   └── encryption.js # Encryption utilities
│   │   └── index.js         # Main worker entry
│   ├── migrations/          # Database migrations
│   ├── wrangler.toml        # Cloudflare configuration
│   └── package.json
│
├── deployment/               # Deployment scripts
│   ├── deploy-frontend.ps1
│   └── deploy-backend.ps1
│
├── DEPLOYMENT_GUIDE.md       # Detailed deployment instructions
├── IMPLEMENTATION_SUMMARY.md # Technical implementation details
├── README_FEATURES.md        # Comprehensive feature list
└── README.md                 # This file
```

---

## 🔌 API Endpoints

### **Authentication**
```
POST   /api/auth/login       # User login
POST   /api/auth/register    # User registration
GET    /api/auth/me          # Get current user
```

### **Clients**
```
GET    /api/clients          # List all clients
GET    /api/clients/:id      # Get client details
POST   /api/clients          # Create new client
PUT    /api/clients/:id      # Update client
DELETE /api/clients/:id      # Delete client
GET    /api/clients/export   # Export clients to CSV
POST   /api/clients/import   # Import clients from CSV
```

### **Notes**
```
GET    /api/clients/:id/notes    # List client notes
POST   /api/clients/:id/notes    # Add note to client
DELETE /api/notes/:id            # Delete note
```

### **Files**
```
GET    /api/clients/:id/files    # List client files
POST   /api/clients/:id/files    # Upload file
GET    /api/files/:id/download   # Download file
DELETE /api/files/:id            # Delete file
```

### **Users** (Admin Only)
```
GET    /api/users               # List all users
POST   /api/users               # Create new user
PUT    /api/users/:id           # Update user
PATCH  /api/users/:id/status    # Toggle user status
DELETE /api/users/:id           # Delete user
```

---

## 🎨 Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*Real-time statistics and interactive charts*

### Client Management
![Clients](docs/screenshots/clients.png)
*Advanced search, filtering, and CRUD operations*

### Analytics
![Analytics](docs/screenshots/analytics.png)
*Comprehensive reports and data visualization*

### Client Detail
![Client Detail](docs/screenshots/client-detail.png)
*Detailed view with notes and file management*

> **Note:** Add screenshots to `docs/screenshots/` directory

---

## 🧪 Testing

### **Run Frontend Locally**
```bash
cd frontend
npm run dev
```
Visit: `http://localhost:5173`

### **Run Backend Locally**
```bash
cd backend
npm run dev
```
API available at: `http://localhost:8787/api`

### **Test API Endpoints**
```bash
# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Get clients (with token)
curl http://localhost:8787/api/clients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical architecture details
- **[Features Documentation](README_FEATURES.md)** - Comprehensive feature overview
- **[API Reference](docs/API.md)** - Complete API documentation

---

## 🔧 Configuration

### **Frontend Environment Variables**
```env
# .env.production
VITE_API_URL=https://your-api.workers.dev/api
```

### **Backend Configuration**
```toml
# wrangler.toml
name = "client-database-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "client-database"
database_id = "your-database-id"

[[r2_buckets]]
binding = "FILES"
bucket_name = "client-database-files"
```

---

## 🚀 Deployment

### **Option 1: Automated Deployment**
```powershell
# Deploy both frontend and backend
.\deployment\deploy-frontend.ps1
.\deployment\deploy-backend.ps1
```

### **Option 2: Manual Deployment**
```bash
# Frontend
cd frontend
npm run build
wrangler pages deploy dist --project-name=client-database

# Backend
cd backend
wrangler deploy
```

### **Post-Deployment Checklist**
- [ ] Update CORS origins in backend
- [ ] Set production API URL in frontend
- [ ] Create default admin user
- [ ] Test all authentication flows
- [ ] Verify file upload works
- [ ] Check analytics data loading
- [ ] Test user management (admin)
- [ ] Review security settings

---

## 🔐 Security Best Practices

1. **Change Default Credentials**
   - Update admin password immediately
   - Use strong, unique passwords

2. **Environment Variables**
   - Never commit `.env` files
   - Use Cloudflare secrets for sensitive data

3. **API Security**
   - All endpoints require authentication
   - Role-based access control enforced
   - Input validation on all requests
   - SQL injection protection

4. **Data Encryption**
   - SSN fields encrypted with AES-256
   - Passwords hashed with bcrypt
   - JWT tokens for stateless auth

5. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Review access logs

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### **Code Style**
- Follow existing code formatting
- Use meaningful variable names
- Add comments for complex logic
- Write clean, maintainable code

### **Commit Messages**
- Use conventional commits format
- Examples:
  - `feat: add user export functionality`
  - `fix: resolve login redirect issue`
  - `docs: update API documentation`
  - `style: format code with prettier`

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**GHWM Elite**
- GitHub: [@ghwmelite-dotcom](https://github.com/ghwmelite-dotcom)
- Website: [ghwmelite.com](https://ghwmelite.com)

---

## 🙏 Acknowledgments

- [Cloudflare](https://cloudflare.com) - For the amazing edge platform
- [React](https://reactjs.org) - For the powerful UI framework
- [Hono](https://hono.dev) - For the lightweight web framework
- [Recharts](https://recharts.org) - For beautiful charts
- [Tailwind CSS](https://tailwindcss.com) - For utility-first styling

---

## 📞 Support

For support, please:
- Open an issue on GitHub
- Contact: support@ghwmelite.com
- Visit: https://ghwmelite.com/support

---

## 🗺️ Roadmap

### **Upcoming Features**
- [ ] Email notifications system
- [ ] Two-factor authentication
- [ ] Advanced reporting dashboard
- [ ] Client communication history
- [ ] Appointment scheduling
- [ ] Document templates
- [ ] Automated backups
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] API webhooks

---

## 📊 Project Stats

![GitHub repo size](https://img.shields.io/github/repo-size/ghwmelite-dotcom/client-database-system)
![GitHub code size](https://img.shields.io/github/languages/code-size/ghwmelite-dotcom/client-database-system)
![Lines of code](https://img.shields.io/tokei/lines/github/ghwmelite-dotcom/client-database-system)

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ghwmelite-dotcom/client-database-system&type=Date)](https://star-history.com/#ghwmelite-dotcom/client-database-system&Date)

---

<div align="center">

**Built with ❤️ using Cloudflare's Edge Platform**

[⬆ Back to Top](#-clientpro-database)

</div>
