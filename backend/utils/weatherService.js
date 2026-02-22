const axios = require('axios');

class WeatherService {
  constructor() {
    this.baseURL = 'https://api.open-meteo.com/v1';
    this.geocodingURL = 'https://geocoding-api.open-meteo.com/v1';
  }

  // Get coordinates for a city
  async searchCity(cityName) {
    try {
      const response = await axios.get(`${this.geocodingURL}/search`, {
        params: {
          name: cityName,
          count: 5,
          language: 'en',
          format: 'json'
        }
      });

      return response.data.results || [];
    } catch (error) {
      console.error('City search error:', error.message);
      throw new Error('Failed to search city');
    }
  }

  // Get weather forecast
  async getForecast(latitude, longitude) {
    try {
      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          latitude,
          longitude,
          hourly: 'temperature_2m,precipitation_probability,weathercode,windspeed_10m,relativehumidity_2m',
          daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max,sunrise,sunset',
          current_weather: true,
          temperature_unit: 'celsius',
          windspeed_unit: 'kmh',
          precipitation_unit: 'mm',
          timezone: 'auto',
          forecast_days: 7
        }
      });

      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Weather fetch error:', error.message);
      throw new Error('Failed to fetch weather data');
    }
  }

  // Format weather data
  formatWeatherData(data) {
    const current = data.current_weather;
    const hourly = data.hourly;
    const daily = data.daily;

    return {
      current: {
        temp: Math.round(current.temperature),
        windSpeed: Math.round(current.windspeed),
        weatherCode: current.weathercode,
        condition: this.getWeatherCondition(current.weathercode),
        time: current.time
      },
      hourly: this.formatHourlyData(hourly),
      daily: this.formatDailyData(daily),
      timezone: data.timezone
    };
  }

  // Format hourly data (next 24 hours)
  formatHourlyData(hourly) {
    const now = new Date();
    const currentHour = now.getHours();
    
    return Array(24).fill(0).map((_, i) => {
      const index = currentHour + i;
      if (index >= hourly.time.length) return null;

      return {
        time: new Date(hourly.time[index]).toLocaleTimeString('en-US', { 
          hour: 'numeric',
          hour12: true 
        }),
        temp: Math.round(hourly.temperature_2m[index]),
        rainChance: hourly.precipitation_probability[index] || 0,
        weatherCode: hourly.weathercode[index],
        condition: this.getWeatherCondition(hourly.weathercode[index]),
        windSpeed: Math.round(hourly.windspeed_10m[index]),
        humidity: hourly.relativehumidity_2m[index]
      };
    }).filter(Boolean);
  }

  // Format daily data
  formatDailyData(daily) {
    return daily.time.map((date, i) => {
      const weatherCode = daily.weathercode[i];
      const rainChance = daily.precipitation_probability_max[i] || 0;
      const windSpeed = Math.round(daily.windspeed_10m_max[i]);
      const high = Math.round(daily.temperature_2m_max[i]);
      const low = Math.round(daily.temperature_2m_min[i]);
      const uvIndex = daily.uv_index_max[i] || 0;

      return {
        date: new Date(date),
        high,
        low,
        rainChance,
        weatherCode,
        condition: this.getWeatherCondition(weatherCode),
        windSpeed,
        uv: Math.round(uvIndex),
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
        score: this.calculateDayScore(rainChance, windSpeed, high, weatherCode)
      };
    });
  }

  // Calculate best day score (0-10)
  calculateDayScore(rainChance, windSpeed, temp, weatherCode) {
    let score = 10;

    // Rain penalty
    if (rainChance > 70) score -= 4;
    else if (rainChance > 50) score -= 3;
    else if (rainChance > 30) score -= 2;
    else if (rainChance > 10) score -= 1;

    // Wind penalty
    if (windSpeed > 40) score -= 3;
    else if (windSpeed > 30) score -= 2;
    else if (windSpeed > 20) score -= 1;

    // Temperature penalty (too hot or too cold)
    if (temp > 35 || temp < 5) score -= 2;
    else if (temp > 32 || temp < 8) score -= 1;

    // Severe weather penalty
    if (this.isSevereWeather(weatherCode)) score -= 3;

    return Math.max(0, Math.min(10, score));
  }

  // Get weather condition from code
  getWeatherCondition(code) {
    const conditions = {
      0: 'Clear',
      1: 'Mostly Clear',
      2: 'Partly Cloudy',
      3: 'Cloudy',
      45: 'Foggy',
      48: 'Foggy',
      51: 'Light Drizzle',
      53: 'Drizzle',
      55: 'Heavy Drizzle',
      61: 'Light Rain',
      63: 'Rain',
      65: 'Heavy Rain',
      71: 'Light Snow',
      73: 'Snow',
      75: 'Heavy Snow',
      77: 'Snow Grains',
      80: 'Light Showers',
      81: 'Showers',
      82: 'Heavy Showers',
      85: 'Light Snow Showers',
      86: 'Snow Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Hail',
      99: 'Severe Thunderstorm'
    };

    return conditions[code] || 'Unknown';
  }

  // Check if weather is severe
  isSevereWeather(code) {
    return [65, 75, 82, 86, 95, 96, 99].includes(code);
  }

  // Generate climate summary
  generateClimateSummary(cityName, dailyData) {
    const avgHigh = Math.round(dailyData.reduce((acc, d) => acc + d.high, 0) / dailyData.length);
    const avgLow = Math.round(dailyData.reduce((acc, d) => acc + d.low, 0) / dailyData.length);
    const rainyDays = dailyData.filter(d => d.rainChance > 50).length;
    const maxWind = Math.max(...dailyData.map(d => d.windSpeed));
    const maxUV = Math.max(...dailyData.map(d => d.uv));
    
    let summary = `This week in ${cityName}: `;
    
    // Temperature description
    if (avgHigh > 28) {
      summary += 'hot afternoons';
    } else if (avgHigh > 22) {
      summary += 'warm afternoons';
    } else if (avgHigh > 15) {
      summary += 'mild days';
    } else if (avgHigh > 10) {
      summary += 'cool days';
    } else {
      summary += 'cold days';
    }
    
    // Evening temperature
    if (avgLow < 10) {
      summary += ', chilly evenings';
    } else if (avgLow < 15) {
      summary += ', cool evenings';
    } else if (avgLow < 20) {
      summary += ', mild evenings';
    } else {
      summary += ', warm evenings';
    }
    
    // Rain description
    if (rainyDays >= 4) {
      summary += `, frequent rain expected (${rainyDays} days)`;
    } else if (rainyDays >= 2) {
      summary += `, rain likely midweek (${rainyDays} days)`;
    } else if (rainyDays === 1) {
      summary += ', occasional showers possible';
    } else {
      summary += ', mostly dry conditions';
    }
    
    summary += '. ';
    
    // Packing recommendations
    const packingItems = [];
    
    if (avgHigh > 25) {
      packingItems.push('light clothing');
      packingItems.push('sunscreen');
    } else if (avgHigh < 15) {
      packingItems.push('warm jacket');
      packingItems.push('layers');
    } else {
      packingItems.push('light layers');
    }
    
    if (rainyDays > 0) {
      packingItems.push('umbrella');
      if (rainyDays >= 2) {
        packingItems.push('waterproof shoes');
      }
    }
    
    if (maxUV > 7) {
      packingItems.push('hat and sunglasses');
    }
    
    if (maxWind > 30) {
      packingItems.push('windproof jacket');
    }
    
    summary += 'Pack ' + this.formatList(packingItems) + '.';
    
    return summary;
  }

  // Generate packing list
  generatePackingList(dailyData) {
    const items = [];
    const avgTemp = dailyData.reduce((acc, d) => acc + d.high, 0) / dailyData.length;
    const rainyDays = dailyData.filter(d => d.rainChance > 50).length;
    const maxUV = Math.max(...dailyData.map(d => d.uv));
    const maxWind = Math.max(...dailyData.map(d => d.windSpeed));
    const coldDays = dailyData.filter(d => d.low < 10).length;

    // Clothing based on temperature
    if (avgTemp > 28) {
      items.push({ 
        item: 'Shorts & light clothing', 
        category: 'clothing',
        reason: 'Hot weather expected',
        priority: 'essential'
      });
      items.push({ 
        item: 'Breathable fabrics', 
        category: 'clothing',
        reason: `Average high ${Math.round(avgTemp)}°C`,
        priority: 'recommended'
      });
    } else if (avgTemp > 22) {
      items.push({ 
        item: 'Light layers', 
        category: 'clothing',
        reason: 'Warm days, cooler evenings',
        priority: 'essential'
      });
      items.push({ 
        item: 'T-shirts & light pants', 
        category: 'clothing',
        reason: 'Comfortable for mild weather',
        priority: 'recommended'
      });
    } else if (avgTemp > 15) {
      items.push({ 
        item: 'Medium layers', 
        category: 'clothing',
        reason: 'Variable temperatures',
        priority: 'essential'
      });
      items.push({ 
        item: 'Light jacket', 
        category: 'clothing',
        reason: 'Cool mornings and evenings',
        priority: 'recommended'
      });
    } else {
      items.push({ 
        item: 'Warm jacket', 
        category: 'clothing',
        reason: 'Cold temperatures',
        priority: 'essential'
      });
      items.push({ 
        item: 'Multiple layers', 
        category: 'clothing',
        reason: `Average ${Math.round(avgTemp)}°C`,
        priority: 'essential'
      });
    }

    // Rain gear
    if (rainyDays >= 3) {
      items.push({ 
        item: 'Waterproof jacket', 
        category: 'rain',
        reason: `Rain expected on ${rainyDays} days`,
        priority: 'essential'
      });
      items.push({ 
        item: 'Waterproof shoes', 
        category: 'rain',
        reason: 'Frequent rain',
        priority: 'essential'
      });
      items.push({ 
        item: 'Umbrella', 
        category: 'rain',
        reason: 'Multiple rainy days',
        priority: 'recommended'
      });
    } else if (rainyDays > 0) {
      items.push({ 
        item: 'Umbrella', 
        category: 'rain',
        reason: `${rainyDays} rainy day${rainyDays > 1 ? 's' : ''} expected`,
        priority: 'recommended'
      });
      items.push({ 
        item: 'Light rain jacket', 
        category: 'rain',
        reason: 'Occasional showers',
        priority: 'optional'
      });
    }

    // Sun protection
    if (maxUV > 8) {
      items.push({ 
        item: 'Sunscreen SPF 50+', 
        category: 'sun',
        reason: `Very high UV index (${maxUV})`,
        priority: 'essential'
      });
      items.push({ 
        item: 'Hat & sunglasses', 
        category: 'sun',
        reason: 'Strong sun exposure',
        priority: 'essential'
      });
    } else if (maxUV > 5) {
      items.push({ 
        item: 'Sunscreen SPF 30+', 
        category: 'sun',
        reason: `Moderate UV index (${maxUV})`,
        priority: 'recommended'
      });
      items.push({ 
        item: 'Sunglasses', 
        category: 'sun',
        reason: 'Sun protection',
        priority: 'recommended'
      });
    }

    // Wind protection
    if (maxWind > 35) {
      items.push({ 
        item: 'Windproof jacket', 
        category: 'wind',
        reason: `Strong winds up to ${maxWind} km/h`,
        priority: 'recommended'
      });
    }

    // Cold weather extras
    if (coldDays > 2) {
      items.push({ 
        item: 'Warm scarf & gloves', 
        category: 'clothing',
        reason: `${coldDays} cold nights expected`,
        priority: 'recommended'
      });
    }

    return items;
  }

  // Helper to format list
  formatList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const lastItem = items.pop();
    return `${items.join(', ')}, and ${lastItem}`;
  }

  // Calculate best time window
  getBestTimeWindow(hourlyData) {
    let bestStart = 0;
    let bestScore = -1;
    
    for (let i = 0; i < Math.min(hourlyData.length - 2, 16); i++) {
      const windowScore = 
        (100 - hourlyData[i].rainChance) + 
        (100 - hourlyData[i + 1].rainChance) +
        (100 - hourlyData[i + 2].rainChance) -
        (hourlyData[i].windSpeed / 2);
      
      if (windowScore > bestScore) {
        bestScore = windowScore;
        bestStart = i;
      }
    }
    
    return {
      start: hourlyData[bestStart].time,
      end: hourlyData[Math.min(bestStart + 2, hourlyData.length - 1)].time,
      conditions: 'dry and mild'
    };
  }

  // Get activity scores
  getActivityScores(dayData) {
    const activities = [];
    
    // Beach score
    let beachScore = 5;
    if (dayData.high > 25 && dayData.rainChance < 20) beachScore = 9;
    else if (dayData.high > 22 && dayData.rainChance < 30) beachScore = 7;
    else if (dayData.rainChance > 50) beachScore = 2;
    if (dayData.windSpeed > 25) beachScore -= 2;
    
    activities.push({ 
      name: 'Beach', 
      score: Math.max(0, Math.min(10, beachScore)),
      icon: 'waves'
    });

    // Sightseeing score
    let sightseeingScore = 7;
    if (dayData.rainChance > 60) sightseeingScore = 3;
    else if (dayData.rainChance > 40) sightseeingScore = 5;
    if (dayData.high > 32 || dayData.high < 5) sightseeingScore -= 2;
    if (dayData.windSpeed > 30) sightseeingScore -= 1;
    
    activities.push({ 
      name: 'Sightseeing', 
      score: Math.max(0, Math.min(10, sightseeingScore)),
      icon: 'camera'
    });

    // Hiking score
    let hikingScore = 6;
    if (dayData.rainChance < 20 && dayData.high < 28 && dayData.high > 12) hikingScore = 9;
    else if (dayData.rainChance < 30 && dayData.windSpeed < 20) hikingScore = 7;
    if (dayData.rainChance > 50) hikingScore = 2;
    if (dayData.high > 30 || dayData.high < 8) hikingScore -= 2;
    
    activities.push({ 
      name: 'Hiking', 
      score: Math.max(0, Math.min(10, hikingScore)),
      icon: 'mountain'
    });

    // Café/Indoor score
    let cafeScore = 6;
    if (dayData.rainChance > 50) cafeScore = 9;
    else if (dayData.high < 15 || dayData.high > 30) cafeScore = 8;
    else cafeScore = 6;
    
    activities.push({ 
      name: 'Cafés & Indoor', 
      score: Math.max(0, Math.min(10, cafeScore)),
      icon: 'coffee'
    });

    // Photography score
    let photoScore = 7;
    if (dayData.condition.includes('Clear') || dayData.condition.includes('Partly')) photoScore = 9;
    else if (dayData.rainChance > 60) photoScore = 4;
    if (dayData.windSpeed > 30) photoScore -= 1;
    
    activities.push({ 
      name: 'Photography', 
      score: Math.max(0, Math.min(10, photoScore)),
      icon: 'camera'
    });

    return activities;
  }

  // Compare two cities
  async compareCities(city1Data, city2Data) {
    const comparison = {
      temperature: this.compareMetric(
        city1Data.daily[0].high,
        city2Data.daily[0].high,
        'warmer',
        'cooler'
      ),
      rain: this.compareMetric(
        city2Data.daily[0].rainChance,
        city1Data.daily[0].rainChance,
        'drier',
        'wetter'
      ),
      wind: this.compareMetric(
        city2Data.daily[0].windSpeed,
        city1Data.daily[0].windSpeed,
        'calmer',
        'windier'
      ),
      overall: '',
      recommendation: ''
    };

    // Overall summary
    const city1Score = city1Data.daily.reduce((acc, d) => acc + d.score, 0) / city1Data.daily.length;
    const city2Score = city2Data.daily.reduce((acc, d) => acc + d.score, 0) / city2Data.daily.length;

    if (city1Score > city2Score + 1) {
      comparison.recommendation = 'city1';
      comparison.overall = 'significantly better weather conditions';
    } else if (city2Score > city1Score + 1) {
      comparison.recommendation = 'city2';
      comparison.overall = 'significantly better weather conditions';
    } else {
      comparison.recommendation = 'similar';
      comparison.overall = 'similar weather conditions';
    }

    return comparison;
  }

  compareMetric(val1, val2, betterLabel, worseLabel) {
    const diff = Math.abs(val1 - val2);
    if (diff < 3) return 'similar';
    return val1 > val2 ? betterLabel : worseLabel;
  }
}

module.exports = new WeatherService();