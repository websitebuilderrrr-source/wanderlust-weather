import React, { useState, useEffect, createContext, useContext } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Eye, Calendar, MapPin, Heart, Search, LogOut, User as UserIcon, Plus, Trash2, Check, AlertTriangle, TrendingUp, Luggage, Share2, Bell, Settings, Menu, X as XIcon, Sunrise, Sunset } from 'lucide-react';
import { AQICard, HourlyForecast } from './components/HourlyAndAQI';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Dynamic Background Component
const DynamicBackground = ({ weatherCondition, isNight, darkMode }) => {
  const getBackgroundGif = () => {
    const condition = weatherCondition?.toLowerCase() || '';
    
    // Map weather conditions to your gif files
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return isNight ? '/gifs/rainy-night.gif' : '/gifs/rainy-day.gif';
    }
    if (condition.includes('snow')) {
      return isNight ? '/gifs/snowy-night.gif' : '/gifs/snowy-day.gif';
    }
    // Default day/night
    return isNight ? '/gifs/clear-night.gif' : '/gifs/clear-day.gif';
  };

  return (
    <div 
      className="fixed inset-0 -z-10 transition-opacity duration-1000"
      style={{
        backgroundImage: `url(${getBackgroundGif()})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.3
      }}
    >
      {/* Overlay for better readability */}
      <div className={`absolute inset-0 ${darkMode ? 'bg-slate-900/70' : 'bg-white/70'}`}></div>
    </div>
  );
};

// Auth Context with localStorage
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
      document.body.removeChild(script);
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
      
      if (!localStorage.getItem('favorites')) {
        localStorage.setItem('favorites', JSON.stringify([]));
      }
      if (!localStorage.getItem('trips')) {
        localStorage.setItem('trips', JSON.stringify([]));
      }
      if (!localStorage.getItem('recentSearches')) {
        localStorage.setItem('recentSearches', JSON.stringify([]));
      }
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

// LocalStorage helper functions
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
  
  getTrips: () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return [];
    const key = `trips_${user.id}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
  
  setTrips: (trips) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    const key = `trips_${user.id}`;
    localStorage.setItem(key, JSON.stringify(trips));
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
  const [darkMode, setDarkMode] = useState(true);
  const [weatherCondition, setWeatherCondition] = useState('');
  const [isNight, setIsNight] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen relative">
        <DynamicBackground 
          weatherCondition={weatherCondition} 
          isNight={isNight}
          darkMode={darkMode}
        />
        <WeatherApp 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          setWeatherCondition={setWeatherCondition}
          setIsNight={setIsNight}
        />
      </div>
    </AuthProvider>
  );
}

// Weather App Component
const WeatherApp = ({ darkMode, setDarkMode, setWeatherCondition, setIsNight }) => {
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
    if ("geolocation" in navigator) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Get city name from coordinates
          try {
            const response = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
            );
            const data = await response.json();
            
            if (data.results && data.results[0]) {
              const city = {
                name: data.results[0].name,
                country: data.results[0].country,
                latitude: latitude,
                longitude: longitude,
                admin1: data.results[0].admin1
              };
              
              selectCity(city);
            }
          } catch (error) {
            console.error('Geocoding error:', error);
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
        }
      );
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/weather/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCity = async (city) => {
    setSelectedCity(city);
    setSearchResults([]);
    setSearchQuery('');
    
    if (user) {
      StorageHelper.addRecentSearch(city);
      setRecentSearches(StorageHelper.getRecentSearches());
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/weather/forecast?lat=${city.latitude}&lon=${city.longitude}&city=${encodeURIComponent(city.name)}`
      );
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
    if (score >= 8) return { label: 'Great', color: 'emerald', emoji: '🟢' };
    if (score >= 5) return { label: 'Okay', color: 'amber', emoji: '🟡' };
    return { label: 'Avoid', color: 'red', emoji: '🔴' };
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
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        user={user}
        logout={logout}
        setShowAuth={setShowAuth}
        setShowMenu={setShowMenu}
        showMenu={showMenu}
        detectUserLocation={detectUserLocation}
        locationLoading={locationLoading}
      />

      <SearchBar
        darkMode={darkMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        searchResults={searchResults}
        selectCity={selectCity}
        favorites={favorites}
        recentSearches={recentSearches}
        user={user}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!selectedCity ? (
          <EmptyState darkMode={darkMode} locationLoading={locationLoading} />
        ) : loading ? (
          <LoadingState darkMode={darkMode} />
        ) : weatherData ? (
          <WeatherDisplay
            darkMode={darkMode}
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
          darkMode={darkMode} 
          onClose={() => setShowAuth(false)}
          setShowAuth={setShowAuth}
        />
      )}
    </>
  );
};

// Header Component with location button
const Header = ({ darkMode, setDarkMode, user, logout, setShowAuth, setShowMenu, showMenu, detectUserLocation, locationLoading }) => (
  <header className={`${darkMode ? 'bg-black/30' : 'bg-white/60'} backdrop-blur-xl border-b ${darkMode ? 'border-white/10' : 'border-black/5'} sticky top-0 z-50`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-gradient-to-br from-orange-400 to-pink-500'} flex items-center justify-center shadow-lg`}>
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Wanderlust Weather
            </h1>
            <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-orange-600'}`}>Travel smarter with weather insights</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Location Button */}
          <button 
            onClick={detectUserLocation}
            disabled={locationLoading}
            className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/10 hover:bg-gray-900/20 text-gray-900'} transition-all ${locationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Detect my location"
          >
            {locationLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/10 hover:bg-gray-900/20 text-gray-900'} transition-all`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="relative menu-container">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/10 hover:bg-gray-900/20 text-gray-900'} transition-all`}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
                <span className="hidden md:inline">{user.name}</span>
              </button>
              
              {showMenu && (
                <div className={`absolute right-0 mt-2 w-48 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl py-2 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                    }} 
                    className={`w-full px-4 py-2 text-left ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'} flex items-center gap-2`}
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
              className={`px-6 py-2 rounded-xl ${darkMode ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600' : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600'} text-white font-semibold transition-all`}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);

