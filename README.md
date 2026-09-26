# Weather Dashboard

A modern weather dashboard built with HTML, CSS, and JavaScript using the Open-Meteo public API.

## Features

- Search weather by city name
- Use browser geolocation for local weather
- Display current conditions, humidity, wind, and precipitation
- Show hourly and 7-day forecasts
- Save recently searched cities in local storage
- Responsive layout for desktop and mobile devices

## Run locally

1. Open `index.html` directly in a browser, or run a local web server:

```bash
python -m http.server 8000
```

2. Visit `http://localhost:8000` in your browser.

## API used

- Open-Meteo: https://open-meteo.com/

This project does not require an API key.

## Project structure

- `index.html` — app layout
- `styles.css` — dashboard styling
- `script.js` — weather fetching logic and local storage behavior

## Notes

The app stores the last searched city and a small list of saved cities in browser local storage so the dashboard feels personalized on repeat visits.
