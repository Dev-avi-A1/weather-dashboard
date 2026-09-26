const STORAGE_KEY = 'weather-dashboard-last-city';
const SAVED_CITIES_KEY = 'weather-dashboard-saved-cities';

const defaultCity = 'Antalya';
const weatherLookup = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  56: { label: 'Light freezing drizzle', icon: '🌧️' },
  57: { label: 'Dense freezing drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm with hail', icon: '⛈️' }
};

const state = {
  currentCity: null,
  savedCities: loadSavedCities()
};

const els = {
  locationName: document.getElementById('locationName'),
  weatherIcon: document.getElementById('weatherIcon'),
  currentTemp: document.getElementById('currentTemp'),
  currentSummary: document.getElementById('currentSummary'),
  feelsLike: document.getElementById('feelsLike'),
  humidity: document.getElementById('humidity'),
  windSpeed: document.getElementById('windSpeed'),
  precipitation: document.getElementById('precipitation'),
  sunrise: document.getElementById('sunrise'),
  hourlyForecast: document.getElementById('hourlyForecast'),
  dailyForecast: document.getElementById('dailyForecast'),
  searchForm: document.getElementById('searchForm'),
  cityInput: document.getElementById('cityInput'),
  locationBtn: document.getElementById('locationBtn'),
  savedCities: document.getElementById('savedCities'),
  toast: document.getElementById('toast')
};

function loadSavedCities() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY) || '[]');
    return Array.isArray(saved) ? saved.slice(0, 6) : [];
  } catch (error) {
    return [];
  }
}

function persistSavedCities() {
  localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(state.savedCities));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 2200);
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric' });
}

function formatDay(value) {
  return new Date(value).toLocaleDateString([], { weekday: 'short' });
}

function getWeatherMeta(code) {
  return weatherLookup[code] || { label: 'Weather', icon: '🌤️' };
}

function saveLastCity(city) {
  if (!city) return;
  localStorage.setItem(STORAGE_KEY, city);
}

function getLastCity() {
  return localStorage.getItem(STORAGE_KEY) || defaultCity;
}

function addSavedCity(city) {
  const normalized = city.trim();
  if (!normalized) return;

  state.savedCities = [normalized, ...state.savedCities.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
  persistSavedCities();
  renderSavedCities();
}

function renderSavedCities() {
  els.savedCities.innerHTML = '';

  if (!state.savedCities.length) {
    return;
  }

  state.savedCities.forEach((city) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'saved-city-btn';
    if (state.currentCity && city.toLowerCase() === state.currentCity.toLowerCase()) {
      button.classList.add('is-active');
    }
    button.textContent = city;
    button.addEventListener('click', () => fetchWeather(city));
    els.savedCities.appendChild(button);
  });
}

async function geocodeCity(city) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );

  if (!response.ok) {
    throw new Error('Unable to find the city.');
  }

  const data = await response.json();

  if (!data.results || !data.results.length) {
    throw new Error('No matching city found. Try another location.');
  }

  return data.results[0];
}

async function fetchWeather(city) {
  try {
    const location = await geocodeCity(city);
    const { latitude, longitude, name, country, admin1 } = location;

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`
    );

    if (!weatherResponse.ok) {
      throw new Error('Weather data could not be loaded.');
    }

    const weather = await weatherResponse.json();
    const locationLabel = `${name}${admin1 ? `, ${admin1}` : ''}, ${country}`;
    const current = weather.current;
    const summaryMeta = getWeatherMeta(current.weather_code);

    state.currentCity = name;
    saveLastCity(name);
    addSavedCity(name);
    renderSavedCities();

    els.locationName.textContent = locationLabel;
    els.weatherIcon.textContent = summaryMeta.icon;
    els.currentTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
    els.currentSummary.textContent = summaryMeta.label;
    els.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
    els.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    els.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    els.precipitation.textContent = `${(current.precipitation || 0).toFixed(1)} mm`;
    els.sunrise.textContent = formatTime(weather.daily.sunrise[0]);

    renderHourlyForecast(weather.hourly);
    renderDailyForecast(weather.daily);
    els.cityInput.value = '';
  } catch (error) {
    showToast(error.message || 'Something went wrong while fetching weather.');
  }
}

function renderHourlyForecast(hourly) {
  const now = new Date();
  const hourlyTiles = [];

  for (let i = 0; i < 6; i += 1) {
    const time = hourly.time[i];
    const temp = Math.round(hourly.temperature_2m[i]);
    const code = hourly.weather_code[i];
    const meta = getWeatherMeta(code);
    hourlyTiles.push(`
      <div class="forecast-item hour-card">
        <span class="hour">${formatTime(time)}</span>
        <span aria-label="${meta.label}">${meta.icon}</span>
        <span class="hour-temp">${temp}°</span>
      </div>
    `);
  }

  els.hourlyForecast.innerHTML = hourlyTiles.join('');
}

function renderDailyForecast(daily) {
  const rows = daily.time.map((date, index) => {
    const code = daily.weather_code[index];
    const meta = getWeatherMeta(code);
    const minTemp = Math.round(daily.temperature_2m_min[index]);
    const maxTemp = Math.round(daily.temperature_2m_max[index]);

    return `
      <div class="forecast-item daily-row">
        <span class="day">${formatDay(date)}</span>
        <div class="weather-mini">
          <span aria-label="${meta.label}">${meta.icon}</span>
          <span>${meta.label}</span>
        </div>
        <span class="range">${maxTemp}° / ${minTemp}°</span>
      </div>
    `;
  }).join('');

  els.dailyForecast.innerHTML = rows;
}

els.searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const city = els.cityInput.value.trim();

  if (!city) {
    showToast('Please enter a city name.');
    return;
  }

  await fetchWeather(city);
});

els.locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported in this browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
      );

      if (!response.ok) {
        throw new Error('Could not resolve your location.');
      }

      const data = await response.json();
      const result = data.results && data.results[0];

      if (!result) {
        throw new Error('Location not found.');
      }

      await fetchWeather(result.name);
    } catch (error) {
      showToast(error.message || 'Unable to determine your location.');
    }
  }, () => {
    showToast('Location access was denied.');
  });
});

renderSavedCities();
fetchWeather(getLastCity());
