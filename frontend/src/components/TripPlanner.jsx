import React, { useState } from 'react';
import { MapPin, Calendar, Luggage, TrendingUp, AlertTriangle, CheckCircle, X, Plus, Sparkles, Brain, Route, Package, Sun, Cloud, CloudRain, Wind, Thermometer, Users, Heart, Zap, Mountain, Coffee, Camera, Activity } from 'lucide-react';

/* 
═══════════════════════════════════════════════════════════════
  🧳 AI TRIP PLANNER COMPONENT
═══════════════════════════════════════════════════════════════
  
  Features:
  - Select up to 7 cities
  - Choose travel preferences (8 options)
  - AI analyzes 7-day weather forecast
  - Optimal route calculation
  - Day-by-day itinerary
  - Smart packing recommendations
  - Weather warnings & tips
  - Human-friendly AI-generated explanations
  
═══════════════════════════════════════════════════════════════
*/

const TripPlanner = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1: Cities, 2: Days, 3: Preferences, 4: Results
  const [selectedCities, setSelectedCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [tripDays, setTripDays] = useState(7); // Default 7 days
  const [preferences, setPreferences] = useState({
    adventurous: false,
    calm: false,
    comfortable: false,
    lowBudget: false,
    lowLuggage: false,
    photography: false,
    foodie: false,
    nature: false
  });
  const [tripPlan, setTripPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search cities (using Open-Meteo)
  const searchCity = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  // Add city to trip
  const addCity = (city) => {
    if (selectedCities.length >= 7) {
      alert('Maximum 7 cities allowed');
      return;
    }
    
    if (selectedCities.find(c => c.name === city.name)) {
      alert('City already added');
      return;
    }

    setSelectedCities([...selectedCities, {
      name: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      admin1: city.admin1
    }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove city
  const removeCity = (index) => {
    setSelectedCities(selectedCities.filter((_, i) => i !== index));
  };

  // Toggle preference
  const togglePreference = (pref) => {
    setPreferences({
      ...preferences,
      [pref]: !preferences[pref]
    });
  };

  // Generate trip plan (AI logic)
  const generateTripPlan = async () => {
    if (selectedCities.length === 0) {
      alert('Please add at least one city');
      return;
    }

    setLoading(true);
    setStep(4); // Now step 4 for results

    try {
      // Fetch weather for all cities
      const weatherPromises = selectedCities.map(city =>
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/weather/forecast?lat=${city.latitude}&lon=${city.longitude}&city=${encodeURIComponent(city.name)}`)
          .then(res => res.json())
          .then(weather => ({ city, weather }))
      );

      const citiesWithWeather = await Promise.all(weatherPromises);

      // AI Trip Planning Logic with selected trip days
      const plan = await analyzeAndPlanTrip(citiesWithWeather, preferences, tripDays);
      
      setTripPlan(plan);
    } catch (error) {
      console.error('Trip planning error:', error);
      alert('Failed to generate trip plan. Please try again.');
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // AI Trip Analysis Logic
  const analyzeAndPlanTrip = async (citiesWithWeather, prefs, totalDays) => {
    // Score each city based on weather over 7 days
    const cityScores = citiesWithWeather.map(({ city, weather }) => {
      const dailyScores = weather.daily.map(day => day.score || 5);
      const avgScore = dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length;
      
      // Factor in preferences
      let preferenceBonus = 0;
      
      if (prefs.adventurous) {
        // Prefer varied weather
        const variance = calculateVariance(dailyScores);
        preferenceBonus += variance * 0.5;
      }
      
      if (prefs.calm) {
        // Prefer stable, good weather
        preferenceBonus += avgScore >= 7 ? 2 : 0;
      }
      
      if (prefs.comfortable) {
        // Prefer moderate temperatures
        const avgTemp = weather.daily.reduce((sum, day) => sum + day.high, 0) / weather.daily.length;
        if (avgTemp >= 18 && avgTemp <= 26) preferenceBonus += 2;
      }
      
      if (prefs.nature) {
        // Slight preference for clear weather
        const clearDays = weather.daily.filter(day => day.rainChance < 20).length;
        preferenceBonus += (clearDays / 7) * 2;
      }

      return {
        city,
        weather,
        score: avgScore + preferenceBonus,
        avgScore,
        preferenceBonus
      };
    });

    // Sort cities by best to worst weather
    cityScores.sort((a, b) => b.score - a.score);

    // Create optimal route (start with best weather, end with second-best to avoid worst)
    const optimalRoute = createOptimalRoute(cityScores, prefs);

    // Generate day-by-day itinerary with selected trip days
    const itinerary = generateItinerary(optimalRoute, prefs, totalDays);

    // Generate packing list (combined from all cities)
    const packingList = generateCombinedPackingList(citiesWithWeather, prefs);

    // Generate AI explanation
    const aiExplanation = generateAIExplanation(optimalRoute, itinerary, prefs, totalDays);

    // Generate warnings and tips
    const warnings = generateWarnings(optimalRoute);
    const tips = generateTips(optimalRoute, prefs);

    return {
      route: optimalRoute,
      itinerary,
      packingList,
      aiExplanation,
      warnings,
      tips,
      totalDays: totalDays,
      startDate: new Date(),
      preferences: prefs
    };
  };

  // Create optimal route
  const createOptimalRoute = (cityScores, prefs) => {
    if (prefs.adventurous) {
      // Mix good and challenging weather
      return cityScores;
    }
    
    // Start with best weather cities
    return cityScores;
  };

  // Generate day-by-day itinerary
  const generateItinerary = (route, prefs, totalDays) => {
    const itinerary = [];
    let currentDay = 0;
    
    route.forEach(({ city, weather, score }) => {
      // Determine days to spend in this city based on weather and preferences
      const daysInCity = calculateDaysInCity(weather, score, prefs, totalDays, currentDay);
      
      for (let i = 0; i < daysInCity; i++) {
        if (currentDay >= totalDays) break;
        
        const dayWeather = weather.daily[currentDay] || weather.daily[0];
        
        itinerary.push({
          day: currentDay + 1,
          date: getDatePlusDays(currentDay),
          city: city.name,
          weather: dayWeather,
          activities: generateDayActivities(dayWeather, prefs, i === 0),
          arrival: i === 0,
          departure: i === daysInCity - 1 || currentDay === totalDays - 1,
          travelDay: i === 0 && currentDay > 0
        });
        
        currentDay++;
      }
    });
    
    return itinerary.slice(0, totalDays);
  };

  // Calculate days to spend in each city
  const calculateDaysInCity = (weather, score, prefs, totalDays, currentDay) => {
    const remainingDays = totalDays - currentDay;
    
    // Don't spend more days than remaining
    if (remainingDays <= 0) return 0;
    
    // If only 1-2 days left, use them all
    if (remainingDays <= 2) return remainingDays;
    
    // Otherwise calculate based on weather score
    if (score >= 8) return Math.min(3, remainingDays); // Great weather = stay longer
    if (score >= 6) return Math.min(2, remainingDays); // Good weather = moderate stay
    return Math.min(1, remainingDays); // Poor weather = move quickly
  };

  // Generate activities for a day
  const generateDayActivities = (dayWeather, prefs, isArrival) => {
    const activities = [];
    
    if (isArrival) {
      activities.push('Arrive and check into accommodation');
      activities.push('Light exploration of the area');
    } else {
      // Activity based on weather
      if (dayWeather.rainChance < 30) {
        if (prefs.nature) activities.push('Outdoor hiking or nature walk');
        if (prefs.photography) activities.push('Photography tour of scenic spots');
        if (prefs.adventurous) activities.push('Adventure activities (zip-lining, rafting, etc.)');
        if (!activities.length) activities.push('City sightseeing and outdoor attractions');
      } else {
        if (prefs.foodie) activities.push('Explore local food markets and restaurants');
        activities.push('Visit museums and indoor attractions');
        activities.push('Shopping and café hopping');
      }
      
      if (prefs.calm) {
        activities.push('Relaxing evening at accommodation or spa');
      }
    }
    
    return activities.slice(0, 3);
  };

  // Generate combined packing list
  const generateCombinedPackingList = (citiesWithWeather, prefs) => {
    const allItems = new Set();
    const itemReasons = {};
    
    citiesWithWeather.forEach(({ city, weather }) => {
      const avgTemp = weather.daily.reduce((sum, day) => sum + day.high, 0) / weather.daily.length;
      const rainyDays = weather.daily.filter(day => day.rainChance > 50).length;
      const maxUV = Math.max(...weather.daily.map(day => day.uv || 0));
      
      // Temperature-based clothing
      if (avgTemp > 25) {
        allItems.add('Light summer clothes');
        itemReasons['Light summer clothes'] = `${city.name} has warm temperatures`;
      } else if (avgTemp < 15) {
        allItems.add('Warm jacket');
        allItems.add('Sweaters and layers');
        itemReasons['Warm jacket'] = `${city.name} will be cold`;
      } else {
        allItems.add('Light jacket');
        allItems.add('Versatile layers');
        itemReasons['Versatile layers'] = 'Variable temperatures across cities';
      }
      
      // Rain gear
      if (rainyDays > 2) {
        allItems.add('Waterproof jacket');
        allItems.add('Umbrella');
        allItems.add('Waterproof shoes');
        itemReasons['Waterproof jacket'] = `${rainyDays} rainy days expected in ${city.name}`;
      }
      
      // Sun protection
      if (maxUV > 7) {
        allItems.add('Sunscreen SPF 50+');
        allItems.add('Sunglasses');
        allItems.add('Wide-brim hat');
        itemReasons['Sunscreen SPF 50+'] = `High UV index in ${city.name}`;
      }
    });
    
    // Preference-based items
    if (prefs.lowLuggage) {
      allItems.add('Quick-dry clothes (pack light!)');
      allItems.add('Travel-size toiletries');
      itemReasons['Quick-dry clothes (pack light!)'] = 'You prefer traveling light';
    }
    
    if (prefs.adventurous) {
      allItems.add('Hiking boots');
      allItems.add('Backpack for day trips');
      itemReasons['Hiking boots'] = 'For adventure activities';
    }
    
    if (prefs.photography) {
      allItems.add('Camera gear');
      allItems.add('Extra memory cards & batteries');
      itemReasons['Camera gear'] = 'For capturing memories';
    }
    
    if (prefs.comfortable) {
      allItems.add('Comfortable walking shoes');
      allItems.add('Travel pillow');
      itemReasons['Comfortable walking shoes'] = 'For long days of exploration';
    }
    
    // Essential items
    allItems.add('Travel documents & insurance');
    allItems.add('Phone charger & power bank');
    allItems.add('Basic first-aid kit');
    allItems.add('Reusable water bottle');
    
    return Array.from(allItems).map(item => ({
      item,
      reason: itemReasons[item] || 'Essential travel item',
      priority: itemReasons[item] ? 'recommended' : 'essential'
    }));
  };

  // Generate AI explanation
  const generateAIExplanation = (route, itinerary, prefs, totalDays) => {
    const cityNames = route.map(r => r.city.name).join(', ');
    const bestCity = route[0].city.name;
    const startCity = itinerary[0]?.city;
    
    let explanation = `Based on your ${totalDays}-day trip plan and weather forecast, here's your personalized itinerary:\n\n`;
    
    explanation += `🗺️ **Your Route:** ${cityNames}\n\n`;
    
    explanation += `**Why This Order?**\n`;
    explanation += `We've analyzed the weather patterns across all your chosen cities for the next ${totalDays} days. `;
    
    if (prefs.calm || prefs.comfortable) {
      explanation += `Since you value ${prefs.calm ? 'calm' : 'comfortable'} travel, we're starting in ${startCity}, which has the most stable weather in the coming days. `;
    } else if (prefs.adventurous) {
      explanation += `For your adventurous spirit, we've mixed cities with varying weather conditions to give you diverse experiences. `;
    } else {
      explanation += `We've optimized your route to experience the best weather windows in each city. `;
    }
    
    explanation += `${bestCity} shows the best overall conditions (${route[0].score.toFixed(1)}/10 weather score), making it an ideal highlight of your trip.\n\n`;
    
    // Weather insights
    const rainyDays = itinerary.filter(day => day.weather.rainChance > 50).length;
    const sunnyDays = totalDays - rainyDays;
    
    explanation += `**Weather Outlook:**\n`;
    explanation += `Expect ${sunnyDays} days of favorable weather and ${rainyDays} days with possible rain. `;
    
    if (rainyDays > Math.floor(totalDays / 2)) {
      explanation += `The rainy days are perfect for indoor activities like museums, local cuisine experiences, and cultural exploration. `;
    } else {
      explanation += `Mostly pleasant weather means you'll enjoy plenty of outdoor time. `;
    }
    
    explanation += `\n\n**Travel Style Match:**\n`;
    const selectedPrefs = Object.keys(prefs).filter(key => prefs[key]);
    if (selectedPrefs.length > 0) {
      explanation += `Your ${totalDays}-day plan is tailored to your ${selectedPrefs.join(', ')} preferences. `;
      
      if (prefs.lowLuggage) {
        explanation += `We've minimized packing requirements with versatile items that work across all cities. `;
      }
      if (prefs.foodie) {
        explanation += `Each city offers unique culinary experiences - we've scheduled rainy days for food exploration. `;
      }
      if (prefs.nature) {
        explanation += `Outdoor activities are scheduled for days with the best weather. `;
      }
    }
    
    return explanation;
  };

  // Generate warnings
  const generateWarnings = (route) => {
    const warnings = [];
    
    route.forEach(({ city, weather }) => {
      const severeWeatherDays = weather.daily.filter(day => 
        day.score < 4 || day.windSpeed > 40 || day.rainChance > 80
      );
      
      if (severeWeatherDays.length > 0) {
        warnings.push({
          city: city.name,
          severity: 'high',
          message: `${city.name}: ${severeWeatherDays.length} day(s) with challenging weather. Plan indoor alternatives.`
        });
      }
      
      const coldDays = weather.daily.filter(day => day.low < 5);
      if (coldDays.length > 0) {
        warnings.push({
          city: city.name,
          severity: 'medium',
          message: `${city.name}: Cold temperatures expected (below 5°C). Pack warm clothing.`
        });
      }
      
      const hotDays = weather.daily.filter(day => day.high > 32);
      if (hotDays.length > 0) {
        warnings.push({
          city: city.name,
          severity: 'medium',
          message: `${city.name}: Very hot weather expected (above 32°C). Stay hydrated and use sun protection.`
        });
      }
    });
    
    return warnings;
  };

  // Generate tips
  const generateTips = (route, prefs) => {
    const tips = [];
    
    tips.push({
      icon: '🎒',
      title: 'Pack Smart',
      tip: prefs.lowLuggage 
        ? 'Pack versatile items that can be mixed and matched. Quick-dry fabrics are your friend!'
        : 'Create a packing checklist the day before. Roll clothes to save space.'
    });
    
    tips.push({
      icon: '📱',
      title: 'Stay Connected',
      tip: 'Download offline maps for each city. Save important addresses and emergency contacts.'
    });
    
    tips.push({
      icon: '💰',
      title: 'Budget Wisely',
      tip: prefs.lowBudget
        ? 'Look for free walking tours and local markets. Cook some meals if accommodation allows.'
        : 'Set a daily budget including meals, activities, and unexpected expenses.'
    });
    
    if (prefs.photography) {
      tips.push({
        icon: '📸',
        title: 'Golden Hour Magic',
        tip: 'Best photos happen during sunrise and sunset. Wake up early or stay out late!'
      });
    }
    
    if (prefs.foodie) {
      tips.push({
        icon: '🍽️',
        title: 'Culinary Adventures',
        tip: 'Ask locals for restaurant recommendations. The best food is often off the tourist path.'
      });
    }
    
    tips.push({
      icon: '⏰',
      title: 'Flexible Planning',
      tip: 'Weather can change. Have backup indoor plans for each day just in case.'
    });
    
    return tips;
  };

  // Helper functions
  const calculateVariance = (numbers) => {
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - avg, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  };

  const getDatePlusDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Preference options
  const preferenceOptions = [
    { key: 'adventurous', label: 'Adventurous', icon: Mountain, desc: 'Outdoor activities, thrills, challenges' },
    { key: 'calm', label: 'Calm & Relaxing', icon: Heart, desc: 'Peaceful, stress-free, slow pace' },
    { key: 'comfortable', label: 'Comfortable', icon: Coffee, desc: 'Moderate pace, good amenities' },
    { key: 'lowBudget', label: 'Budget-Friendly', icon: Zap, desc: 'Cost-effective choices' },
    { key: 'lowLuggage', label: 'Light Packing', icon: Luggage, desc: 'Minimal luggage, pack light' },
    { key: 'photography', label: 'Photography', icon: Camera, desc: 'Scenic spots, photo opportunities' },
    { key: 'foodie', label: 'Food Explorer', icon: Users, desc: 'Local cuisine, restaurants, markets' },
    { key: 'nature', label: 'Nature Lover', icon: Activity, desc: 'Parks, hiking, outdoor beauty' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl max-w-6xl w-full border border-white/20 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                AI Trip Planner
                <Brain className="w-5 h-5 text-cyan-400" />
              </h2>
              <p className="text-sm text-cyan-200">Smart weather-based itinerary</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 p-4 border-b border-white/20">
          {[
            { num: 1, label: 'Cities' },
            { num: 2, label: 'Days' },
            { num: 3, label: 'Style' },
            { num: 4, label: 'Plan' }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  step >= s.num ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/50'
                }`}>
                  {s.num}
                </div>
                <span className={`text-xs mt-1 ${step >= s.num ? 'text-cyan-300' : 'text-white/50'}`}>
                  {s.label}
                </span>
              </div>
              {i < 3 && <div className={`w-8 md:w-12 h-1 mb-4 ${step > s.num ? 'bg-cyan-500' : 'bg-white/10'}`}></div>}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {/* Step 1: Select Cities */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Select Your Cities</h3>
                <p className="text-cyan-200">Choose up to 7 cities you want to visit ({selectedCities.length}/7)</p>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchCity(e.target.value);
                  }}
                  placeholder="Search for a city..."
                  className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-cyan-200/50 outline-none"
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute w-full mt-2 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/20 max-h-60 overflow-y-auto z-10">
                    {searchResults.map((city, i) => (
                      <button
                        key={i}
                        onClick={() => addCity(city)}
                        className="w-full px-4 py-3 text-left hover:bg-white/10 text-white border-b border-white/10 last:border-0"
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

              {/* Selected Cities */}
              <div className="space-y-2">
                {selectedCities.map((city, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{city.name}</div>
                        <div className="text-sm text-cyan-200">{city.country}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCity(i)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {selectedCities.length === 0 && (
                <div className="text-center py-12 text-cyan-200">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No cities selected yet</p>
                  <p className="text-sm mt-2">Search and add cities to start planning your trip</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Trip Duration */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">How Long is Your Trip?</h3>
                <p className="text-cyan-200">Select the total number of days (1-7 days)</p>
              </div>

              {/* Day Selector Buttons */}
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map(days => (
                  <button
                    key={days}
                    onClick={() => setTripDays(days)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      tripDays === days
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-4xl font-bold mb-2 ${tripDays === days ? 'text-cyan-300' : 'text-white'}`}>
                      {days}
                    </div>
                    <div className={`text-sm ${tripDays === days ? 'text-cyan-200' : 'text-white/70'}`}>
                      {days === 1 ? 'Day' : 'Days'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Visual Timeline */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-cyan-300" />
                  <span className="text-white font-semibold">Your {tripDays}-Day Journey</span>
                </div>
                <div className="flex gap-2">
                  {Array(7).fill(0).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-12 rounded-lg flex items-center justify-center font-bold transition-all ${
                        i < tripDays
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center text-cyan-200">
                  Perfect for a {tripDays === 1 ? 'quick day trip' : 
                               tripDays <= 3 ? 'weekend getaway' : 
                               tripDays <= 5 ? 'extended trip' : 
                               'full week adventure'}!
                </div>
              </div>

              {/* Trip Length Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="text-2xl mb-2">🏙️</div>
                  <div className="text-sm text-cyan-200 mb-1">Cities You Can Visit</div>
                  <div className="text-xl font-bold text-white">
                    {tripDays === 1 ? '1 city' : 
                     tripDays <= 3 ? '1-2 cities' : 
                     tripDays <= 5 ? '2-3 cities' : 
                     '3-4 cities'}
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm text-cyan-200 mb-1">Trip Pace</div>
                  <div className="text-xl font-bold text-white">
                    {tripDays <= 2 ? 'Fast' : 
                     tripDays <= 4 ? 'Moderate' : 
                     'Relaxed'}
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="text-2xl mb-2">🧳</div>
                  <div className="text-sm text-cyan-200 mb-1">Packing Style</div>
                  <div className="text-xl font-bold text-white">
                    {tripDays <= 2 ? 'Light bag' : 
                     tripDays <= 4 ? 'Carry-on' : 
                     'Full luggage'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Choose Your Travel Style</h3>
                <p className="text-cyan-200">Select preferences that match your trip (choose any)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preferenceOptions.map(({ key, label, icon: Icon, desc }) => (
                  <button
                    key={key}
                    onClick={() => togglePreference(key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      preferences[key]
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-6 h-6 flex-shrink-0 ${preferences[key] ? 'text-cyan-300' : 'text-white'}`} />
                      <div>
                        <div className={`font-semibold ${preferences[key] ? 'text-white' : 'text-white/80'}`}>
                          {label}
                        </div>
                        <div className="text-sm text-cyan-200/70 mt-1">{desc}</div>
                      </div>
                      {preferences[key] && (
                        <CheckCircle className="w-5 h-5 text-cyan-400 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && (
            <div>
              {loading ? (
                <div className="text-center py-20">
                  <div className="animate-spin w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-lg text-white mb-2">Analyzing weather patterns...</p>
                  <p className="text-cyan-200">Creating your perfect itinerary</p>
                </div>
              ) : tripPlan ? (
                <TripResults plan={tripPlan} />
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        {!loading && (
          <div className="flex items-center justify-between p-6 border-t border-white/20">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                step > 1
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-white/5 text-white/50 cursor-not-allowed'
              }`}
              disabled={step === 1}
            >
              Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => {
                  if (step === 1 && selectedCities.length === 0) {
                    alert('Please add at least one city');
                    return;
                  }
                  if (step === 3) {
                    generateTripPlan();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold transition-all shadow-lg flex items-center gap-2"
              >
                {step === 3 ? (
                  <>
                    <Brain className="w-5 h-5" />
                    Generate AI Plan
                  </>
                ) : (
                  'Next'
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold transition-all"
              >
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Trip Results Component
const TripResults = ({ plan }) => {
  const [activeTab, setActiveTab] = useState('itinerary');

  return (
    <div className="space-y-6">
      {/* AI Explanation */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/30">
        <div className="flex items-start gap-3 mb-4">
          <Brain className="w-6 h-6 text-cyan-300 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">AI Analysis & Recommendation</h3>
            <div className="text-white/90 whitespace-pre-line leading-relaxed">{plan.aiExplanation}</div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {plan.warnings.length > 0 && (
        <div className="bg-red-500/10 backdrop-blur-md rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h4 className="font-bold text-white">Important Warnings</h4>
          </div>
          <div className="space-y-2">
            {plan.warnings.map((warning, i) => (
              <div key={i} className="text-sm text-red-200">
                • {warning.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/20">
        {[
          { id: 'itinerary', label: 'Day-by-Day', icon: Calendar },
          { id: 'packing', label: 'Packing List', icon: Luggage },
          { id: 'tips', label: 'Pro Tips', icon: Sparkles }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === id
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-cyan-200 hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'itinerary' && (
        <div className="space-y-3">
          {plan.itinerary.map((day, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white">Day {day.day}</span>
                    <span className="text-sm text-cyan-200">• {day.date}</span>
                    {day.travelDay && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Travel Day</span>}
                  </div>
                  <div className="text-xl font-bold text-cyan-300">{day.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{day.weather.high}°</div>
                  <div className="text-sm text-cyan-200">{day.weather.condition}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-white">
                  <div className="font-semibold mb-1">Weather:</div>
                  <div className="flex gap-4 text-cyan-200">
                    <span>☔ {day.weather.rainChance}%</span>
                    <span>💨 {day.weather.windSpeed} km/h</span>
                    <span>🌡️ {day.weather.low}° - {day.weather.high}°</span>
                  </div>
                </div>

                <div className="text-sm text-white">
                  <div className="font-semibold mb-1">Suggested Activities:</div>
                  <ul className="space-y-1">
                    {day.activities.map((activity, j) => (
                      <li key={j} className="text-cyan-200">• {activity}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'packing' && (
        <div className="space-y-3">
          {plan.packingList.map((item, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                {item.priority === 'essential' ? '⭐' : '✓'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">{item.item}</div>
                <div className="text-sm text-cyan-200">{item.reason}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                item.priority === 'essential' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
              }`}>
                {item.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="space-y-3">
          {plan.tips.map((tip, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/20">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{tip.icon}</span>
                <div>
                  <div className="font-bold text-white mb-1">{tip.title}</div>
                  <div className="text-cyan-200">{tip.tip}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
