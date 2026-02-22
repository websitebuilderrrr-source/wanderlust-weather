const express = require('express');
const weatherService = require('../utils/weatherService');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Search for cities
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const cities = await weatherService.searchCity(q);
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weather forecast for a location
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon, city } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const weatherData = await weatherService.getForecast(
      parseFloat(lat),
      parseFloat(lon)
    );

    // Generate climate summary and packing list
    const climateSummary = weatherService.generateClimateSummary(
      city || 'this location',
      weatherData.daily
    );

    const packingList = weatherService.generatePackingList(weatherData.daily);

    // Get best time window for today
    const bestTimeWindow = weatherService.getBestTimeWindow(weatherData.hourly);

    // Get activity scores for next 3 days
    const activityScores = weatherData.daily.slice(0, 3).map(day => ({
      date: day.date,
      activities: weatherService.getActivityScores(day)
    }));

    // Save to recent searches if user is authenticated
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user && city) {
        // Remove if already exists
        user.recentSearches = user.recentSearches.filter(
          s => s.name !== city
        );
        
        // Add to beginning
        user.recentSearches.unshift({
          name: city,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        });
        
        // Keep only last 10
        if (user.recentSearches.length > 10) {
          user.recentSearches = user.recentSearches.slice(0, 10);
        }
        
        await user.save();
      }
    }

    res.json({
      ...weatherData,
      climateSummary,
      packingList,
      bestTimeWindow,
      activityScores
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare two cities
router.get('/compare', async (req, res) => {
  try {
    const { lat1, lon1, city1, lat2, lon2, city2 } = req.query;
    
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({ error: 'Coordinates for both cities required' });
    }

    const [weather1, weather2] = await Promise.all([
      weatherService.getForecast(parseFloat(lat1), parseFloat(lon1)),
      weatherService.getForecast(parseFloat(lat2), parseFloat(lon2))
    ]);

    const comparison = await weatherService.compareCities(weather1, weather2);

    res.json({
      city1: {
        name: city1,
        weather: weather1,
        climateSummary: weatherService.generateClimateSummary(city1, weather1.daily),
        packingList: weatherService.generatePackingList(weather1.daily)
      },
      city2: {
        name: city2,
        weather: weather2,
        climateSummary: weatherService.generateClimateSummary(city2, weather2.daily),
        packingList: weatherService.generatePackingList(weather2.daily)
      },
      comparison
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;