import React, { useState, useEffect, createContext, useContext } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Eye, Calendar, MapPin, Heart, Search, LogOut, User as UserIcon, Trash2, Check, TrendingUp, Luggage, Share2, X as XIcon, Sunrise, Sunset } from 'lucide-react';
import { AQICard, HourlyForecast } from './components/HourlyAndAQI';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Dynamic Background Component
const DynamicBackground = ({ weatherCondition, isNight }) => {
  const getBackgroundGif = () => {
    const condition = weatherCondition?.toLowerCase() || '';
    
    // Map weather conditions to GIF files
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return isNight ? '/gifs/rainy-night.gif' : '/gifs/rainy-day.gif';
    }
    if (condition.includes('snow')) {
      return isNight ? '/gifs/snowy-night.gif' : '/gifs/snowy-day.gif';
    }
    // Default clear/cloudy
    return isNight ? '/gifs/clear-night.gif' : '/gifs/clear-day.gif';
  };

  const gifUrl = getBackgroundGif();

  return (
    <div 
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage: `url(${gifUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay for better readability */}
     /* <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-indigo-900/85 to-slate-900/85 backdrop-blur-sm"></div>*/
    </div>
  );
};

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const loginWithGoogle = (credentialResponse) => {
    try {
      const decoded = parseJwt(credentialResponse.credential);
      
      const userData = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        loginMethod: 'google'
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const parseJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// LocalStorage helpers
const StorageHelper = {
  getFavorites: () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return [];
    const key = `favorites_${user.id}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
  
  setFavorites: (favorites) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    const key = `favorites_${user.id}`;
    localStorage.setItem(key, JSON.stringify(favorites));
  },
  
  getRecentSearches: () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return [];
    const key = `recentSearches_${user.id}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
  
  addRecentSearch: (city) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    const key = `recentSearches_${user.id}`;
    let recent = JSON.parse(localStorage.getItem(key) || '[]');
    
    recent = recent.filter(r => r.name !== city.name);
    recent.unshift(city);
    
    if (recent.length > 10) {
      recent = recent.slice(0, 10);
    }
    
    localStorage.setItem(key, JSON.stringify(recent));
  }
};

// Main App Component
function App() {
  const [weatherCondition, setWeatherCondition] = useState('');
  const [isNight, setIsNight] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen relative">
        <DynamicBackground 
          weatherCondition={weatherCondition} 
          isNight={isNight}
        />
        <WeatherApp 
          setWeatherCondition={setWeatherCondition}
          setIsNight={setIsNight}
        />
      </div>
    </AuthProvider>
  );
}

// Weather App Component
const WeatherApp = ({ setWeatherCondition, setIsNight }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeTab, setActiveTab] = useState('forecast');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Auto-detect location on mount
  useEffect(() => {
    detectUserLocation();
  }, []);

  useEffect(() => {
    if (user) {
      setFavorites(StorageHelper.getFavorites());
      setRecentSearches(StorageHelper.getRecentSearches());
    }
  }, [user]);

  // Update background based on weather
  useEffect(() => {
    if (weatherData) {
      setWeatherCondition(weatherData.current.condition);
      
      // Check if it's night time
      const now = new Date();
      const currentHour = now.getHours();
      const isNightTime = currentHour < 6 || currentHour > 20;
      setIsNight(isNightTime);
    }
  }, [weatherData, setWeatherCondition, setIsNight]);

  // Detect user's current location
  const detectUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Got coordinates:', latitude, longitude);
        
        try {
          // Use Open-Meteo geocoding to get city name
          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
          );
          const geoData = await geoResponse.json();
          
          if (geoData.results && geoData.results[0]) {
            const city = {
              name: geoData.results[0].name,
              country: geoData.results[0].country,
              latitude: latitude,
              longitude: longitude,
              admin1: geoData.results[0].admin1
            };
            
            console.log('Detected city:', city);
            selectCity(city);
          } else {
            setLocationError("Could not determine city name");
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          setLocationError("Failed to get location details");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out");
            break;
          default:
            setLocationError("An unknown error occurred");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Use Open-Meteo geocoding API directly
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=10&language=en&format=json`
      );
      const data = await response.json();
      
      if (data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCity = async (city) => {
    setSelectedCity(city);
    setSearchResults([]);
    setSearchQuery('');
    setLocationError(null); 
    
    if (user) {
      StorageHelper.addRecentSearch(city);
      setRecentSearches(StorageHelper.getRecentSearches());
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/weather/forecast?lat=${city.latitude}&lon=${city.longitude}&city=${encodeURIComponent(city.name)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Weather error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (city) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const currentFavorites = StorageHelper.getFavorites();
    const existingFav = currentFavorites.find(f => f.name === city.name);
    
    let newFavorites;
    if (existingFav) {
      newFavorites = currentFavorites.filter(f => f.name !== city.name);
    } else {
      newFavorites = [...currentFavorites, {
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        addedAt: new Date().toISOString()
      }];
    }
    
    StorageHelper.setFavorites(newFavorites);
    setFavorites(newFavorites);
  };

  const getBestDayLabel = (score) => {
    if (score >= 8) return { label: 'Great', emoji: '🟢' };
    if (score >= 5) return { label: 'Okay', emoji: '🟡' };
    return { label: 'Avoid', emoji: '🔴' };
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.menu-container')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <>
      <Header 
        user={user}
        logout={logout}
        setShowAuth={setShowAuth}
        setShowMenu={setShowMenu}
        showMenu={showMenu}
        detectUserLocation={detectUserLocation}
        locationLoading={locationLoading}
      />

      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        searchResults={searchResults}
        selectCity={selectCity}
        favorites={favorites}
        recentSearches={recentSearches}
        user={user}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        {locationError && (
          <div className="mb-4 p-4 bg-red-500/20 backdrop-blur-xl border border-red-500/50 rounded-xl text-white">
            <p className="font-semibold">Location Error:</p>
            <p>{locationError}</p>
            <p className="text-sm mt-2">You can still search for cities manually above.</p>
          </div>
        )}

        {!selectedCity ? (
          <EmptyState locationLoading={locationLoading} />
        ) : loading ? (
          <LoadingState />
        ) : weatherData ? (
          <WeatherDisplay
            selectedCity={selectedCity}
            weatherData={weatherData}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            getBestDayLabel={getBestDayLabel}
            user={user}
          />
        ) : null}
      </main>

      {showAuth && (
        <GoogleAuthModal 
          onClose={() => setShowAuth(false)}
          setShowAuth={setShowAuth}
        />
      )}
    </>
  );
};

// Header Component
const Header = ({ user, logout, setShowAuth, setShowMenu, showMenu, detectUserLocation, locationLoading }) => (
  <header className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Wanderlust Weather
            </h1>
            <p className="text-sm text-cyan-200">Travel smarter with weather insights</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Location Button */}
          <button 
            onClick={detectUserLocation}
            disabled={locationLoading}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 disabled:opacity-50"
            title="Detect my location"
          >
            {locationLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </button>

          {user ? (
            <div className="relative menu-container">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
                <span className="hidden md:inline">{user.name}</span>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-xl py-2 border border-white/20">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-sm text-white">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                    }} 
                    className="w-full px-4 py-2 text-left hover:bg-white/10 text-white flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setShowAuth(true)}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold transition-all shadow-lg"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);

// Search Bar Component
const SearchBar = ({ searchQuery, setSearchQuery, handleSearch, searchResults, selectCity, favorites, recentSearches, user }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative">
    <div className="relative">
      <div className="flex gap-2 bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20 shadow-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search any city worldwide..."
            className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-cyan-200/50 outline-none text-lg"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg"
        >
          Search
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="absolute w-full mt-2 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 max-h-96 overflow-y-auto z-[999]">
          {searchResults.map((city, i) => (
            <button
              key={i}
              onClick={() => selectCity(city)}
              className="w-full px-4 py-3 text-left hover:bg-white/10 text-white border-b border-white/10 last:border-0 transition-colors"
            >
              <div className="font-semibold">{city.name}</div>
              <div className="text-sm text-cyan-200">
                {city.admin1 && `${city.admin1}, `}{city.country}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>

    {user && favorites.length > 0 && (
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <span className="text-sm font-semibold text-cyan-300 px-2 py-1">Favorites:</span>
        {favorites.map((city, i) => (
          <button
            key={i}
            onClick={() => selectCity(city)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all whitespace-nowrap flex items-center gap-2 backdrop-blur-md"
          >
            <Heart className="w-4 h-4 fill-current" />
            {city.name}
          </button>
        ))}
      </div>
    )}

    {user && recentSearches.length > 0 && (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        <span className="text-sm font-semibold text-cyan-300 px-2 py-1">Recent:</span>
        {recentSearches.map((city, i) => (
          <button
            key={i}
            onClick={() => selectCity(city)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-all whitespace-nowrap backdrop-blur-md"
          >
            {city.name}
          </button>
        ))}
      </div>
    )}
  </div>
);

// Google Auth Modal
const GoogleAuthModal = ({ onClose, setShowAuth }) => {
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: (response) => {
          loginWithGoogle(response);
          setTimeout(() => {
            setShowAuth(false);
          }, 500);
        }
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'filled_black',
          size: 'large',
          width: 350,
          text: 'signin_with'
        }
      );
    }
  }, [loginWithGoogle, setShowAuth]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Sign In</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-center text-cyan-200 mb-4">
            Sign in to save your favorite destinations and trips
          </p>
          <div id="google-signin-button" className="flex justify-center"></div>
        </div>

        <div className="text-xs text-center text-cyan-300">
          <p>Your data is stored securely in your browser.</p>
          <p className="mt-1">No passwords needed with Google Sign-In!</p>
        </div>
      </div>
    </div>
  );
};

// UV Index Meter
const UVMeter = ({ uvIndex }) => {
  const getUVInfo = (uv) => {
    if (uv <= 2) return { color: '#00e400', label: 'Low', bg: 'from-green-400 to-green-600' };
    if (uv <= 5) return { color: '#ffff00', label: 'Moderate', bg: 'from-yellow-400 to-yellow-600' };
    if (uv <= 7) return { color: '#ff7e00', label: 'High', bg: 'from-orange-400 to-orange-600' };
    if (uv <= 10) return { color: '#ff0000', label: 'Very High', bg: 'from-red-400 to-red-600' };
    return { color: '#b19cd9', label: 'Extreme', bg: 'from-purple-400 to-purple-600' };
  };

  const uvInfo = getUVInfo(uvIndex);
  const percentage = Math.min((uvIndex / 11) * 100, 100);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-cyan-200">UV Index</span>
        <span className="text-sm font-bold" style={{ color: uvInfo.color }}>{uvInfo.label}</span>
      </div>
      
      <div className="relative h-8 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full bg-gradient-to-r ${uvInfo.bg} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white drop-shadow-lg">
            {uvIndex}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-cyan-200">
        <span>0-2</span>
        <span>3-5</span>
        <span>6-7</span>
        <span>8-10</span>
        <span>11+</span>
      </div>
    </div>
  );
};

// Empty State
const EmptyState = ({ locationLoading }) => (
  <div className="text-center py-20">
    <div className="inline-block p-8 rounded-3xl bg-white/10 backdrop-blur-xl mb-6 border border-white/20">
      <MapPin className={`w-20 h-20 mx-auto text-cyan-300 mb-4 ${locationLoading ? 'animate-pulse' : ''}`} />
      <h2 className="text-3xl font-bold text-white mb-2">
        {locationLoading ? 'Detecting your location...' : 'Where are you traveling?'}
      </h2>
      <p className="text-lg text-cyan-200">
        {locationLoading ? 'Please allow location access' : 'Search for a destination to see weather forecasts'}
      </p>
    </div>
  </div>
);

const LoadingState = () => (
  <div className="text-center py-20">
    <div className="inline-block p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20">
      <div className="animate-spin w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-lg text-cyan-200">Loading weather data...</p>
    </div>
  </div>
);

// Weather Display Component
const WeatherDisplay = ({ selectedCity, weatherData, favorites, toggleFavorite, activeTab, setActiveTab, getBestDayLabel, user }) => {
  const isFavorite = favorites.some(f => f.name === selectedCity.name);

  return (
    <div className="space-y-6">
      {/* City Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-4xl font-bold text-white">{selectedCity.name}</h2>
              <button
                onClick={() => toggleFavorite(selectedCity)}
                className={`p-2 rounded-xl ${isFavorite ? 'bg-pink-500/30 hover:bg-pink-500/40' : 'bg-white/10 hover:bg-white/20'} transition-all backdrop-blur-md border border-white/20`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink-400 text-pink-400' : 'text-white'}`} />
              </button>
            </div>
            <p className="text-lg text-cyan-200">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-7xl font-bold text-white">{weatherData.current.temp}°</div>
            <div className="text-xl text-cyan-200">{weatherData.current.condition}</div>
          </div>
        </div>

        {/* Sunrise & Sunset */}
        {weatherData.daily && weatherData.daily[0] && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center gap-3 border border-white/20">
              <Sunrise className="w-8 h-8 text-orange-400" />
              <div>
                <div className="text-sm text-cyan-200">Sunrise</div>
                <div className="text-xl font-bold text-white">
                  {new Date(weatherData.daily[0].sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center gap-3 border border-white/20">
              <Sunset className="w-8 h-8 text-indigo-400" />
              <div>
                <div className="text-sm text-cyan-200">Sunset</div>
                <div className="text-xl font-bold text-white">
                  {new Date(weatherData.daily[0].sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>
          </div>
        )}

        {weatherData.climateSummary && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-cyan-300 mt-1" />
              <div>
                <div className="text-sm font-semibold text-cyan-300 mb-1">Travel Overview</div>
                <p className="text-base text-white">
                  {weatherData.climateSummary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Wind} label="Wind" value={`${weatherData.current.windSpeed} km/h`} />
          <StatCard icon={Droplets} label="Condition" value={weatherData.current.condition} />
          <UVMeter uvIndex={weatherData.daily[0]?.uv || 0} />
        </div>
      </div>

      {/* AQI & Hourly */}
      {weatherData.airQuality && <AQICard airQuality={weatherData.airQuality} />}
      <HourlyForecast hourlyData={weatherData.hourly} />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20">
        {[
          { id: 'forecast', label: 'Forecast', icon: Calendar },
          { id: 'packing', label: 'Packing', icon: Luggage },
          { id: 'activities', label: 'Activities', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg border border-white/30'
                  : 'text-cyan-200 hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'forecast' && <ForecastTab weatherData={weatherData} getBestDayLabel={getBestDayLabel} />}
      {activeTab === 'packing' && <PackingTab packingList={weatherData.packingList} />}
      {activeTab === 'activities' && <ActivitiesTab activityScores={weatherData.activityScores} />}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
    <Icon className="w-5 h-5 text-cyan-300 mb-2" />
    <div className="text-sm text-cyan-200">{label}</div>
    <div className="text-xl font-bold text-white">{value}</div>
  </div>
);

// Forecast Tab
const ForecastTab = ({ weatherData, getBestDayLabel }) => (
  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
    <h3 className="text-2xl font-bold text-white mb-6">7-Day Forecast</h3>
    <div className="space-y-4">
      {weatherData.daily.map((day, i) => {
        const quality = getBestDayLabel(day.score);
        return (
          <div key={i} className="bg-white/5 hover:bg-white/10 rounded-xl p-5 border border-white/20 transition-all backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="text-lg font-bold text-white min-w-[140px]">
                  {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <span className="px-4 py-2 rounded-xl font-semibold text-sm bg-white/10 text-white flex items-center gap-2 backdrop-blur-md border border-white/20">
                  <span>{quality.emoji}</span>
                  {quality.label}
                </span>
              </div>
              <div className="flex gap-6 items-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{day.high}°</div>
                  <div className="text-sm text-cyan-200">High</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-white/70">{day.low}°</div>
                  <div className="text-sm text-cyan-200">Low</div>
                </div>
                <div className="text-center">
                  <Droplets className="w-5 h-5 text-blue-400 mx-auto" />
                  <div className="text-sm font-semibold text-white">{day.rainChance}%</div>
                </div>
              </div>
            </div>
            
            {/* Sunrise & Sunset */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-cyan-200">
                  {new Date(day.sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sunset className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-cyan-200">
                  {new Date(day.sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const PackingTab = ({ packingList }) => (
  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
      <Luggage className="w-6 h-6" />
      Smart Packing List
    </h3>
    <div className="space-y-3">
      {packingList && packingList.map((item, i) => (
        <div key={i} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-xl p-5 border border-white/20 transition-all backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-2xl">
            {item.category === 'clothing' ? '👕' : item.category === 'rain' ? '☔' : item.category === 'sun' ? '🕶️' : '🧥'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg text-white">{item.item}</div>
            <div className="text-sm text-cyan-200">{item.reason}</div>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
            item.priority === 'essential' ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
            item.priority === 'recommended' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
            'bg-green-500/20 text-green-300 border border-green-500/50'
          }`}>
            {item.priority}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const ActivitiesTab = ({ activityScores }) => (
  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
    <h3 className="text-2xl font-bold text-white mb-6">Activity Recommendations</h3>
    <div className="space-y-6">
      {activityScores && activityScores.map((day, i) => (
        <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/20 backdrop-blur-md">
          <div className="text-lg font-bold text-white mb-4">
            {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {day.activities.map((activity, idx) => {
              const scoreColor = activity.score >= 7 ? '#10b981' : activity.score >= 5 ? '#f59e0b' : '#ef4444';
              return (
                <div key={idx} className="bg-white/5 hover:bg-white/10 rounded-xl p-4 text-center transition-all backdrop-blur-md border border-white/10">
                  <div className="text-sm font-semibold text-cyan-200 mb-2">{activity.name}</div>
                  <div className="text-3xl font-bold mb-1" style={{color: scoreColor}}>{activity.score}</div>
                  <div className="text-xs text-cyan-300">out of 10</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default App;



