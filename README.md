# FraudShield AI - UPI Fraud Detection Platform

A comprehensive full-stack web application for detecting and preventing UPI payment fraud in India. Specifically designed for PhonePe, Google Pay, Paytm, BHIM, and all UPI-enabled apps. Uses AI-powered risk analysis, real-time monitoring, and intelligent recommendations.

## Features

### 🔒 Automated UPI Fraud Detection
- AI-powered risk scoring for every UPI transaction
- Real-time fraud classification (Safe, Suspicious, Fraudulent)
- Automatic blocking of high-risk UPI payments
- Multi-factor risk analysis optimized for UPI (amount, location, velocity, device, UPI app, etc.)
- Support for all major UPI apps: PhonePe, Google Pay, Paytm, BHIM, Amazon Pay, WhatsApp Pay, and 300+ others

### 📊 Real-Time UPI Payment Monitoring
- Live UPI transaction updates via WebSocket
- Instant fraud alerts for suspicious UPI payments
- Real-time dashboard updates for all UPI apps

### 📈 UPI Analytics Dashboard
- Comprehensive UPI fraud statistics
- Time-series UPI fraud rate analysis
- High-risk region identification for UPI transactions
- UPI app distribution (PhonePe, GPay, Paytm, etc.)
- Interactive charts and visualizations for UPI data

### 💡 Personalized UPI Security Recommendations
- AI-generated UPI security recommendations
- UPI transaction timing optimization advice
- Risk behavior warnings specific to UPI usage patterns
- Best practices for secure UPI payments

### 👥 User & Admin Roles
- **Users**: View transactions, receive recommendations, see fraud warnings
- **Admins**: Monitor all transactions, investigate fraud cases, override decisions

### 🔐 Security Features
- JWT-based authentication
- Password hashing (bcrypt)
- Role-based access control
- Encrypted data handling
- Audit logs for fraud decisions

## Tech Stack

### Backend
- **Node.js** with Express.js
- **WebSocket** for real-time updates
- **JWT** for authentication
- **bcryptjs** for password hashing
- **JSON** file-based storage (easily replaceable with MongoDB/PostgreSQL)

### Frontend
- **React 18** with Hooks
- **React Router** for navigation
- **Recharts** for data visualization
- **Vite** for fast development
- **Axios** for API calls
- **Lucide React** for icons

## Project Structure

```
Fraud-Payment-detection/
├── backend/
│   ├── config/
│   │   └── database.js          # Database utilities
│   ├── data/                    # JSON data files
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── transactions.js      # Transaction routes
│   │   ├── analytics.js         # Analytics routes
│   │   ├── recommendations.js   # Recommendation routes
│   │   └── admin.js             # Admin routes
│   ├── scripts/
│   │   └── seedData.js          # Database seed script
│   ├── services/
│   │   ├── fraudDetection.js    # AI fraud detection logic
│   │   ├── recommendations.js   # Recommendation engine
│   │   └── websocket.js         # WebSocket server
│   ├── server.js                # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx       # Main layout component
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Recommendations.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── services/
│   │   │   └── api.js           # API service
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Seed the database with sample data:
```bash
npm run seed
```

This will create:
- 1 admin user
- 3 regular users
- Sample transactions with fraud analysis
- Fraud logs

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory (in a new terminal):
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage Guide

### For Users

1. **Login/Register**: Create an account or login with existing credentials
2. **Dashboard**: View overview of your transactions and fraud statistics
3. **Transactions**: View all your transactions and create new ones
4. **Analytics**: Explore detailed analytics and fraud trends
5. **Recommendations**: Get personalized security recommendations

### For Admins

1. **Login**: Use the admin credentials to login
2. **Dashboard**: View system-wide fraud statistics
3. **Admin Panel**: 
   - Review flagged fraud cases
   - Approve or block transactions
   - Investigate suspicious activity
   - Add admin notes to transactions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Transactions
- `GET /api/transactions` - Get all transactions (filtered by user)
- `GET /api/transactions/:id` - Get specific transaction
- `POST /api/transactions` - Create new transaction
- `PATCH /api/transactions/:id/status` - Update transaction status (admin)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations

### Admin
- `GET /api/admin/transactions` - Get all transactions (admin)
- `GET /api/admin/fraud-cases` - Get flagged fraud cases
- `POST /api/admin/transactions/:id/approve` - Approve transaction
- `POST /api/admin/transactions/:id/block` - Block transaction
- `GET /api/admin/fraud-logs` - Get fraud audit logs
- `GET /api/admin/users` - Get all users

### WebSocket
- `ws://localhost:5000/ws` - Real-time updates connection

## Fraud Detection Algorithm

The system uses a multi-factor risk analysis approach:

1. **Amount Anomaly**: Detects unusual transaction amounts compared to user history
2. **Velocity Check**: Identifies rapid transaction patterns
3. **Location Mismatch**: Flags transactions from unusual locations
4. **Time Anomaly**: Detects transactions at unusual times
5. **Device Change**: Identifies transactions from new devices
6. **Merchant Risk**: Categorizes high-risk merchant types
7. **Pattern Deviation**: Detects deviations from normal user patterns

Each factor contributes to a risk score (0-100), which determines the classification:
- **Safe**: Score < 40
- **Suspicious**: Score 40-69
- **Fraudulent**: Score ≥ 70

## Development

### Backend Development
```bash
cd backend
npm run dev  # Runs with auto-reload (requires Node.js --watch flag)
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with hot reload
```

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Customization

### Changing Database Storage

The current implementation uses JSON files. To use a real database:

1. Update `backend/config/database.js` to use your database client
2. Replace `readData` and `writeData` functions with database queries
3. Update all route files to use the new database functions

### Customizing Fraud Detection

Edit `backend/services/fraudDetection.js` to:
- Adjust risk factor weights
- Add new risk factors
- Modify classification thresholds
- Integrate machine learning models

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

## Security Considerations

⚠️ **Important**: This is a demonstration project. For production use:

1. Change default JWT secret to a strong random value
2. Use a real database (PostgreSQL, MongoDB, etc.)
3. Implement rate limiting
4. Add input validation and sanitization
5. Use HTTPS in production
6. Implement proper error handling
7. Add comprehensive logging
8. Use environment variables for sensitive data
9. Implement proper CORS policies
10. Add API authentication rate limits

## Troubleshooting

### Backend won't start
- Check if port 5000 is already in use
- Ensure all dependencies are installed (`npm install`)
- Check Node.js version (should be v18+)

### Frontend won't connect to backend
- Ensure backend is running on port 5000
- Check CORS settings in backend
- Verify API proxy settings in `vite.config.js`

### Seed script errors
- Ensure you're in the backend directory
- Run `npm install` first
- Check Node.js version supports top-level await or use Node 18+

### WebSocket connection issues
- Ensure backend server is running
- Check WebSocket URL in frontend code
- Verify firewall settings

## License

MIT License - feel free to use this project for learning and development.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or contributions, please open an issue on the repository.

---


