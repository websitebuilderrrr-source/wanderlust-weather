import React, { useState, useEffect, createContext, useContext } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Eye, Calendar, MapPin, Heart, Search, LogOut, User as UserIcon, Plus, Trash2, Check, AlertTriangle, TrendingUp, Luggage, Share2, Bell, Settings, Menu, X as XIcon } from 'lucide-react';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    return data;
  };

  const register = async (name, email, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, refreshProfile: fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  return (
    <AuthProvider>
      <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50'}`}>
        <WeatherApp darkMode={darkMode} setDarkMode={setDarkMode} showAuth={showAuth} setShowAuth={setShowAuth} />
      </div>
    </AuthProvider>
  );
}

// Weather App Component
const WeatherApp = ({ darkMode, setDarkMode, showAuth, setShowAuth }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [compareCity, setCompareCity] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [trips, setTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('forecast');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    if (user) {
      setFavorites(user.favorites || []);
      setTrips(user.trips || []);
      loadAlerts();
    }
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/alerts/check`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Alerts error:', error);
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
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/weather/forecast?lat=${city.latitude}&lon=${city.longitude}&city=${encodeURIComponent(city.name)}`,
        user ? { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } } : {}
      );
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Weather error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (city) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      const existingFav = favorites.find(f => f.name === city.name);
      
      if (existingFav) {
        await fetch(`${API_URL}/user/favorites/${existingFav._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setFavorites(favorites.filter(f => f._id !== existingFav._id));
      } else {
        const response = await fetch(`${API_URL}/user/favorites`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: city.name,
            country: city.country,
            latitude: city.latitude,
            longitude: city.longitude
          })
        });
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Favorite error:', error);
    }
  };

  const getBestDayLabel = (score) => {
    if (score >= 8) return { label: 'Great', color: 'emerald', emoji: '🟢' };
    if (score >= 5) return { label: 'Okay', color: 'amber', emoji: '🟡' };
    return { label: 'Avoid', color: 'red', emoji: '🔴' };
  };

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
        alerts={alerts}
        setShowAlerts={setShowAlerts}
      />

      <SearchBar
        darkMode={darkMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        searchResults={searchResults}
        selectCity={selectCity}
        favorites={favorites}
        user={user}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedCity ? (
          <EmptyState darkMode={darkMode} />
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
            compareCity={compareCity}
            setCompareCity={setCompareCity}
            user={user}
          />
        ) : null}
      </main>

      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}
      {showAlerts && <AlertsPanel darkMode={darkMode} alerts={alerts} onClose={() => setShowAlerts(false)} />}
    </>
  );
};

// Header Component
const Header = ({ darkMode, setDarkMode, user, logout, setShowAuth, setShowMenu, showMenu, alerts, setShowAlerts }) => (
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
          {user && alerts.length > 0 && (
            <button 
              onClick={() => setShowAlerts(true)}
              className={`relative p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/10 hover:bg-gray-900/20 text-gray-900'} transition-all`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          )}
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/10 hover:bg-gray-900/20 text-gray-900'} transition-all`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900/10 hover:bg-gray-900/20 text-gray-900'} transition-all`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="hidden md:inline">{user.name}</span>
              </button>
              
              {showMenu && (
                <div className={`absolute right-0 mt-2 w-48 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl py-2 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <button onClick={logout} className={`w-full px-4 py-2 text-left ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'} flex items-center gap-2`}>
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

// Search Bar Component
const SearchBar = ({ darkMode, searchQuery, setSearchQuery, handleSearch, searchResults, selectCity, favorites, user }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
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
              className={`w-full px-4 py-3 text-left ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'} border-b ${darkMode ? 'border-white/10' : 'border-gray-200'} last:border-0`}
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
            className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-gray-900'} border ${darkMode ? 'border-white/20' : 'border-gray-200'} transition-all whitespace-nowrap flex items-center gap-2`}
          >
            <Heart className="w-4 h-4 fill-current" />
            {city.name}
          </button>
        ))}
      </div>
    )}
  </div>
);

