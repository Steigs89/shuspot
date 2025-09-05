# Book Admin Tool - Vercel Deployment Guide

This guide will help you deploy your Book Admin tool to Vercel as a separate, live application.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Vercel CLI**: Install globally with `npm install -g vercel`

## 🚀 Deployment Steps

### Option 1: Deploy Backend and Frontend Separately (Recommended)

#### Deploy Backend (FastAPI)
1. Create a new project on Vercel for the backend
2. Deploy the `backend/` folder as a Python project
3. Vercel will automatically detect and deploy the FastAPI app

#### Deploy Frontend (React)
1. Create another Vercel project for the frontend
2. Deploy the `frontend/` folder as a React app
3. Update environment variables to point to your backend URL

### Option 2: Deploy as Monorepo (Alternative)

1. **Prepare the Project**:
   ```bash
   cd book-admin
   ./deploy.sh  # This will build the frontend
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new one
   - Choose your deployment settings
   - Set up environment variables

## 🔧 Environment Variables

Set these in your Vercel dashboard:

### Backend Environment Variables:
- `DATABASE_URL`: SQLite database path (default: `sqlite:///./books.db`)
- `GOOGLE_SHEETS_CREDENTIALS`: Base64 encoded Google credentials JSON
- `UPLOAD_DIR`: Directory for file uploads (default: `./uploads`)
- `CORS_ORIGINS`: Allowed CORS origins (set to your frontend URL)

### Frontend Environment Variables:
- `REACT_APP_API_URL`: Your backend API URL from Vercel

## 📁 File Structure for Deployment

```
book-admin/
├── frontend/          # React app
│   ├── build/        # Production build (created by npm run build)
│   ├── src/
│   └── package.json
├── backend/          # FastAPI app  
│   ├── main.py      # Entry point
│   ├── requirements.txt
│   └── other files...
├── vercel.json      # Vercel configuration
├── deploy.sh        # Deployment helper script
└── .env.example     # Environment variables template
```

## 🌐 API Routes

After deployment, your API routes will be available at:
- `https://your-app.vercel.app/api/books`
- `https://your-app.vercel.app/api/upload`
- `https://your-app.vercel.app/api/stats`
- etc.

## 📊 Database Considerations

### Option 1: SQLite (Simple)
- Use SQLite for development and small-scale production
- Database file will be ephemeral on Vercel (resets on deployments)
- Good for testing and demo purposes

### Option 2: External Database (Production)
- Use PostgreSQL, MySQL, or another cloud database
- Update `DATABASE_URL` environment variable
- Recommended for production use

## 🔒 Security Notes

1. **Google Sheets Credentials**: 
   - Encode your `google_credentials.json` as base64
   - Store in Vercel environment variables
   - Never commit credentials to git

2. **CORS Setup**:
   - Configure CORS origins in your FastAPI app
   - Set to your frontend domain(s)

3. **File Uploads**:
   - Consider using cloud storage (AWS S3, etc.) for production
   - Vercel has file size limits for serverless functions

## 🧪 Testing Your Deployment

1. **Backend Health Check**:
   ```bash
   curl https://your-backend.vercel.app/api/books
   ```

2. **Frontend Access**:
   - Visit your frontend URL
   - Test book management features
   - Verify API connectivity

## 🔄 Development Workflow

1. **Local Development**:
   ```bash
   # Backend
   cd backend && python main.py
   
   # Frontend  
   cd frontend && npm start
   ```

2. **Deploy Changes**:
   ```bash
   git push origin main  # Auto-deploys if connected to GitHub
   # OR
   vercel --prod        # Manual deployment
   ```

## 📞 Support & Troubleshooting

### Common Issues:

1. **Build Failures**: Check build logs in Vercel dashboard
2. **API Errors**: Verify environment variables and CORS settings  
3. **Database Issues**: Check database connection and migrations
4. **File Upload Problems**: Verify file size limits and storage configuration

### Logs and Monitoring:
- Check Vercel function logs for backend issues
- Use browser dev tools for frontend debugging
- Monitor performance and usage in Vercel dashboard

## 🎯 Next Steps

1. **Custom Domain**: Add your own domain in Vercel settings
2. **Performance**: Monitor and optimize based on usage
3. **Scaling**: Consider database and storage upgrades as needed
4. **Integration**: Eventually merge with your main ShuSpot app

---

## 📝 Quick Deploy Commands

```bash
# Build frontend
cd frontend && npm run build

# Deploy everything
vercel --prod

# Or deploy just backend
cd backend && vercel --prod

# Or deploy just frontend  
cd frontend && vercel --prod
```

Your Book Admin tool will be live and accessible 24/7 without needing to restart local servers!
