const STORAGE_KEY = 'weather-inspect-last-city';
const SAVED_CITIES_KEY = 'weather-inspect-recent-cities';
const defaultCity = 'Antalya';

const weatherLookup = {
  0: ['Clear sky', 'sun'], 1: ['Mostly clear', 'sun'], 2: ['Partly cloudy', 'cloud'],
  3: ['Overcast', 'cloud'], 45: ['Foggy', 'fog'], 48: ['Rime fog', 'fog'],
  51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'],
  56: ['Freezing drizzle', 'rain'], 57: ['Freezing drizzle', 'rain'], 61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'], 66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'], 71: ['Light snow', 'snow'], 73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'], 80: ['Rain showers', 'rain'],
  81: ['Rain showers', 'rain'], 82: ['Heavy showers', 'storm'], 85: ['Snow showers', 'snow'],
  86: ['Snow showers', 'snow'], 95: ['Thunderstorm', 'storm'], 96: ['Storm with hail', 'storm'],
  99: ['Severe storm', 'storm']
};

const iconPaths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud: '<path d="M6 18h11.5a4.5 4.5 0 0 0 .4-9A6.2 6.2 0 0 0 6.3 8 5 5 0 0 0 6 18Z"/>',
  fog: '<path d="M4 8h16M2 12h16M6 16h16"/>',
  rain: '<path d="M6 14h11.5a4.5 4.5 0 0 0 .4-9A6.2 6.2 0 0 0 6.3 4 5 5 0 0 0 6 14ZM8 17l-1 3M13 17l-1 3M18 17l-1 3"/>',
  snow: '<path d="M6 13h11.5a4.5 4.5 0 0 0 .4-9A6.2 6.2 0 0 0 6.3 3 5 5 0 0 0 6 13ZM7 17h.01M12 20h.01M17 17h.01"/>',
  storm: '<path d="M6 13h11.5a4.5 4.5 0 0 0 .4-9A6.2 6.2 0 0 0 6.3 3 5 5 0 0 0 6 13ZM13 14l-3 5h3l-1 3 5-6h-3l1-2"/>'
};

const state = { currentCity: null, savedCities: loadSavedCities(), requestController: null };
const byId = (id) => document.getElementById(id);
const els = {
  locationName: byId('locationName'), weatherIcon: byId('weatherIcon'), currentTemp: byId('currentTemp'),
  currentSummary: byId('currentSummary'), feelsLike: byId('feelsLike'), humidity: byId('humidity'),
  windSpeed: byId('windSpeed'), precipitation: byId('precipitation'), sunrise: byId('sunrise'),
  updatedAt: byId('updatedAt'), hourlyForecast: byId('hourlyForecast'), dailyForecast: byId('dailyForecast'),
  searchForm: byId('searchForm'), cityInput: byId('cityInput'), locationBtn: byId('locationBtn'),
  savedCities: byId('savedCities'), toast: byId('toast'), dashboard: byId('weatherDashboard'),
  statusMessage: byId('statusMessage')
};

function loadSavedCities() {
  try { const value = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY) || '[]'); return Array.isArray(value) ? value.slice(0, 5) : []; }
  catch { return []; }
}

