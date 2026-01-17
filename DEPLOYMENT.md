# Deployment Guide for FraudShield AI

This guide explains how to deploy the FraudShield AI application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

## Environment Setup

### 1. Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set the following variables:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

**⚠️ IMPORTANT:** 
- Generate a strong, random JWT_SECRET (minimum 32 characters)
- Never commit `.env` files to version control
- Use different secrets for development and production

### 2. Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and set the following variables:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000/ws
VITE_NODE_ENV=production
VITE_APP_NAME=FraudShield AI
```

## Docker Deployment

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/UtkarshSingh-06/AI-Powered-Payment-Fraud-Detection-System.git
   cd AI-Powered-Payment-Fraud-Detection-System
   ```

2. **Set up environment variables:**
   - Copy `.env.example` files and configure them as described above

3. **Build and start containers:**
   ```bash
   docker-compose up -d --build
   ```

4. **Check container status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

6. **Stop containers:**
   ```bash
   docker-compose down
   ```

### Option 2: Manual Docker Deployment

#### Backend

```bash
cd backend
docker build -t fraudshield-backend .
docker run -d \
  -p 5000:5000 \
  --name fraudshield-backend \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  fraudshield-backend
```

#### Frontend

```bash
cd frontend
docker build -t fraudshield-frontend .
docker run -d \
  -p 3000:80 \
  --name fraudshield-frontend \
  fraudshield-frontend
```

## Production Deployment

### Security Checklist

- [ ] Change all default secrets and passwords
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET (minimum 32 characters, random)
- [ ] Configure CORS_ORIGIN to match your domain
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up proper logging and monitoring
- [ ] Enable rate limiting
- [ ] Configure backup strategies for data

### Environment Variables for Production

**Backend (.env):**
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=<generate-a-strong-random-secret>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://yourdomain.com
```

**Frontend (.env):**
```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/ws
VITE_NODE_ENV=production
VITE_APP_NAME=FraudShield AI
```

### Generating a Secure JWT Secret

On Linux/Mac:
```bash
openssl rand -base64 32
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Health Checks

- Backend: `http://localhost:5000/api/health`
- Frontend: `http://localhost:3000`

## Troubleshooting

### Container won't start
- Check if ports 3000 and 5000 are available
- Verify `.env` files exist and are properly configured
- Check logs: `docker-compose logs`

### API connection issues
- Verify `VITE_API_URL` in frontend `.env` matches backend URL
- Check CORS_ORIGIN setting in backend `.env`
- Ensure both containers are running: `docker-compose ps`

### Database/data issues
- Ensure `backend/data` directory has proper permissions
- Check volume mounts in `docker-compose.yml`

## Scaling

To run multiple instances:

```bash
docker-compose up -d --scale backend=3
```

Note: For production scaling, consider using:
- Load balancer (nginx, HAProxy)
- Database (PostgreSQL, MongoDB) instead of JSON files
- Redis for session management
- Kubernetes for orchestration

## Support

For issues or questions, please open an issue on GitHub.
