const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  cities: [{
    name: String,
    country: String,
    latitude: Number,
    longitude: Number,
    startDate: Date,
    endDate: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const favoriteSchema = new mongoose.Schema({
  name: String,
  country: String,
  latitude: Number,
  longitude: Number,
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const alertPreferenceSchema = new mongoose.Schema({
  severeWeather: {
    type: Boolean,
    default: true
  },
  rain: {
    type: Boolean,
    default: true
  },
  temperature: {
    type: Boolean,
    default: false
  },
  wind: {
    type: Boolean,
    default: false
  }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  favorites: [favoriteSchema],
  trips: [tripSchema],
  recentSearches: [{
    name: String,
    country: String,
    latitude: Number,
    longitude: Number,
    searchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  alertPreferences: {
    type: alertPreferenceSchema,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);