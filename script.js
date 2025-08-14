document.addEventListener("DOMContentLoaded", () => {
  const getWeatherBtn = document.getElementById('getWeatherBtn');
  const fahrenheitBtn = document.getElementById('fahrenheit');
  const celsiusBtn = document.getElementById('celsius');

  let currentWeatherData = null;
  let currentUnit = 'imperial'; // Default: °F

  getWeatherBtn.addEventListener('click', getWeather);
  fahrenheitBtn.addEventListener('click', () => switchUnits('imperial'));
  celsiusBtn.addEventListener('click', () => switchUnits('metric'));

  function getWeather() {
    const zip = document.getElementById('zipInput').value.trim();
    if (!zip) {
      alert("Please enter a ZIP code");
      return;
    }

    document.getElementById('weatherResult').innerHTML = `<p>Loading weather data...</p>`;
    document.getElementById('aqiSection').style.display = 'none';

    const apiKey = "93be6e701b83661422a7b675b8ab01cd";
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zip},US&appid=${apiKey}&units=${currentUnit}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch weather data");
        return res.json();
      })
      .then(data => {
        currentWeatherData = data;
        displayWeather(data);
        getAQI(data.coord.lat, data.coord.lon);
      })
      .catch(err => {
        document.getElementById('weatherResult').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        document.getElementById('aqiSection').style.display = 'none';
        clearWeatherClasses();
      });
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
        const aqi = data.list[0].main.aqi;
        displayAQI(aqi);
      })
      .catch(err => {
        console.error("AQI Error:", err.message);
        document.getElementById('aqiSection').style.display = 'none';
      });
  }

  function displayAQI(aqi) {
    const aqiSection = document.getElementById("aqiSection");
    const aqiBar = document.getElementById("aqiBar");
    const aqiText = document.getElementById("aqiText");

    const levels = {
      1: { text: "Good", color: "green", width: "20%" },
      2: { text: "Fair", color: "yellow", width: "40%" },
      3: { text: "Moderate", color: "orange", width: "60%" },
      4: { text: "Poor", color: "red", width: "80%" },
      5: { text: "Very Poor", color: "purple", width: "100%" }
    };

    const level = levels[aqi] || { text: "Unknown", color: "gray", width: "0%" };

    aqiBar.style.width = level.width;
    aqiBar.style.backgroundColor = level.color;
    aqiText.textContent = `${level.text} (AQI: ${aqi})`;
    aqiSection.style.display = "block";
  }

  function clearWeatherClasses() {
    const classes = [
      'clear-day', 'clear-night',
      'clouds-day', 'clouds-night',
      'rain-day', 'rain-night',
      'snow-day', 'snow-night',
      'thunderstorm-day', 'thunderstorm-night',
      'mist-day', 'mist-night',
      'fog-day', 'fog-night',
      'haze-day', 'haze-night'
    ];
    classes.forEach(cls => document.body.classList.remove(cls));
  }

  function displayWeather(data) {
    console.log('Weather condition (raw):', data.weather[0].main);

    clearWeatherClasses();

    let weatherMainRaw = data.weather[0].main.toLowerCase();
    let weatherMain = '';
    if (weatherMainRaw === 'clear') {
      weatherMain = 'clear';
    } else if (weatherMainRaw.includes('cloud')) {
      weatherMain = 'clouds';
    } else if (weatherMainRaw.includes('rain')) {
      weatherMain = 'rain';
    } else if (weatherMainRaw.includes('snow')) {
      weatherMain = 'snow';
    } else if (weatherMainRaw.includes('thunderstorm')) {
      weatherMain = 'thunderstorm';
    } else if (weatherMainRaw.includes('mist')) {
      weatherMain = 'mist';
    } else if (weatherMainRaw.includes('fog')) {
      weatherMain = 'fog';
    } else if (weatherMainRaw.includes('haze')) {
      weatherMain = 'haze';
    } else {
      weatherMain = 'clear';
    }

    // ✅ Determine day/night based on sunrise/sunset times
    const sunrise = data.sys.sunrise * 1000;
    const sunset = data.sys.sunset * 1000;
    const now = Date.now();
    const timeOfDay = (now >= sunrise && now < sunset) ? 'day' : 'night';

    console.log("Sunrise:", new Date(sunrise).toLocaleTimeString());
    console.log("Sunset:", new Date(sunset).toLocaleTimeString());
    console.log("Now:", new Date(now).toLocaleTimeString());
    console.log("Time of day:", timeOfDay);

    const className = `${weatherMain}-${timeOfDay}`;
    console.log('Normalized weather:', weatherMain);
    console.log('Adding body class:', className);

    const validClasses = [
      'clear-day', 'clear-night',
      'clouds-day', 'clouds-night',
      'rain-day', 'rain-night',
      'snow-day', 'snow-night',
      'thunderstorm-day', 'thunderstorm-night',
      'mist-day', 'mist-night',
      'fog-day', 'fog-night',
      'haze-day', 'haze-night'
    ];

    if (validClasses.includes(className)) {
      document.body.classList.add(className);
    } else {
      console.warn('No matching body class for:', className);
    }

    const weatherDiv = document.getElementById('weatherResult');
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    const unitSymbol = currentUnit === 'imperial' ? '°F' : '°C';

    let windSpeed = data.wind.speed;
    let windSpeedUnit;
    if (currentUnit === 'imperial') {
      windSpeedUnit = 'mph';
    } else {
      windSpeed = windSpeed * 3.6; // m/s → kph
      windSpeedUnit = 'kph';
    }

    weatherDiv.innerHTML = `
      <h2>${data.name}</h2>
      <img src="${iconUrl}" alt="${data.weather[0].description}" style="width:80px;height:80px;">
      <p style="text-transform: capitalize;">${data.weather[0].description}</p>
      <p><strong>Temperature:</strong> ${Math.round(data.main.temp)}${unitSymbol}</p>
      <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
      <p><strong>Wind Speed:</strong> ${Math.round(windSpeed)} ${windSpeedUnit}</p>
    `;
  }

  function switchUnits(unit) {
    if (currentUnit === unit) return;
    currentUnit = unit;
    updateToggleUI();
    getWeather();
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