function weatherMeta(code) { const [label, icon] = weatherLookup[code] || ['Mixed conditions', 'cloud']; return { label, icon }; }
function weatherIcon(type) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[type] || iconPaths.cloud}</svg>`; }
function formatHour(value) {
  const hour = Number(value.slice(11, 13));
  return new Intl.DateTimeFormat([], { hour: 'numeric' }).format(new Date(2020, 0, 1, hour));
}
function formatDay(value, index) { return index === 0 ? 'Today' : new Date(`${value}T12:00:00`).toLocaleDateString([], { weekday: 'short' }); }

function setLoading(loading) {
  els.dashboard.setAttribute('aria-busy', String(loading));
  els.searchForm.querySelector('button').disabled = loading;
  els.locationBtn.disabled = loading;
}
function showToast(message) {
  els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}
function showError(message) { els.statusMessage.textContent = message; els.statusMessage.hidden = false; showToast(message); }
function clearError() { els.statusMessage.hidden = true; els.statusMessage.textContent = ''; }

function rememberCity(city) {
  const name = city.trim(); if (!name) return;
  state.savedCities = [name, ...state.savedCities.filter((item) => item.toLowerCase() !== name.toLowerCase())].slice(0, 5);
  localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(state.savedCities));
  localStorage.setItem(STORAGE_KEY, name); renderSavedCities();
}
function renderSavedCities() {
  els.savedCities.replaceChildren();
  state.savedCities.forEach((city) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'saved-city-btn'; button.textContent = city;
    if (state.currentCity?.toLowerCase() === city.toLowerCase()) button.classList.add('is-active');
    button.addEventListener('click', () => fetchCity(city)); els.savedCities.append(button);
  });
}

async function geocodeCity(city, signal) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, { signal });
  if (!response.ok) throw new Error('The place search is unavailable right now.');
  const data = await response.json();
  if (!data.results?.length) throw new Error(`No match found for “${city}”. Try a nearby city.`);
  return data.results[0];
}

async function fetchForecast(latitude, longitude, label, cityToRemember = null) {
  state.requestController?.abort(); state.requestController = new AbortController();
  const { signal } = state.requestController; setLoading(true); clearError();
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude, longitude, current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m', hourly: 'temperature_2m,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise', timezone: 'auto', forecast_days: '7' });
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('The forecast could not be loaded right now.');
    const weather = await response.json(); renderWeather(weather, label);
    state.currentCity = cityToRemember; if (cityToRemember) rememberCity(cityToRemember); else renderSavedCities();
    els.cityInput.value = '';
  } catch (error) {
    if (error.name !== 'AbortError') showError(error.message || 'Something interrupted the forecast. Please try again.');
  } finally { if (!signal.aborted) setLoading(false); }
}

async function fetchCity(city) {
  setLoading(true); clearError();
  try {
    const location = await geocodeCity(city);
    const region = location.admin1 && location.admin1 !== location.name ? `, ${location.admin1}` : '';
    await fetchForecast(location.latitude, location.longitude, `${location.name}${region}, ${location.country}`, location.name);
  } catch (error) { showError(error.message || 'That place could not be loaded.'); setLoading(false); }
}

function renderWeather(weather, label) {
  const current = weather.current; const meta = weatherMeta(current.weather_code);
  els.locationName.textContent = label; els.weatherIcon.innerHTML = weatherIcon(meta.icon);
  els.currentTemp.textContent = Math.round(current.temperature_2m); els.currentSummary.textContent = meta.label;
  els.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;
  els.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  els.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  els.precipitation.textContent = `${Number(current.precipitation || 0).toFixed(1)} mm`;
  els.sunrise.textContent = formatHour(weather.daily.sunrise[0]);
  els.updatedAt.textContent = 'Updated just now'; renderHourly(weather.hourly, current.time); renderDaily(weather.daily);
}

function renderHourly(hourly, currentTime) {
  let start = hourly.time.findIndex((time) => time >= currentTime); if (start < 0) start = 0;
  const fragment = document.createDocumentFragment();
  hourly.time.slice(start, start + 6).forEach((time, offset) => {
    const index = start + offset; const meta = weatherMeta(hourly.weather_code[index]); const item = document.createElement('div'); item.className = 'hour-card';
    item.setAttribute('aria-label', `${offset === 0 ? 'Now' : formatHour(time)}, ${meta.label}, ${Math.round(hourly.temperature_2m[index])} degrees`);
    item.innerHTML = `<span class="hour">${offset === 0 ? 'Now' : formatHour(time)}</span><span class="mini-icon">${weatherIcon(meta.icon)}</span><span class="hour-temp">${Math.round(hourly.temperature_2m[index])}°</span>`; fragment.append(item);
  });
  els.hourlyForecast.replaceChildren(fragment);
}

function renderDaily(daily) {
  const fragment = document.createDocumentFragment();
  daily.time.forEach((date, index) => {
    const meta = weatherMeta(daily.weather_code[index]); const row = document.createElement('div'); row.className = 'daily-row';
    row.innerHTML = `<span class="day">${formatDay(date, index)}</span><div class="weather-mini"><span class="mini-icon">${weatherIcon(meta.icon)}</span><span>${meta.label}</span></div><span class="range">${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°</span>`; fragment.append(row);
  });
  els.dailyForecast.replaceChildren(fragment);
}

els.searchForm.addEventListener('submit', (event) => { event.preventDefault(); const city = els.cityInput.value.trim(); if (city) fetchCity(city); });
els.locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { showError('Location services are not supported by this browser.'); return; }
  setLoading(true); clearError();
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => fetchForecast(coords.latitude, coords.longitude, 'Your location'),
    (error) => { setLoading(false); showError(error.code === 1 ? 'Location access was declined. Search for your city instead.' : 'Your location could not be determined.'); },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
});

renderSavedCities(); fetchCity(localStorage.getItem(STORAGE_KEY) || defaultCity);