// Empty State
const EmptyState = ({ darkMode }) => (
  <div className="text-center py-20">
    <div className={`inline-block p-8 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-white/50'} backdrop-blur-xl mb-6`}>
      <MapPin className={`w-20 h-20 mx-auto ${darkMode ? 'text-purple-400' : 'text-orange-500'} mb-4`} />
      <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
        Where are you traveling?
      </h2>
      <p className={`text-lg ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>
        Search for a destination to see weather forecasts and travel insights
      </p>
    </div>
  </div>
);

// Loading State
const LoadingState = ({ darkMode }) => (
  <div className="text-center py-20">
    <div className={`inline-block p-8 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-white/50'} backdrop-blur-xl`}>
      <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className={`text-lg ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>Loading weather data...</p>
    </div>
  </div>
);

// Weather Display (simplified - would be split into more components)
const WeatherDisplay = ({ darkMode, selectedCity, weatherData, favorites, toggleFavorite, activeTab, setActiveTab, getBestDayLabel }) => {
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
                className={`p-2 rounded-xl ${isFavorite ? (darkMode ? 'bg-pink-500/30' : 'bg-pink-200') : (darkMode ? 'bg-white/10' : 'bg-white/50')} transition-all`}
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

        {/* Climate Summary */}
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

        {/* Current Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard darkMode={darkMode} icon={Wind} label="Wind" value={`${weatherData.current.windSpeed} km/h`} />
          <StatCard darkMode={darkMode} icon={Droplets} label="Humidity" value="65%" />
        </div>
      </div>

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
                  : (darkMode ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100')
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'forecast' && <ForecastTab darkMode={darkMode} weatherData={weatherData} getBestDayLabel={getBestDayLabel} />}
      {activeTab === 'packing' && <PackingTab darkMode={darkMode} packingList={weatherData.packingList} />}
      {activeTab === 'activities' && <ActivitiesTab darkMode={darkMode} activityScores={weatherData.activityScores} />}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ darkMode, icon: Icon, label, value }) => (
  <div className={`${darkMode ? 'bg-white/10' : 'bg-white/70'} rounded-xl p-4`}>
    <Icon className={`w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-orange-500'} mb-2`} />
    <div className={`text-sm ${darkMode ? 'text-purple-200' : 'text-gray-600'}`}>{label}</div>
    <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
  </div>
);

// Forecast Tab
const ForecastTab = ({ darkMode, weatherData, getBestDayLabel }) => (
  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>7-Day Forecast</h3>
    <div className="space-y-4">
      {weatherData.daily.map((day, i) => {
        const quality = getBestDayLabel(day.score);
        return (
          <div key={i} className={`${darkMode ? 'bg-white/5' : 'bg-white'} rounded-xl p-5 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
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
          </div>
        );
      })}
    </div>
  </div>
);

// Packing Tab
const PackingTab = ({ darkMode, packingList }) => (
  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 flex items-center gap-2`}>
      <Luggage className="w-6 h-6" />
      Smart Packing List
    </h3>
    <div className="space-y-3">
      {packingList && packingList.map((item, i) => (
        <div key={i} className={`flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-white'} rounded-xl p-5 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
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

// Activities Tab
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
                <div key={idx} className={`${darkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 text-center`}>
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

// Auth Modal (simplified)
const AuthModal = ({ darkMode, onClose }) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-md w-full shadow-2xl`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <XIcon className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'} outline-none`}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'} outline-none`}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'} outline-none`}
            required
          />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            className={`w-full py-3 rounded-xl ${darkMode ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-gradient-to-r from-orange-500 to-pink-500'} text-white font-semibold`}
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={`text-sm ${darkMode ? 'text-purple-300' : 'text-orange-600'} hover:underline`}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Alerts Panel
const AlertsPanel = ({ darkMode, alerts, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
          <Bell className="w-6 h-6" />
          Weather Alerts
        </h2>
        <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
          <XIcon className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <div key={i} className={`p-4 rounded-xl ${
            alert.severity === 'high' ? 'bg-red-500/20 border-red-500/50' :
            alert.severity === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50' :
            'bg-blue-500/20 border-blue-500/50'
          } border`}>
            <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{alert.location}</div>
            <div className={`${darkMode ? 'text-white/80' : 'text-gray-700'}`}>{alert.message}</div>
            <div className={`text-sm ${darkMode ? 'text-white/60' : 'text-gray-600'} mt-1`}>{alert.day}</div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className={`text-center py-8 ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>
            No weather alerts at this time
          </div>
        )}
      </div>
    </div>
  </div>
);

export default App;