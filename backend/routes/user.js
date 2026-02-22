const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const weatherService = require('../utils/weatherService');

const router = express.Router();

// Get user profile with favorites and trips
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add favorite
router.post('/favorites', auth, async (req, res) => {
  try {
    const { name, country, latitude, longitude } = req.body;
    const user = await User.findById(req.user._id);

    // Check if already favorited
    const exists = user.favorites.some(f => f.name === name);
    if (exists) {
      return res.status(400).json({ error: 'Already in favorites' });
    }

    user.favorites.push({ name, country, latitude, longitude });
    await user.save();

    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove favorite
router.delete('/favorites/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.favorites = user.favorites.filter(f => f._id.toString() !== req.params.id);
    await user.save();

    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all trips
router.get('/trips', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.trips);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new trip
router.post('/trips', auth, async (req, res) => {
  try {
    const { name, cities } = req.body;
    const user = await User.findById(req.user._id);

    user.trips.push({ name, cities });
    await user.save();

    res.json(user.trips);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get trip with weather data
router.get('/trips/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const trip = user.trips.id(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Fetch weather for all cities
    const weatherPromises = trip.cities.map(city =>
      weatherService.getForecast(city.latitude, city.longitude)
        .then(weather => ({
          ...city.toObject(),
          weather,
          climateSummary: weatherService.generateClimateSummary(city.name, weather.daily),
          packingList: weatherService.generatePackingList(weather.daily)
        }))
    );

    const citiesWithWeather = await Promise.all(weatherPromises);

    // Generate combined packing list
    const allItems = citiesWithWeather.flatMap(c => c.packingList);
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.item, item])).values()
    );

    res.json({
      ...trip.toObject(),
      cities: citiesWithWeather,
      combinedPackingList: uniqueItems
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update trip
router.put('/trips/:id', auth, async (req, res) => {
  try {
    const { name, cities } = req.body;
    const user = await User.findById(req.user._id);
    const trip = user.trips.id(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (name) trip.name = name;
    if (cities) trip.cities = cities;

    await user.save();
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete trip
router.delete('/trips/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.trips = user.trips.filter(t => t._id.toString() !== req.params.id);
    await user.save();

    res.json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent searches
router.get('/recent-searches', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.recentSearches);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update alert preferences
router.put('/alert-preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.alertPreferences = { ...user.alertPreferences, ...req.body };
    await user.save();

    res.json(user.alertPreferences);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;