// Import required icons and React
import React from 'react';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Wind, 
  Droplets, 
  Eye 
} from 'lucide-react';

/* 
═══════════════════════════════════════════════════════════════
  🎨 CUSTOMIZATION GUIDE - HOW TO CHANGE COLORS & TRANSPARENCY
═══════════════════════════════════════════════════════════════

CARD BACKGROUND & TRANSPARENCY:
-------------------------------
Current: bg-white/10 = 10% white background

Change the number to adjust transparency:
  bg-white/5   = 5% transparent (more transparent, darker)
  bg-white/10  = 10% transparent (current)
  bg-white/15  = 15% transparent (brighter)
  bg-white/20  = 20% transparent (even brighter)
  bg-white/30  = 30% transparent (very bright)

Change color:
  bg-white/10    = White tint (current)
  bg-cyan-500/10 = Cyan tint
  bg-blue-500/10 = Blue tint
  bg-purple-500/10 = Purple tint
  bg-slate-500/10 = Gray tint

BORDER TRANSPARENCY:
--------------------
Current: border-white/20 = 20% white border

Change the number:
  border-white/10 = Subtle border
  border-white/20 = Current
  border-white/30 = More visible
  border-white/50 = Very visible

HOVER EFFECTS:
--------------
Current: hover:bg-white/15 = Brightens on hover

Change to:
  hover:bg-white/10 = Subtle hover
  hover:bg-white/20 = Strong hover
  hover:bg-cyan-500/20 = Colored hover

BLUR AMOUNT:
------------
Current: backdrop-blur-xl = Maximum blur

Change to:
  backdrop-blur-sm  = Small blur
  backdrop-blur-md  = Medium blur
  backdrop-blur-lg  = Large blur
  backdrop-blur-xl  = Extra large (current)
  backdrop-blur-none = No blur (remove glass effect)

EXAMPLE: Make cards more visible
Change: bg-white/10 → bg-white/20
Change: border-white/20 → border-white/30

EXAMPLE: Make cards less visible
Change: bg-white/10 → bg-white/5
Change: border-white/20 → border-white/10

═══════════════════════════════════════════════════════════════
*/

// AQI Display Component with glass effect
const AQICard = ({ airQuality }) => {
  if (!airQuality) return null;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Wind className="w-5 h-5" />
        Air Quality Index
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main AQI - Inner card */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-cyan-200 mb-1">Air Quality</div>
              <div className="text-4xl font-bold" style={{ color: airQuality.color }}>
                {airQuality.aqi}
              </div>
            </div>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
              style={{ backgroundColor: airQuality.color }}
            >
              AQI
            </div>
          </div>
          <div className="text-lg font-semibold mb-2" style={{ color: airQuality.color }}>
            {airQuality.category}
          </div>
          <div className="text-sm text-white">
            {airQuality.healthRecommendation}
          </div>
        </div>

        {/* Pollutants - Inner card */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="text-sm font-semibold text-cyan-200 mb-4">
            Pollutant Levels
          </div>
          <div className="space-y-3">
            {airQuality.pm25 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">PM2.5</span>
                <span className="text-sm font-semibold text-cyan-200">
                  {airQuality.pm25.toFixed(1)} µg/m³
                </span>
              </div>
            )}
            {airQuality.pm10 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">PM10</span>
                <span className="text-sm font-semibold text-cyan-200">
                  {airQuality.pm10.toFixed(1)} µg/m³
                </span>
              </div>
            )}
            {airQuality.o3 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">Ozone (O₃)</span>
                <span className="text-sm font-semibold text-cyan-200">
                  {airQuality.o3.toFixed(1)} µg/m³
                </span>
              </div>
            )}
            {airQuality.no2 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">NO₂</span>
                <span className="text-sm font-semibold text-cyan-200">
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

// Hourly Forecast Component with glass effect
const HourlyForecast = ({ hourlyData }) => {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
      <h3 className="text-2xl font-bold text-white mb-6">
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
                className="flex-shrink-0 bg-white/5 hover:bg-white/15 rounded-xl p-4 border border-white/20 transition-all cursor-pointer min-w-[140px] backdrop-blur-md"
              >
                {/* Time */}
                <div className="text-sm font-semibold text-cyan-200 mb-3 text-center">
                  {i === 0 ? 'Now' : hour.time}
                </div>
                
                {/* Weather Icon */}
                <div className="flex justify-center mb-3">
                  <Icon className={`w-10 h-10 ${
                    hour.condition.includes('Rain') ? 'text-blue-400' :
                    hour.condition.includes('Cloud') ? 'text-gray-400' :
                    'text-yellow-400'
                  }`} />
                </div>
                
                {/* Temperature */}
                <div className="text-2xl font-bold text-white text-center mb-2">
                  {hour.temp}°
                </div>
                
                {/* Feels Like */}
                <div className="text-xs text-cyan-200 text-center mb-3">
                  Feels {hour.feelsLike}°
                </div>
                
                {/* Condition */}
                <div className="text-xs text-white/70 text-center mb-3">
                  {hour.condition}
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                  {/* Rain */}
                  <div className="text-center">
                    <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    <div className="text-xs font-semibold text-white">
                      {hour.rainChance}%
                    </div>
                  </div>
                  
                  {/* Wind */}
                  <div className="text-center">
                    <Wind className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                    <div className="text-xs font-semibold text-white">
                      {hour.windSpeed}
                    </div>
                  </div>
                  
                  {/* Humidity */}
                  <div className="text-center">
                    <Droplets className="w-4 h-4 mx-auto mb-1 text-cyan-300" />
                    <div className="text-xs font-semibold text-white">
                      {hour.humidity}%
                    </div>
                  </div>
                  
                  {/* Visibility (if available) */}
                  {hour.visibility && (
                    <div className="text-center">
                      <Eye className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                      <div className="text-xs font-semibold text-white">
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
      <div className="text-center text-sm text-cyan-200 mt-2">
        ← Scroll to see more hours →
      </div>
    </div>
  );
};

export { AQICard, HourlyForecast };
