import React, { useEffect, useState } from 'react';

const DEFAULT_LOCATION = { name: 'New Delhi', latitude: 28.6139, longitude: 77.209 };
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

function describeWeather(code) {
    if (code === 0) return ['☀️', 'Clear sky'];
    if ([1, 2].includes(code)) return ['🌤️', 'Partly cloudy'];
    if (code === 3) return ['☁️', 'Overcast'];
    if ([45, 48].includes(code)) return ['🌫️', 'Fog'];
    if ([51, 53, 55, 56, 57].includes(code)) return ['🌦️', 'Drizzle'];
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['🌧️', 'Rain'];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ['🌨️', 'Snow'];
    if ([95, 96, 99].includes(code)) return ['⛈️', 'Thunderstorm'];
    return ['🌡️', 'Current weather'];
}

export default function WeatherClock({ showToast }) {
    const [now, setNow] = useState(() => new Date());
    const [location, setLocation] = useState(DEFAULT_LOCATION);
    const [weather, setWeather] = useState(null);
    const [weatherUnavailable, setWeatherUnavailable] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadWeather = async () => {
            try {
                const params = new URLSearchParams({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    current: 'temperature_2m,apparent_temperature,weather_code',
                    timezone: 'auto'
                });
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
                if (!response.ok) throw new Error('Weather request failed');
                const data = await response.json();
                if (!cancelled && Number.isFinite(data.current?.temperature_2m)) {
                    setWeather({
                        temperature: Math.round(data.current.temperature_2m),
                        code: data.current.weather_code
                    });
                    setWeatherUnavailable(false);
                }
            } catch {
                if (!cancelled) setWeatherUnavailable(true);
            }
        };

        loadWeather();
        const timer = window.setInterval(loadWeather, WEATHER_REFRESH_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [location]);

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            showToast?.('Location is unavailable in this browser. Showing New Delhi weather.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => setLocation({
                name: 'Your location',
                latitude: coords.latitude,
                longitude: coords.longitude
            }),
            () => showToast?.('Location access was not granted. Showing New Delhi weather.'),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 }
        );
    };

    const [weatherIcon, weatherLabel] = weather ? describeWeather(weather.code) : ['🌤️', weatherUnavailable ? 'Weather unavailable' : 'Loading weather'];
    const indiaTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(now);
    const compactIndiaTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(now);

    return (
        <div className="topbar-live-info" aria-label="Live weather and India time">
            <button
                type="button"
                className="topbar-weather"
                onClick={useCurrentLocation}
                title={`Weather for ${location.name}. Click to use your current location.`}
                aria-label={`Weather for ${location.name}: ${weather ? `${weather.temperature} degrees Celsius, ${weatherLabel}` : weatherLabel}. Click to use your current location.`}
            >
                <span className="topbar-weather-icon" aria-hidden="true">{weatherIcon}</span>
                <span className="topbar-weather-copy">
                    <strong>{weather ? `${weather.temperature}°C` : '—'}</strong>
                    <span>{location.name}</span>
                </span>
            </button>
            <span className="topbar-info-divider" aria-hidden="true" />
            <div className="topbar-india-time" aria-label={`India time ${indiaTime}`}>
                <span className="topbar-india-time-label">INDIA</span>
                <strong className="topbar-time-full">{indiaTime}</strong>
                <strong className="topbar-time-compact">{compactIndiaTime}</strong>
                <span className="topbar-timezone">IST</span>
            </div>
        </div>
    );
}
