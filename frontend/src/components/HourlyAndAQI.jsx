import React from 'react';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Wind, 
  Droplets, 
  Eye 
} from 'lucide-react';

// AQI Display Component
const AQICard = ({ darkMode, airQuality }) => {
  if (!airQuality) return null;

  return (
    <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
      <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
        <Wind className="w-5 h-5" />
        Air Quality Index
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main AQI */}
        <div className={`${darkMode ? 'bg-white/5' : 'bg-white'} rounded-xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'} mb-1`}>Air Quality</div>
              <div className={`text-4xl font-bold`} style={{ color: airQuality.color }}>
                {airQuality.aqi}
              </div>
            </div>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: airQuality.color }}
            >
              AQI
            </div>
          </div>
          <div className={`text-lg font-semibold mb-2`} style={{ color: airQuality.color }}>
            {airQuality.category}
          </div>
          <div className={`text-sm ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
            {airQuality.healthRecommendation}
          </div>
        </div>

        {/* Pollutants */}
        <div className={`${darkMode ? 'bg-white/5' : 'bg-white'} rounded-xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-gray-600'} mb-4`}>
            Pollutant Levels
          </div>
          <div className="space-y-3">
            {airQuality.pm25 && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>PM2.5</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {airQuality.pm25.toFixed(1)} µg/m³
                </span>
              </div>
            )}
            {airQuality.pm10 && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>PM10</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {airQuality.pm10.toFixed(1)} µg/m³
                </span>
              </div>
            )}
            {airQuality.o3 && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Ozone (O₃)</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {airQuality.o3.toFixed(1)} µg/m³
                </span>
              </div>
            )}
            {airQuality.no2 && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>NO₂</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {airQuality.no2.toFixed(1)} µg/m³
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Hourly Forecast Component
const HourlyForecast = ({ darkMode, hourlyData }) => {
  return (
    <div className={`${darkMode ? 'bg-white/5' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
      <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>
        Next 24 Hours
      </h3>
      
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {hourlyData.slice(0, 24).map((hour, i) => {
            const Icon = hour.condition.includes('Rain') ? CloudRain : 
                        hour.condition.includes('Cloud') ? Cloud : Sun;
            
            return (
              <div 
                key={i} 
                className={`flex-shrink-0 ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-50'} rounded-xl p-4 border ${darkMode ? 'border-white/10' : 'border-gray-200'} transition-all cursor-pointer min-w-[140px]`}
              >
                {/* Time */}
                <div className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-gray-600'} mb-3 text-center`}>
                  {i === 0 ? 'Now' : hour.time}
                </div>
                
                {/* Weather Icon */}
                <div className="flex justify-center mb-3">
                  <Icon className={`w-10 h-10 ${
                    hour.condition.includes('Rain') ? (darkMode ? 'text-blue-400' : 'text-blue-500') :
                    hour.condition.includes('Cloud') ? (darkMode ? 'text-gray-400' : 'text-gray-500') :
                    (darkMode ? 'text-yellow-400' : 'text-yellow-500')
                  }`} />
                </div>
                
                {/* Temperature */}
                <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} text-center mb-2`}>
                  {hour.temp}°
                </div>
                
                {/* Feels Like */}
                <div className={`text-xs ${darkMode ? 'text-purple-300' : 'text-gray-600'} text-center mb-3`}>
                  Feels {hour.feelsLike}°
                </div>
                
                {/* Condition */}
                <div className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-600'} text-center mb-3`}>
                  {hour.condition}
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                  {/* Rain */}
                  <div className="text-center">
                    <Droplets className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {hour.rainChance}%
                    </div>
                  </div>
                  
                  {/* Wind */}
                  <div className="text-center">
                    <Wind className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {hour.windSpeed}
                    </div>
                  </div>
                  
                  {/* Humidity */}
                  <div className="text-center">
                    <Droplets className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {hour.humidity}%
                    </div>
                  </div>
                  
                  {/* Visibility (if available) */}
                  {hour.visibility && (
                    <div className="text-center">
                      <Eye className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {hour.visibility}km
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Scroll Hint */}
      <div className={`text-center text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'} mt-2`}>
        ← Scroll to see more hours →
      </div>
    </div>
  );
};

export { AQICard, HourlyForecast };