// Search Bar Component - unchanged
const SearchBar = ({ darkMode, searchQuery, setSearchQuery, handleSearch, searchResults, selectCity, favorites, recentSearches, user }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative z-10">
    <div className="relative">
      <div className={`flex gap-2 ${darkMode ? 'bg-white/10' : 'bg-white/80'} backdrop-blur-xl rounded-2xl p-2 ${darkMode ? 'border border-white/20' : 'border border-gray-200'} shadow-xl`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-orange-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search any city worldwide..."
            className={`w-full pl-12 pr-4 py-3 ${darkMode ? 'bg-transparent text-white placeholder-purple-300/50' : 'bg-transparent text-gray-900 placeholder-gray-500'} outline-none text-lg`}
          />
        </div>
        <button
          onClick={handleSearch}
          className={`px-6 py-3 ${darkMode ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600' : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600'} text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl`}
        >
          Search
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className={`absolute w-full mt-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl border ${darkMode ? 'border-white/10' : 'border-gray-200'} max-h-96 overflow-y-auto z-50`}>
          {searchResults.map((city, i) => (
            <button
              key={i}
              onClick={() => selectCity(city)}
              className={`w-full px-4 py-3 text-left ${darkMode ? 'hover:bg-violet-500/20 text-white' : 'hover:bg-orange-100 text-gray-900'} border-b ${darkMode ? 'border-white/10' : 'border-gray-200'} last:border-0 transition-colors`}
            >
              <div className="font-semibold">{city.name}</div>
              <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>
                {city.admin1 && `${city.admin1}, `}{city.country}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>

    {user && favorites.length > 0 && (
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <span className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-orange-600'} px-2 py-1`}>Favorites:</span>
        {favorites.map((city, i) => (
          <button
            key={i}
            onClick={() => selectCity(city)}
            className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-violet-500/30 text-white' : 'bg-white hover:bg-orange-100 text-gray-900'} border ${darkMode ? 'border-white/20' : 'border-gray-200'} transition-all whitespace-nowrap flex items-center gap-2`}
          >
            <Heart className="w-4 h-4 fill-current" />
            {city.name}
          </button>
        ))}
      </div>
    )}

    {user && recentSearches.length > 0 && (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        <span className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-orange-600'} px-2 py-1`}>Recent:</span>
        {recentSearches.map((city, i) => (
          <button
            key={i}
            onClick={() => selectCity(city)}
            className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-white/5 hover:bg-violet-500/20 text-white/80' : 'bg-gray-100 hover:bg-orange-50 text-gray-700'} transition-all whitespace-nowrap`}
          >
            {city.name}
          </button>
        ))}
      </div>
    )}
  </div>
);

// Google Auth Modal with auto-close
const GoogleAuthModal = ({ darkMode, onClose, setShowAuth }) => {
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: (response) => {
          loginWithGoogle(response);
          // Auto-close modal after successful login
          setTimeout(() => {
            setShowAuth(false);
          }, 500);
        }
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: darkMode ? 'filled_black' : 'outline',
          size: 'large',
          width: 350,
          text: 'signin_with'
        }
      );
    }
  }, [darkMode, loginWithGoogle, setShowAuth]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-md w-full shadow-2xl`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Sign In
          </h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <XIcon className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
          </button>
        </div>

        <div className="mb-6">
          <p className={`text-center ${darkMode ? 'text-purple-300' : 'text-gray-600'} mb-4`}>
            Sign in to save your favorite destinations and trips
          </p>
          <div id="google-signin-button" className="flex justify-center"></div>
        </div>

        <div className={`text-xs text-center ${darkMode ? 'text-purple-400' : 'text-gray-500'}`}>
          <p>Your data is stored securely in your browser.</p>
          <p className="mt-1">No passwords needed with Google Sign-In!</p>
        </div>
      </div>
    </div>
  );
};

// UV Index Meter Component
const UVMeter = ({ darkMode, uvIndex }) => {
  const getUVColor = (uv) => {
    if (uv <= 2) return { color: '#299501', label: 'Low', bg: 'from-green-400 to-green-600' };
    if (uv <= 5) return { color: '#f7e400', label: 'Moderate', bg: 'from-yellow-400 to-yellow-600' };
    if (uv <= 7) return { color: '#f85900', label: 'High', bg: 'from-orange-400 to-orange-600' };
    if (uv <= 10) return { color: '#d8001d', label: 'Very High', bg: 'from-red-400 to-red-600' };
    return { color: '#998cff', label: 'Extreme', bg: 'from-purple-400 to-purple-600' };
  };

  const uvInfo = getUVColor(uvIndex);
  const percentage = Math.min((uvIndex / 11) * 100, 100);

  return (
    <div className={`${darkMode ? 'bg-white/5' : 'bg-white'} rounded-xl p-4 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>UV Index</span>
        <span className={`text-sm font-bold`} style={{ color: uvInfo.color }}>{uvInfo.label}</span>
      </div>
      
      {/* UV Meter Bar */}
      <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full bg-gradient-to-r ${uvInfo.bg} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${uvIndex > 5 ? 'text-white' : 'text-gray-900'}`}>
            {uvIndex}
          </span>
        </div>
      </div>
      
      {/* UV Scale */}
      <div className="flex justify-between mt-2 text-xs">
        <span className={darkMode ? 'text-green-400' : 'text-green-600'}>0-2</span>
        <span className={darkMode ? 'text-yellow-400' : 'text-yellow-600'}>3-5</span>
        <span className={darkMode ? 'text-orange-400' : 'text-orange-600'}>6-7</span>
        <span className={darkMode ? 'text-red-400' : 'text-red-600'}>8-10</span>
        <span className={darkMode ? 'text-purple-400' : 'text-purple-600'}>11+</span>
      </div>
    </div>
  );
};

// Empty State, Loading State remain the same...
const EmptyState = ({ darkMode, locationLoading }) => (
  <div className="text-center py-20">
    <div className={`inline-block p-8 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-white/50'} backdrop-blur-xl mb-6`}>
      <MapPin className={`w-20 h-20 mx-auto ${darkMode ? 'text-purple-400' : 'text-orange-500'} mb-4 ${locationLoading ? 'animate-pulse' : ''}`} />
      <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
        {locationLoading ? 'Detecting your location...' : 'Where are you traveling?'}
      </h2>
      <p className={`text-lg ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>
        {locationLoading ? 'Please allow location access' : 'Search for a destination to see weather forecasts and travel insights'}
      </p>
    </div>
  </div>
);

const LoadingState = ({ darkMode }) => (
  <div className="text-center py-20">
    <div className={`inline-block p-8 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-white/50'} backdrop-blur-xl`}>
      <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className={`text-lg ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>Loading weather data...</p>
    </div>
  </div>
);

// Weather Display with Sunrise/Sunset
const WeatherDisplay = ({ darkMode, selectedCity, weatherData, favorites, toggleFavorite, activeTab, setActiveTab, getBestDayLabel, user }) => {
  const isFavorite = favorites.some(f => f.name === selectedCity.name);

  return (
    <div className="space-y-6">
      {/* City Header */}
      <div className={`${darkMode ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-white/10' : 'bg-gradient-to-r from-orange-100 to-pink-100 border-gray-200'} backdrop-blur-xl rounded-3xl p-8 border shadow-2xl`}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedCity.name}</h2>
              <button
                onClick={() => toggleFavorite(selectedCity)}
                className={`p-2 rounded-xl ${isFavorite ? (darkMode ? 'bg-pink-500/30 hover:bg-pink-500/40' : 'bg-pink-200 hover:bg-pink-300') : (darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/50 hover:bg-white/70')} transition-all`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink-500 text-pink-500' : (darkMode ? 'text-white' : 'text-gray-600')}`} />
              </button>
            </div>
            <p className={`text-lg ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-7xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{weatherData.current.temp}°</div>
            <div className={`text-xl ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>{weatherData.current.condition}</div>
          </div>
        </div>

        {/* Sunrise & Sunset */}
        {weatherData.daily && weatherData.daily[0] && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`${darkMode ? 'bg-white/10' : 'bg-white/70'} rounded-xl p-4 flex items-center gap-3`}>
              <Sunrise className={`w-8 h-8 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <div>
                <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>Sunrise</div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(weatherData.daily[0].sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-white/10' : 'bg-white/70'} rounded-xl p-4 flex items-center gap-3`}>
              <Sunset className={`w-8 h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <div>
                <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>Sunset</div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(weatherData.daily[0].sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>
          </div>
        )}

        {weatherData.climateSummary && (
          <div className={`${darkMode ? 'bg-white/10' : 'bg-white/70'} rounded-2xl p-4 mb-6`}>
            <div className="flex items-start gap-3">
              <Eye className={`w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-orange-500'} mt-1`} />
              <div>
                <div className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-orange-600'} mb-1`}>Travel Overview</div>
                <p className={`text-base ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {weatherData.climateSummary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Stats with UV Meter */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard darkMode={darkMode} icon={Wind} label="Wind" value={`${weatherData.current.windSpeed} km/h`} />
          <StatCard darkMode={darkMode} icon={Droplets} label="Condition" value={weatherData.current.condition} />
          <UVMeter darkMode={darkMode} uvIndex={weatherData.daily[0]?.uv || 0} />
        </div>
      </div>

      {/* AQI Card */}
      {weatherData.airQuality && (
        <AQICard darkMode={darkMode} airQuality={weatherData.airQuality} />
      )}

      {/* Hourly Forecast */}
      <HourlyForecast darkMode={darkMode} hourlyData={weatherData.hourly} />

      {/* Tabs */}
      <div className={`flex gap-2 overflow-x-auto ${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-2 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
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
                  ? (darkMode ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg' : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg')
                  : (darkMode ? 'text-white hover:bg-violet-500/20' : 'text-gray-700 hover:bg-orange-100')
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'forecast' && <ForecastTab darkMode={darkMode} weatherData={weatherData} getBestDayLabel={getBestDayLabel} />}
      {activeTab === 'packing' && <PackingTab darkMode={darkMode} packingList={weatherData.packingList} />}
      {activeTab === 'activities' && <ActivitiesTab darkMode={darkMode} activityScores={weatherData.activityScores} />}
    </div>
  );
};

const StatCard = ({ darkMode, icon: Icon, label, value }) => (
  <div className={`${darkMode ? 'bg-white/10' : 'bg-white/70'} rounded-xl p-4`}>
    <Icon className={`w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-orange-500'} mb-2`} />
    <div className={`text-sm ${darkMode ? 'text-purple-200' : 'text-gray-600'}`}>{label}</div>
    <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
  </div>
);

// Forecast Tab with Sunrise/Sunset for each day
const ForecastTab = ({ darkMode, weatherData, getBestDayLabel }) => (
  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>7-Day Forecast</h3>
    <div className="space-y-4">
      {weatherData.daily.map((day, i) => {
        const quality = getBestDayLabel(day.score);
        return (
          <div key={i} className={`${darkMode ? 'bg-white/5 hover:bg-violet-500/10' : 'bg-white hover:bg-orange-50'} rounded-xl p-5 border ${darkMode ? 'border-white/10' : 'border-gray-200'} transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} min-w-[140px]`}>
                  {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <span 
                  className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: quality.color === 'emerald' ? '#10b98140' : quality.color === 'amber' ? '#f59e0b40' : '#ef444440',
                    color: quality.color === 'emerald' ? '#34d399' : quality.color === 'amber' ? '#fbbf24' : '#f87171'
                  }}
                >
                  <span>{quality.emoji}</span>
                  {quality.label}
                </span>
              </div>
              <div className="flex gap-6 items-center">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{day.high}°</div>
                  <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>High</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>{day.low}°</div>
                  <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>Low</div>
                </div>
                <div className="text-center">
                  <Droplets className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mx-auto`} />
                  <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{day.rainChance}%</div>
                </div>
              </div>
            </div>
            
            {/* Sunrise & Sunset for each day */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Sunrise className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                <span className={`text-sm ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {new Date(day.sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sunset className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <span className={`text-sm ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
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

const PackingTab = ({ darkMode, packingList }) => (
  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 flex items-center gap-2`}>
      <Luggage className="w-6 h-6" />
      Smart Packing List
    </h3>
    <div className="space-y-3">
      {packingList && packingList.map((item, i) => (
        <div key={i} className={`flex items-center gap-4 ${darkMode ? 'bg-white/5 hover:bg-violet-500/10' : 'bg-white hover:bg-orange-50'} rounded-xl p-5 border ${darkMode ? 'border-white/10' : 'border-gray-200'} transition-all`}>
          <div className={`w-12 h-12 rounded-xl ${darkMode ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-gradient-to-br from-orange-400 to-pink-500'} flex items-center justify-center text-2xl`}>
            {item.category === 'clothing' ? '👕' : item.category === 'rain' ? '☔' : item.category === 'sun' ? '🕶️' : '🧥'}
          </div>
          <div className="flex-1">
            <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.item}</div>
            <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>{item.reason}</div>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
            item.priority === 'essential' ? 'bg-red-500/20 text-red-300' :
            item.priority === 'recommended' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-green-500/20 text-green-300'
          }`}>
            {item.priority}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const ActivitiesTab = ({ darkMode, activityScores }) => (
  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Activity Recommendations</h3>
    <div className="space-y-6">
      {activityScores && activityScores.map((day, i) => (
        <div key={i} className={`${darkMode ? 'bg-white/5' : 'bg-white'} rounded-xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
            {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {day.activities.map((activity, idx) => {
              const scoreColor = activity.score >= 7 ? '#10b981' : activity.score >= 5 ? '#f59e0b' : '#ef4444';
              return (
                <div key={idx} className={`${darkMode ? 'bg-white/5 hover:bg-violet-500/10' : 'bg-gray-50 hover:bg-orange-50'} rounded-xl p-4 text-center transition-all`}>
                  <div className={`text-sm font-semibold ${darkMode ? 'text-purple-200' : 'text-gray-700'} mb-2`}>{activity.name}</div>
                  <div className="text-3xl font-bold mb-1" style={{color: scoreColor}}>{activity.score}</div>
                  <div className={`text-xs ${darkMode ? 'text-purple-300' : 'text-gray-500'}`}>out of 10</div>
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
