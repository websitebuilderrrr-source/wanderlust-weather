# 🌤️ Wanderlust Weather - Travel Weather Application

A beautiful, feature-rich weather application designed specifically for travelers. Get smart packing recommendations, activity suggestions, and comprehensive weather insights for your next adventure.

## ✨ Features

### Core Features
- 🔍 **City Search** - Search any city worldwide
- ⭐ **Favorites** - Save your favorite destinations
- 🌡️ **7-Day Forecast** - Detailed weather predictions
- ⏰ **Hourly Forecast** - Next 24-hour weather
- 📊 **Weather Metrics** - Temperature, rain, wind, UV index

### Smart Travel Features
- 🟢 **Best Day Indicator** - Color-coded travel recommendations (Great/Okay/Avoid)
- 🧳 **Smart Packing List** - Auto-generated based on weather conditions
- 🎯 **Activity Scores** - Beach, sightseeing, hiking, cafés ratings (0-10)
- 📝 **Climate Summaries** - Natural language trip overviews
- ⚖️ **City Comparison** - Compare weather between two destinations
- 🗺️ **Multi-City Trip Planner** - Plan trips across multiple cities
- 🔔 **Weather Alerts** - Notifications for severe weather
- 🌅 **Best Time Windows** - Optimal times to go outside

### User Features
- 👤 **User Authentication** - Save favorites & trips
- 📱 **Responsive Design** - Works on all devices
- 🌓 **Dark/Light Mode** - Eye-friendly interface
- ⚡ **Fast Performance** - Optimized loading

## 🚀 Deployment on Render

### Prerequisites
- GitHub account
- Render account (free tier available)
- MongoDB Atlas account (optional, free tier)

### Step 1: Prepare Your Repository

1. **Create a new GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wanderlust-weather.git
   git push -u origin main
   ```

### Step 2: Set Up MongoDB (Optional but Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for development
5. Get your connection string

### Step 3: Deploy Backend on Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository**

4. **Configure the service:**
   - **Name**: `wanderlust-weather-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. **Add Environment Variables:**
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-random-secret-key-min-32-chars
   FRONTEND_URL=https://your-frontend-app.onrender.com
   ```

6. **Click "Create Web Service"**

7. **Wait for deployment** (5-10 minutes)

8. **Copy your backend URL** (e.g., `https://wanderlust-weather-backend.onrender.com`)

### Step 4: Deploy Frontend on Render

1. **Click "New +" → "Static Site"**

2. **Connect the same repository**

3. **Configure:**
   - **Name**: `wanderlust-weather-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

4. **Add Environment Variable:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   ```

5. **Click "Create Static Site"**

6. **Wait for deployment** (5-10 minutes)

### Step 5: Update Backend CORS

1. Go back to your backend service on Render
2. Update the `FRONTEND_URL` environment variable with your actual frontend URL
3. The backend will automatically restart

## 🏗️ Folder Structure

```
wanderlust-weather/
├── backend/                   # Node.js Express API
│   ├── models/               # MongoDB models
│   │   └── User.js          # User, favorites, trips schema
│   ├── routes/              # API routes
│   │   ├── auth.js         # Login/register
│   │   ├── weather.js      # Weather data
│   │   ├── user.js         # User management
│   │   └── alerts.js       # Weather alerts
│   ├── middleware/          # Express middleware
│   │   └── auth.js         # JWT authentication
│   ├── utils/              # Utilities
│   │   └── weatherService.js # Open-Meteo API integration
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment variables template
│
├── frontend/                # React application
│   ├── src/
│   │   ├── App.js          # Main application
│   │   ├── index.js        # React entry point
│   │   └── index.css       # Tailwind styles
│   ├── public/
│   │   └── index.html      # HTML template
│   └── package.json        # Dependencies
│
└── README.md               # This file
```

## 🛠️ Local Development

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wanderlust-weather
JWT_SECRET=your-local-secret-key
FRONTEND_URL=http://localhost:3000
```

Start server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start development server:
```bash
npm start
```

Visit: `http://localhost:3000`

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Weather
- `GET /api/weather/search?q=city` - Search cities
- `GET /api/weather/forecast?lat=&lon=&city=` - Get forecast
- `GET /api/weather/compare?lat1=&lon1=&city1=&lat2=&lon2=&city2=` - Compare cities

### User (Requires Auth)
- `GET /api/user/profile` - Get user profile
- `POST /api/user/favorites` - Add favorite
- `DELETE /api/user/favorites/:id` - Remove favorite
- `GET /api/user/trips` - Get all trips
- `POST /api/user/trips` - Create trip
- `GET /api/user/trips/:id` - Get trip with weather
- `PUT /api/user/trips/:id` - Update trip
- `DELETE /api/user/trips/:id` - Delete trip

### Alerts (Requires Auth)
- `GET /api/alerts/check` - Get weather alerts

## 🌐 Weather Data Source

This app uses the **Open-Meteo API**:
- ✅ 100% Free
- ✅ No API key required
- ✅ Unlimited requests
- ✅ Global coverage
- ✅ 7-16 day forecasts
- ✅ Hourly data
- ✅ Historical weather

API Documentation: https://open-meteo.com/

## 📦 Technologies Used

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Axios** - HTTP client
- **bcryptjs** - Password hashing
- **node-cron** - Scheduled tasks

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - API calls
- **date-fns** - Date formatting

## 🎨 Features in Detail

### Best Day Indicator
Each day gets a score (0-10) based on:
- Rain probability
- Wind speed
- Temperature extremes
- Severe weather conditions

**Labels:**
- 🟢 **Great** (8-10): Perfect weather
- 🟡 **Okay** (5-7): Decent conditions
- 🔴 **Avoid** (0-4): Poor weather/storms

### Smart Packing List
Auto-generates items based on:
- Temperature ranges
- Rain forecast
- UV index
- Wind speed

**Categories:**
- 👕 Clothing
- ☔ Rain gear
- 🕶️ Sun protection
- 🧥 Wind protection

**Priority Levels:**
- **Essential** - Must pack
- **Recommended** - Should pack
- **Optional** - Nice to have

### Climate Summaries
Natural language descriptions like:
> "This week in Rome: warm afternoons, cool evenings, rain likely midweek. Pack light layers and an umbrella."

### Activity Scores
Ratings for different activities:
- 🏖️ **Beach** - Based on temp, sun, wind
- 📸 **Sightseeing** - Based on rain, comfort
- ⛰️ **Hiking** - Based on rain, temperature
- ☕ **Cafés** - Better in bad weather!

## 🔒 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key-min-32-characters
FRONTEND_URL=https://your-frontend-url.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-url.com/api
```

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
- Check your MongoDB Atlas connection string
- Ensure IP whitelist includes 0.0.0.0/0
- Verify database user credentials

### "CORS error"
- Ensure `FRONTEND_URL` in backend .env matches your frontend URL
- Check that both services are deployed

### "API calls failing"
- Verify `REACT_APP_API_URL` is set correctly
- Check backend service is running
- View backend logs on Render

### "Build failing on Render"
- Check build logs for specific errors
- Ensure all dependencies are in package.json
- Verify Node version compatibility

## 📝 Future Enhancements

- [ ] Email notifications for severe weather
- [ ] Share weather cards on social media
- [ ] Offline mode with cached data
- [ ] More languages
- [ ] Currency and unit preferences
- [ ] Integration with booking platforms
- [ ] Historical weather data comparison
- [ ] Air quality index
- [ ] Pollen forecasts

## 📄 License

MIT License - feel free to use for your own projects!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ for travelers everywhere