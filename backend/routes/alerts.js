const express = require('express');
const auth = require('../middleware/auth');
const weatherService = require('../utils/weatherService');

const router = express.Router();

// Check for weather alerts for user's favorites and trips
router.get('/check', auth, async (req, res) => {
  try {
    const user = req.user;
    const alerts = [];

    // Check favorites
    for (const favorite of user.favorites) {
      const weather = await weatherService.getForecast(
        favorite.latitude,
        favorite.longitude
      );

      const locationAlerts = checkWeatherAlerts(
        favorite.name,
        weather,
        user.alertPreferences
      );

      alerts.push(...locationAlerts);
    }

    // Check trips
    for (const trip of user.trips) {
      for (const city of trip.cities) {
        const weather = await weatherService.getForecast(
          city.latitude,
          city.longitude
        );

        const locationAlerts = checkWeatherAlerts(
          `${city.name} (${trip.name})`,
          weather,
          user.alertPreferences
        );

        alerts.push(...locationAlerts);
      }
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to check weather conditions
function checkWeatherAlerts(location, weather, preferences) {
  const alerts = [];

  for (let i = 0; i < Math.min(3, weather.daily.length); i++) {
    const day = weather.daily[i];
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `In ${i} days`;

    // Severe weather
    if (preferences.severeWeather && weatherService.isSevereWeather(day.weatherCode)) {
      alerts.push({
        location,
        type: 'severe',
        severity: 'high',
        day: dayLabel,
        message: `⚠️ Severe weather alert: ${day.condition} expected`,
        date: day.date
      });
    }

    // Heavy rain
    if (preferences.rain && day.rainChance > 70) {
      alerts.push({
        location,
        type: 'rain',
        severity: 'medium',
        day: dayLabel,
        message: `🌧️ Heavy rain likely (${day.rainChance}% chance)`,
        date: day.date
      });
    }

    // Extreme temperature
    if (preferences.temperature) {
      if (day.high > 35) {
        alerts.push({
          location,
          type: 'temperature',
          severity: 'medium',
          day: dayLabel,
          message: `🌡️ Heat wave: ${day.high}°C expected`,
          date: day.date
        });
      } else if (day.low < 0) {
        alerts.push({
          location,
          type: 'temperature',
          severity: 'medium',
          day: dayLabel,
          message: `❄️ Freezing temperatures: ${day.low}°C`,
          date: day.date
        });
      }
    }

    // Strong winds
    if (preferences.wind && day.windSpeed > 40) {
      alerts.push({
        location,
        type: 'wind',
        severity: 'medium',
        day: dayLabel,
        message: `💨 Strong winds: ${day.windSpeed} km/h expected`,
        date: day.date
      });
    }
  }

  return alerts;
}

module.exports = router;