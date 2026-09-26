import React, { useEffect, useRef, useState } from 'react';

const DEFAULT_LOCATION = { name: 'New Delhi', latitude: 28.6139, longitude: 77.209 };
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const WORLD_CLOCKS = [
    { id: 'USD', country: 'United States', city: 'New York', timeZone: 'America/New_York' },
    { id: 'EUR', country: 'European Union', city: 'Paris', timeZone: 'Europe/Paris' },
    { id: 'GBP', country: 'United Kingdom', city: 'London', timeZone: 'Europe/London' },
    { id: 'INR', country: 'India', city: 'New Delhi', timeZone: 'Asia/Kolkata' },
    { id: 'CAD', country: 'Canada', city: 'Toronto', timeZone: 'America/Toronto' },
    { id: 'AUD', country: 'Australia', city: 'Sydney', timeZone: 'Australia/Sydney' },
    { id: 'JPY', country: 'Japan', city: 'Tokyo', timeZone: 'Asia/Tokyo' },
    { id: 'CHF', country: 'Switzerland', city: 'Zurich', timeZone: 'Europe/Zurich' },
    { id: 'CNY', country: 'China', city: 'Shanghai', timeZone: 'Asia/Shanghai' },
    { id: 'SAR', country: 'Saudi Arabia', city: 'Riyadh', timeZone: 'Asia/Riyadh' },
    { id: 'AED', country: 'United Arab Emirates', city: 'Dubai', timeZone: 'Asia/Dubai' },
    { id: 'PKR', country: 'Pakistan', city: 'Karachi', timeZone: 'Asia/Karachi' },
];

function formatClock(date, timeZone, options) {
    return new Intl.DateTimeFormat('en', { timeZone, ...options }).format(date);
}

function getClockTimeZoneName(date, timeZone) {
    return new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'short' })
        .formatToParts(date)
        .find(part => part.type === 'timeZoneName')?.value || '';
}

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
    const [selectedClockId, setSelectedClockId] = useState(() => {
        try {
            const savedClock = window.localStorage.getItem('fintracker-world-clock');
            return WORLD_CLOCKS.some(clock => clock.id === savedClock) ? savedClock : 'INR';
        } catch {
            return 'INR';
        }
    });
    const [isClockMenuOpen, setIsClockMenuOpen] = useState(false);
    const clockPickerRef = useRef(null);

    useEffect(() => {
        if (!isClockMenuOpen) return undefined;
        const closeOnOutsidePointer = (event) => {
            if (!clockPickerRef.current?.contains(event.target)) setIsClockMenuOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setIsClockMenuOpen(false);
                clockPickerRef.current?.querySelector('button')?.focus();
            }
        };
        document.addEventListener('pointerdown', closeOnOutsidePointer);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isClockMenuOpen]);

    useEffect(() => {
        try {
            window.localStorage.setItem('fintracker-world-clock', selectedClockId);
        } catch {
            // The selected clock remains available for this session when storage is disabled.
        }
    }, [selectedClockId]);

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
    const selectedClock = WORLD_CLOCKS.find(clock => clock.id === selectedClockId) || WORLD_CLOCKS[3];
    const localTime = formatClock(now, selectedClock.timeZone, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const compactLocalTime = formatClock(now, selectedClock.timeZone, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const timeZoneName = getClockTimeZoneName(now, selectedClock.timeZone);

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
            <div className="topbar-clock-picker" ref={clockPickerRef}>
                <button
                    type="button"
                    className="topbar-india-time"
                    aria-label={`${selectedClock.country} local time ${localTime}. Change time zone.`}
                    aria-haspopup="menu"
                    aria-expanded={isClockMenuOpen}
                    aria-controls="world-clock-menu"
                    onClick={() => setIsClockMenuOpen(open => !open)}
                    title="Choose a country time zone"
                >
                    <span className="topbar-india-time-label">{selectedClock.country}</span>
                    <strong className="topbar-time-full">{localTime}</strong>
                    <strong className="topbar-time-compact">{compactLocalTime}</strong>
                    <span className="topbar-timezone">{timeZoneName}</span>
                </button>
                {isClockMenuOpen && (
                    <div className="world-clock-menu" id="world-clock-menu" role="menu" aria-label="Choose country time">
                        {WORLD_CLOCKS.map(clock => (
                            <button
                                key={clock.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={selectedClockId === clock.id}
                                className="world-clock-option"
                                onClick={() => {
                                    setSelectedClockId(clock.id);
                                    setIsClockMenuOpen(false);
                                }}
                            >
                                <span className="world-clock-country">{clock.country}</span>
                                <span className="world-clock-city-time">
                                    {clock.city} · {formatClock(now, clock.timeZone, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
