import React, { useState } from 'react';
import { MapPin, Calendar, Luggage, TrendingUp, AlertTriangle, CheckCircle, X, Plus, Sparkles, Brain, Route, Package, Sun, Cloud, CloudRain, Wind, Thermometer, Users, Heart, Zap, Mountain, Coffee, Camera, Activity, Clock } from 'lucide-react';



const TripPlanner = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1: Cities, 2: Duration, 3: Preferences, 4: Results
  const [selectedCities, setSelectedCities] = useState([]);
  const [tripDuration, setTripDuration] = useState(7); // NEW: Trip duration in days (1-7)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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
    setStep(4);

    try {
      // Fetch weather for all cities
      const weatherPromises = selectedCities.map(city =>
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/weather/forecast?lat=${city.latitude}&lon=${city.longitude}&city=${encodeURIComponent(city.name)}`)
          .then(res => res.json())
          .then(weather => ({ city, weather }))
      );

      const citiesWithWeather = await Promise.all(weatherPromises);

      // AI Trip Planning Logic with duration consideration
      const plan = await analyzeAndPlanTrip(citiesWithWeather, preferences, tripDuration);
      
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
  const analyzeAndPlanTrip = async (citiesWithWeather, prefs, duration) => {
    // Score each city based on weather over specified duration
    const cityScores = citiesWithWeather.map(({ city, weather }) => {
      const relevantDays = weather.daily.slice(0, duration);
      const dailyScores = relevantDays.map(day => day.score || 5);
      const avgScore = dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length;
      
      // Factor in preferences
      let preferenceBonus = 0;
      
      if (prefs.adventurous) {
        const variance = calculateVariance(dailyScores);
        preferenceBonus += variance * 0.5;
      }
      
      if (prefs.calm) {
        preferenceBonus += avgScore >= 7 ? 2 : 0;
      }
      
      if (prefs.comfortable) {
        const avgTemp = relevantDays.reduce((sum, day) => sum + day.high, 0) / relevantDays.length;
        if (avgTemp >= 18 && avgTemp <= 26) preferenceBonus += 2;
      }
      
      if (prefs.nature) {
        const clearDays = relevantDays.filter(day => day.rainChance < 20).length;
        preferenceBonus += (clearDays / duration) * 2;
      }

      return {
        city,
        weather,
        score: avgScore + preferenceBonus,
        avgScore,
        preferenceBonus
      };
    });

    cityScores.sort((a, b) => b.score - a.score);

    const optimalRoute = createOptimalRoute(cityScores, prefs);
    const itinerary = generateItinerary(optimalRoute, prefs, duration);
    const packingList = generateCombinedPackingList(citiesWithWeather, prefs, duration);
    const aiExplanation = generateAIExplanation(optimalRoute, itinerary, prefs, duration);
    const warnings = generateWarnings(optimalRoute, duration);
    const tips = generateTips(optimalRoute, prefs, duration);

    return {
      route: optimalRoute,
      itinerary,
      packingList,
      aiExplanation,
      warnings,
      tips,
      totalDays: duration,
      startDate: new Date(),
      preferences: prefs
    };
  };

  // Create optimal route
  const createOptimalRoute = (cityScores, prefs) => {
    if (prefs.adventurous) {
      return cityScores;
    }
    return cityScores;
  };

  // Generate day-by-day itinerary
  const generateItinerary = (route, prefs, duration) => {
    const itinerary = [];
    let currentDay = 0;
    const citiesCount = route.length;
    
    // Calculate base days per city
    const baseDaysPerCity = Math.floor(duration / citiesCount);
    const extraDays = duration % citiesCount;
    
    route.forEach(({ city, weather, score }, cityIndex) => {
      if (currentDay >= duration) return;
      
      // Allocate days: best cities get extra days
      let daysInCity = baseDaysPerCity;
      if (cityIndex < extraDays && score >= 7) {
        daysInCity += 1;
      }
      if (daysInCity === 0) daysInCity = 1;
      
      for (let i = 0; i < daysInCity; i++) {
        if (currentDay >= duration) break;
        
        const dayWeather = weather.daily[currentDay] || weather.daily[0];
        
        itinerary.push({
          day: currentDay + 1,
          date: getDatePlusDays(currentDay),
          city: city.name,
          weather: dayWeather,
          activities: generateDayActivities(dayWeather, prefs, i === 0),
          arrival: i === 0,
          departure: i === daysInCity - 1 || currentDay === duration - 1,
          travelDay: i === 0 && currentDay > 0
        });
        
        currentDay++;
      }
    });
    
    return itinerary.slice(0, duration);
  };

  // Generate activities for a day
  const generateDayActivities = (dayWeather, prefs, isArrival) => {
    const activities = [];
    
    if (isArrival) {
      activities.push('Arrive and check into accommodation');
      activities.push('Light exploration of the area');
    } else {
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
  const generateCombinedPackingList = (citiesWithWeather, prefs, duration) => {
    const allItems = new Set();
    const itemReasons = {};
    
    citiesWithWeather.forEach(({ city, weather }) => {
      const relevantDays = weather.daily.slice(0, duration);
      const avgTemp = relevantDays.reduce((sum, day) => sum + day.high, 0) / relevantDays.length;
      const rainyDays = relevantDays.filter(day => day.rainChance > 50).length;
      const maxUV = Math.max(...relevantDays.map(day => day.uv || 0));
      
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
      
      if (rainyDays > 2) {
        allItems.add('Waterproof jacket');
        allItems.add('Umbrella');
        allItems.add('Waterproof shoes');
        itemReasons['Waterproof jacket'] = `${rainyDays} rainy days expected in ${city.name}`;
      }
      
      if (maxUV > 7) {
        allItems.add('Sunscreen SPF 50+');
        allItems.add('Sunglasses');
        allItems.add('Wide-brim hat');
        itemReasons['Sunscreen SPF 50+'] = `High UV index in ${city.name}`;
      }
    });
    
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
  const generateAIExplanation = (route, itinerary, prefs, duration) => {
    const cityNames = route.map(r => r.city.name).join(', ');
    const bestCity = route[0].city.name;
    const startCity = itinerary[0]?.city;
    
    let explanation = `Based on your ${duration}-day trip and preferences, here's your personalized plan:\n\n`;
    
    explanation += `🗺️ **Your Route:** ${cityNames}\n\n`;
    
    explanation += `**Why This Order?**\n`;
    explanation += `We've analyzed the weather patterns for your ${duration}-day journey. `;
    
    if (prefs.calm || prefs.comfortable) {
      explanation += `Since you value ${prefs.calm ? 'calm' : 'comfortable'} travel, we're starting in ${startCity}, which has the most stable weather in the coming days. `;
    } else if (prefs.adventurous) {
      explanation += `For your adventurous spirit, we've mixed cities with varying weather conditions to give you diverse experiences. `;
    } else {
      explanation += `We've optimized your route to experience the best weather windows in each city. `;
    }
    
    explanation += `${bestCity} shows the best overall conditions (${route[0].score.toFixed(1)}/10 weather score), making it an ideal highlight of your trip.\n\n`;
    
    const rainyDays = itinerary.filter(day => day.weather.rainChance > 50).length;
    const sunnyDays = duration - rainyDays;
    
    explanation += `**Weather Outlook (${duration} days):**\n`;
    explanation += `Expect ${sunnyDays} days of favorable weather and ${rainyDays} days with possible rain. `;
    
    if (rainyDays > duration / 2) {
      explanation += `The rainy days are perfect for indoor activities like museums, local cuisine experiences, and cultural exploration. `;
    } else {
      explanation += `Mostly pleasant weather means you'll enjoy plenty of outdoor time. `;
    }
    
    explanation += `\n\n**Travel Duration:**\n`;
    explanation += `Your ${duration}-day trip allows `;
    if (duration <= 3) {
      explanation += `a quick but exciting glimpse of ${route.length} ${route.length === 1 ? 'city' : 'cities'}. `;
    } else if (duration <= 5) {
      explanation += `a balanced exploration with enough time to experience the highlights. `;
    } else {
      explanation += `an in-depth experience with time to truly immerse yourself in each destination. `;
    }
    
    return explanation;
  };

  // Generate warnings
  const generateWarnings = (route, duration) => {
    const warnings = [];
    
    route.forEach(({ city, weather }) => {
      const relevantDays = weather.daily.slice(0, duration);
      const severeWeatherDays = relevantDays.filter(day => 
        day.score < 4 || (day.windSpeed && day.windSpeed > 40) || day.rainChance > 80
      );
      
      if (severeWeatherDays.length > 0) {
        warnings.push({
          city: city.name,
          severity: 'high',
          message: `${city.name}: ${severeWeatherDays.length} day(s) with challenging weather. Plan indoor alternatives.`
        });
      }
      
      const coldDays = relevantDays.filter(day => day.low < 5);
      if (coldDays.length > 0) {
        warnings.push({
          city: city.name,
          severity: 'medium',
          message: `${city.name}: Cold temperatures expected (below 5°C). Pack warm clothing.`
        });
      }
      
      const hotDays = relevantDays.filter(day => day.high > 32);
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
  const generateTips = (route, prefs, duration) => {
    const tips = [];
    
    tips.push({
      icon: '⏰',
      title: 'Time Management',
      tip: duration <= 3 
        ? 'With a short trip, prioritize must-see attractions. Consider skip-the-line tickets.'
        : duration <= 5
        ? 'You have a good balance - mix popular spots with hidden gems.'
        : 'With more time, explore at a relaxed pace and venture into local neighborhoods.'
    });
    
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
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= s ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/50'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-cyan-500' : 'bg-white/10'}`}></div>}
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

              <div className="grid grid-cols-7 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map(days => (
                  <button
                    key={days}
                    onClick={() => setTripDuration(days)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      tripDuration === days
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <Clock className={`w-8 h-8 mx-auto mb-2 ${tripDuration === days ? 'text-cyan-300' : 'text-white'}`} />
                      <div className={`text-3xl font-bold mb-1 ${tripDuration === days ? 'text-white' : 'text-white/80'}`}>
                        {days}
                      </div>
                      <div className="text-sm text-cyan-200">
                        {days === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-cyan-500/10 backdrop-blur-md rounded-xl p-4 border border-cyan-400/30">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-cyan-300 flex-shrink-0 mt-1" />
                  <div className="text-cyan-200 text-sm">
                    <strong className="text-white">Selected: {tripDuration} {tripDuration === 1 ? 'day' : 'days'}</strong>
                    <p className="mt-1">
                      {tripDuration <= 2 && "Quick getaway - focus on highlights and must-see attractions"}
                      {tripDuration >= 3 && tripDuration <= 5 && "Balanced trip - time to explore main attractions and local favorites"}
                      {tripDuration >= 6 && "Extended trip - plenty of time to immerse yourself and discover hidden gems"}
                    </p>
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
                  <p className="text-cyan-200">Creating your perfect {tripDuration}-day itinerary</p>
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

// Trip Results Component (same as before, just showing itinerary is limited by duration now)
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
