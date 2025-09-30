document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById('zipInput'); // still named zipInput for now
  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.id = 'citySuggestions';
  suggestionsDiv.style.position = 'absolute';
  suggestionsDiv.style.background = 'rgba(255,255,255,0.9)';
  suggestionsDiv.style.color = '#222';
  suggestionsDiv.style.borderRadius = '8px';
  suggestionsDiv.style.marginTop = '4px';
  suggestionsDiv.style.width = '100%';
  suggestionsDiv.style.maxHeight = '200px';
  suggestionsDiv.style.overflowY = 'auto';
  suggestionsDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  suggestionsDiv.style.zIndex = '999';
  suggestionsDiv.style.display = 'none';
  cityInput.parentNode.appendChild(suggestionsDiv);

  const fahrenheitBtn = document.getElementById('fahrenheit');
  const celsiusBtn = document.getElementById('celsius');

  let currentWeatherData = null;
  let currentUnit = 'imperial'; // Default °F
  let originalTempF = null;
  let originalTempC = null;
  let originalWindMph = null;
  let originalWindKph = null; 
  let currentAQIValue = null; 
  let currentAQILabel = null;

  const apiKey = "93be6e701b83661422a7b675b8ab01cd";

  // --- Backgrounds map ---
  const backgrounds = {
    homepage: "images/homepage.png",
    clear_day: "images/clear-day.png",
    clear_night: "images/clear-night.png",
    clouds_day: "images/clouds-day.png",
    clouds_night: "images/clouds-night.png",
    rain_day: "images/rain-day.png",
    rain_night: "images/rain-night.png",
    snow_day: "images/snow-day.png",
    snow_night: "images/snow-night.png",
    thunderstorm_day: "images/thunderstorm-day.png",
    thunderstorm_night: "images/thunderstorm-night.png",
    mist_day: "images/mist-day.png",
    mist_night: "images/mist-night.png",
    default: "images/default.png"
  };

  // --- Set initial homepage background ---
  document.body.style.transition = "background 0.5s ease";
  document.body.style.background = `url('${backgrounds.homepage}') no-repeat center center fixed`;
  document.body.style.backgroundSize = "cover";

  function setBackground(main, isNight) {
    let key = "default";
    if (main.includes("clear")) key = isNight ? "clear_night" : "clear_day";
    else if (main.includes("cloud")) key = isNight ? "clouds_night" : "clouds_day";
    else if (main.includes("rain")) key = isNight ? "rain_night" : "rain_day";
    else if (main.includes("snow")) key = isNight ? "snow_night" : "snow_day";
    else if (main.includes("thunderstorm")) key = isNight ? "thunderstorm_night" : "thunderstorm_day";
    else if (main.includes("mist")) key = isNight ? "mist_night" : "mist_day";

    const bgPath = backgrounds[key] || backgrounds.default;
    console.log("Setting background:", bgPath); // debug
    document.body.style.background = `url('${bgPath}') no-repeat center center fixed`;
    document.body.style.backgroundSize = "cover";
  }

  // --- Event listeners ---
  cityInput.addEventListener('input', fetchCitySuggestions);

  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = cityInput.value.trim();
      if (q) fetchWeatherByCity(q);
    }
  });

  fahrenheitBtn.addEventListener('click', () => switchUnits('imperial'));
  celsiusBtn.addEventListener('click', () => switchUnits('metric'));

  // --- Autocomplete city suggestions ---
  let timeout = null;
  function fetchCitySuggestions() {
    const query = cityInput.value.trim();
    if (timeout) clearTimeout(timeout);
    if (!query) {
      suggestionsDiv.style.display = 'none';
      return;
    }
    timeout = setTimeout(() => {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          suggestionsDiv.innerHTML = '';
          if (!data || data.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
          }
          data.forEach(loc => {
            const item = document.createElement('div');
            item.textContent = `${loc.name}${loc.state ? ', ' + loc.state : ''}, ${loc.country}`;
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
              cityInput.value = `${loc.name}${loc.state ? ', ' + loc.state : ''}, ${loc.country}`;
              suggestionsDiv.style.display = 'none';
              fetchWeatherByCoords(loc.lat, loc.lon, loc.name);
            });
            item.addEventListener('mouseenter', () => item.style.background = '#ddd');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
            suggestionsDiv.appendChild(item);
          });
          suggestionsDiv.style.display = 'block';
        })
        .catch(err => console.error('Error fetching city suggestions:', err));
    }, 300);
  }

  // --- Fetch weather by coordinates ---
  function fetchWeatherByCoords(lat, lon, displayName = '') {
    document.getElementById('weatherResult').innerHTML = `<p>Loading weather data...</p>`;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        currentWeatherData = data;
        originalTempF = data.main.temp;
        originalTempC = ((data.main.temp - 32) * 5) / 9;
        originalWindMph = data.wind.speed;
        originalWindKph = data.wind.speed * 1.60934;
        displayWeather(data, displayName || data.name);
        getAQI(data.coord.lat, data.coord.lon);
      })
      .catch(err => {
        document.getElementById('weatherResult').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
      });
  }

  // --- Fetch weather by city name ---
  function fetchWeatherByCity(cityName) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${apiKey}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          alert('City not found!');
          return;
        }
        const loc = data[0];
        fetchWeatherByCoords(
          loc.lat, 
          loc.lon, 
          `${loc.name}${loc.state ? ', ' + loc.state : ''}, ${loc.country}`
        );
      })
      .catch(err => console.error('Error fetching city:', err));
  }

  // --- AQI functions (same as before) ---
  function calcAQI(C, bp) {
    for (const b of bp) {
      if (C >= b.Clow && C <= b.Chigh) {
        return Math.round(((b.Ihigh - b.Ilow) / (b.Chigh - b.Clow)) * (C - b.Clow) + b.Ilow);
      }
    }
    return null;
  }
  function aqiFromPM25(pm25) {
    const bp = [
      {Clow: 0.0,   Chigh: 12.0,  Ilow: 0,   Ihigh: 50},
      {Clow: 12.1,  Chigh: 35.4,  Ilow: 51,  Ihigh: 100},
      {Clow: 35.5,  Chigh: 55.4,  Ilow: 101, Ihigh: 150},
      {Clow: 55.5,  Chigh: 150.4, Ilow: 151, Ihigh: 200},
      {Clow: 150.5, Chigh: 250.4, Ilow: 201, Ihigh: 300},
      {Clow: 250.5, Chigh: 350.4, Ilow: 301, Ihigh: 400},
      {Clow: 350.5, Chigh: 500.4, Ilow: 401, Ihigh: 500},
    ];
    return calcAQI(pm25, bp);
  }
  function aqiFromPM10(pm10) {
    const bp = [
      {Clow: 0,   Chigh: 54,  Ilow: 0,   Ihigh: 50},
      {Clow: 55,  Chigh: 154, Ilow: 51,  Ihigh: 100},
      {Clow: 155, Chigh: 254, Ilow: 101, Ihigh: 150},
      {Clow: 255, Chigh: 354, Ilow: 151, Ihigh: 200},
      {Clow: 355, Chigh: 424, Ilow: 201, Ihigh: 300},
      {Clow: 425, Chigh: 504, Ilow: 301, Ihigh: 400},
      {Clow: 505, Chigh: 604, Ilow: 401, Ihigh: 500},
    ];
    return calcAQI(pm10, bp);
  }
  function aqiLabel(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy (Sensitive)";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }
  function aqiColor(aqi) {
    if (aqi <= 50) return "#55a84f";
    if (aqi <= 100) return "#a3c853";
    if (aqi <= 150) return "#f29c33";
    if (aqi <= 200) return "#e93f33";
    if (aqi <= 300) return "#8f3f97";
    return "#7e0023";
  }
  function getAQI(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const comp = (data.list && data.list[0] && data.list[0].components) || {};
        const cat15 = data.list && data.list[0] && data.list[0].main && data.list[0].main.aqi;
        const aqiPM25 = typeof comp.pm2_5 === 'number' ? aqiFromPM25(comp.pm2_5) : null;
        const aqiPM10 = typeof comp.pm10 === 'number' ? aqiFromPM10(comp.pm10) : null;
        let numericAQI = Math.max(aqiPM25 ?? -1, aqiPM10 ?? -1);
        if (numericAQI < 0) {
          const fallbackMap = {1: 25, 2: 75, 3: 125, 4: 175, 5: 250};
          numericAQI = fallbackMap[cat15] ?? 50;
        }
        currentAQIValue = Math.max(0, Math.min(500, Math.round(numericAQI)));
        currentAQILabel = aqiLabel(currentAQIValue);
        displayWeather(currentWeatherData);
      })
      .catch(err => {
        console.error("AQI Error:", err.message);
        displayWeather(currentWeatherData);
      });
  }

  // --- Display weather ---
  function displayWeather(data, displayName = '') {
    const weatherDiv = document.getElementById('weatherResult');
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    const unitSymbol = currentUnit === 'imperial' ? '°F' : '°C';

    const now = new Date();
    const hour = now.getHours();
    const isNight = hour >= 19 || hour < 6;
    const main = data.weather[0].main.toLowerCase();

    // Set background using centralized function
    setBackground(main, isNight);

    let html = `
      <h2>${displayName || data.name}</h2>
      <div class="weather-icon-text" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
        <img src="${iconUrl}" alt="${data.weather[0].description}" style="width:80px;height:80px;">
        <p class="weather-description" style="text-transform: capitalize; margin:0;">${data.weather[0].description}</p>
      </div>
      <p class="weather-detail"><strong>Temperature:</strong> ${Math.round(currentUnit==='imperial'?originalTempF:originalTempC)}${unitSymbol}</p>
      <p class="weather-detail"><strong>Humidity:</strong> ${data.main.humidity}%</p>
      <p class="weather-detail"><strong>Wind Speed:</strong> ${Math.round(currentUnit==='imperial'?originalWindMph:originalWindKph)} ${currentUnit==='imperial'?'mph':'km/h'}</p>
    `;
    if (currentAQIValue !== null) {
      const color = aqiColor(currentAQIValue);
      const label = currentAQILabel;
      const circumference = 2 * Math.PI * 60;
      const dash = (Math.min(currentAQIValue, 500) / 500) * circumference;
      html += `
        <div class="aqi-container">
          <div class="aqi-circle">
            <svg>
              <circle class="bg" cx="70" cy="70" r="60"/>
              <circle class="progress" cx="70" cy="70" r="60" stroke="${color}" stroke-dasharray="${dash}, ${circumference}"/>
            </svg>
            <div class="aqi-number" style="color:${color}">${currentAQIValue}</div>
          </div>
          <div class="aqi-label" style="color:${color}">${label}</div>
        </div>
      `;
    }
    weatherDiv.innerHTML = html;
  }

  // --- Units toggle ---
  function switchUnits(unit) {
    if (currentUnit === unit) return;
    currentUnit = unit;
    updateToggleUI();
    if (currentWeatherData) displayWeather(currentWeatherData);
  }
  function updateToggleUI() {
    if (currentUnit === 'imperial') {
      fahrenheitBtn.classList.add('active');
      celsiusBtn.classList.remove('active');
    } else {
      celsiusBtn.classList.add('active');
      fahrenheitBtn.classList.remove('active');
    }
  }
  updateToggleUI();
});
