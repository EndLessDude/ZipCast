document.addEventListener("DOMContentLoaded", () => {
  const getWeatherBtn = document.getElementById('getWeatherBtn');
  const fahrenheitBtn = document.getElementById('fahrenheit');
  const celsiusBtn = document.getElementById('celsius');

  let currentWeatherData = null;
  let currentUnit = 'imperial'; // Default °F
  let originalTempF = null;
  let originalTempC = null;
  let originalWindMph = null;
  let originalWindKph = null; // mph → km/h
  let currentAQIValue = null;  // numeric 0–500
  let currentAQILabel = null;  // "Good", "Moderate", etc.

  getWeatherBtn.addEventListener('click', getWeather);
  fahrenheitBtn.addEventListener('click', () => switchUnits('imperial'));
  celsiusBtn.addEventListener('click', () => switchUnits('metric'));

  function getWeather() {
    const zip = document.getElementById('zipInput').value.trim();
    if (!zip) {
      alert("Please enter a ZIP code");
      return;
    }

    const apiKey = "93be6e701b83661422a7b675b8ab01cd";
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zip},US&appid=${apiKey}&units=imperial`;

    document.getElementById('weatherResult').innerHTML = `<p>Loading weather data...</p>`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch weather data");
        return res.json();
      })
      .then(data => {
        currentWeatherData = data;

        // Temps
        originalTempF = data.main.temp;
        originalTempC = ((data.main.temp - 32) * 5) / 9;

        // Wind
        originalWindMph = data.wind.speed;
        originalWindKph = data.wind.speed * 1.60934; // mph → km/h

        displayWeather(data);
        getAQI(data.coord.lat, data.coord.lon);
      })
      .catch(err => {
        document.getElementById('weatherResult').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
      });
  }

  // ---- AQI helpers (US EPA scale) ----
  function calcAQI(C, bp) {
    // bp = [{Clow, Chigh, Ilow, Ihigh}, ...] increasing
    for (const b of bp) {
      if (C >= b.Clow && C <= b.Chigh) {
        return Math.round(((b.Ihigh - b.Ilow) / (b.Chigh - b.Clow)) * (C - b.Clow) + b.Ilow);
      }
    }
    return null;
  }

  function aqiFromPM25(pm25) {
    // μg/m³ breakpoints (24h)
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
    // μg/m³ breakpoints (24h)
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
    if (aqi <= 50) return "#55a84f";          // green
    if (aqi <= 100) return "#a3c853";         // yellow-green
    if (aqi <= 150) return "#f29c33";         // orange
    if (aqi <= 200) return "#e93f33";         // red
    if (aqi <= 300) return "#8f3f97";         // purple
    return "#7e0023";                          // maroon
  }

  function getAQI(lat, lon) {
    const apiKey = "93be6e701b83661422a7b675b8ab01cd";
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch AQI data");
        return res.json();
      })
      .then(data => {
        const comp = (data.list && data.list[0] && data.list[0].components) || {};
        const cat15 = data.list && data.list[0] && data.list[0].main && data.list[0].main.aqi; // 1–5 (fallback)

        const aqiPM25 = typeof comp.pm2_5 === 'number' ? aqiFromPM25(comp.pm2_5) : null;
        const aqiPM10 = typeof comp.pm10 === 'number' ? aqiFromPM10(comp.pm10) : null;

        let numericAQI = Math.max(aqiPM25 ?? -1, aqiPM10 ?? -1);

        // Fallback: map 1–5 category to midpoints of US bands if we couldn't compute
        if (numericAQI < 0) {
          const fallbackMap = {1: 25, 2: 75, 3: 125, 4: 175, 5: 250};
          numericAQI = fallbackMap[cat15] ?? 50;
        }

        numericAQI = Math.max(0, Math.min(500, Math.round(numericAQI)));

        currentAQIValue = numericAQI;
        currentAQILabel = aqiLabel(numericAQI);

        displayWeather(currentWeatherData); // redraw with AQI
      })
      .catch(err => {
        console.error("AQI Error:", err.message);
        // Keep prior AQI if any; otherwise nothing renders for AQI
        displayWeather(currentWeatherData);
      });
  }

  function displayWeather(data) {
    const weatherDiv = document.getElementById('weatherResult');
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    const unitSymbol = currentUnit === 'imperial' ? '°F' : '°C';

    let html = `
      <h2>${data.name}</h2>
      <img src="${iconUrl}" alt="${data.weather[0].description}" style="width:80px;height:80px;">
      <p style="text-transform: capitalize;">${data.weather[0].description}</p>
      <p><strong>Temperature:</strong> ${Math.round(currentUnit==='imperial'?originalTempF:originalTempC)}${unitSymbol}</p>
      <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
      <p><strong>Wind Speed:</strong> ${Math.round(currentUnit==='imperial'?originalWindMph:originalWindKph)} ${currentUnit==='imperial'?'mph':'km/h'}</p>
    `;

    if (currentAQIValue !== null) {
      const color = aqiColor(currentAQIValue);
      const label = currentAQILabel;
      const circumference = 2 * Math.PI * 60; // r=60 → ~377
      const dash = (Math.min(currentAQIValue, 500) / 500) * circumference;

      html += `
        <div style="margin-top:20px;">
          <h3>Air Quality Index</h3>
          <svg width="140" height="140">
            <circle cx="70" cy="70" r="60" stroke="#eee" stroke-width="12" fill="none"/>
            <circle cx="70" cy="70" r="60" stroke="${color}" stroke-width="12" fill="none"
              stroke-dasharray="${dash}, ${circumference}" stroke-linecap="round" transform="rotate(-90 70 70)"/>
            <text x="70" y="70" text-anchor="middle" dominant-baseline="central" font-size="24" fill="#333" font-weight="700">${currentAQIValue}</text>
          </svg>
          <div style="margin-top:6px; font-weight:600; color:${color};">${label}</div>
        </div>
      `;
    }

    weatherDiv.innerHTML = html;
  }

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
// All your previous code here stays (getWeather, switchUnits, AQI calculations)

function displayWeather(data) {
  const weatherDiv = document.getElementById('weatherResult');
  const iconCode = data.weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  const unitSymbol = currentUnit === 'imperial' ? '°F' : '°C';

  let html = `
    <img src="${iconUrl}" alt="${data.weather[0].description}">
    <h2>${data.name}</h2>
    <p style="text-transform: capitalize; font-style: italic;">${data.weather[0].description}</p>
    <p class="weather-detail"><strong>Temperature:</strong> ${Math.round(currentUnit==='imperial'?originalTempF:originalTempC)}${unitSymbol}</p>
    <p class="weather-detail"><strong>Humidity:</strong> ${data.main.humidity}%</p>
    <p class="weather-detail"><strong>Wind Speed:</strong> ${Math.round(currentUnit==='imperial'?originalWindMph:originalWindKph)} ${currentUnit==='imperial'?'mph':'km/h'}</p>
  `;

  if (currentAQIValue !== null) {
    const color = aqiColor(currentAQIValue);
    const label = currentAQILabel;
    const circumference = 2 * Math.PI * 60; // r=60
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
