import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Sparkles } from 'lucide-react';
import { searchPlaces, getPlaceDetails } from '../../services/routeService.js';

export default function PlaceSearchInput({
  label,
  placeholder = 'Search place, landmark, or terminal...',
  value,
  onChange,
  onSelectPlace,
  className = ''
}) {
  const [inputValue, setInputValue] = useState(value?.name || value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (typeof value === 'object' && value?.name) {
      setInputValue(value.name);
    } else if (typeof value === 'string') {
      setInputValue(value);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (onChange) onChange(val);

    if (val.trim().length >= 2) {
      setIsLoading(true);
      setIsOpen(true);
      try {
        const results = await searchPlaces(val);
        setSuggestions(results);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = async (suggestion) => {
    setInputValue(suggestion.name);
    setIsOpen(false);
    setIsLoading(true);

    try {
      if (suggestion.lat && suggestion.lng) {
        if (onSelectPlace) {
          onSelectPlace(suggestion);
        }
        setIsLoading(false);
        return;
      }

      const details = await getPlaceDetails(suggestion.placeId, suggestion.name);
      if (onSelectPlace) {
        onSelectPlace(details);
      }
    } catch (err) {
      if (onSelectPlace) {
        onSelectPlace({
          placeId: suggestion.placeId,
          name: suggestion.name,
          formattedAddress: suggestion.formattedAddress,
          lat: suggestion.lat || 20.5937,
          lng: suggestion.lng || 78.9629
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    if (onChange) onChange('');
    if (onSelectPlace) onSelectPlace(null);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
        />

        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3" />
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown with Maximum India Locations */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3.5 py-1.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Locations Found ({suggestions.length})</span>
            <span className="text-brand-600">Nationwide India Coverage</span>
          </div>
          {suggestions.map((item, idx) => (
            <button
              key={item.placeId || idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-brand-50/60 transition flex items-start gap-2.5 group"
            >
              <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5 group-hover:scale-110 transition" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.state && (
                      <span className="text-[9px] font-medium text-slate-400 hidden sm:inline">
                        {item.state}
                      </span>
                    )}
                    <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                      {item.provider === 'GOOGLE_PLACES' ? 'Google' : item.provider === 'OSM_NOMINATIM' ? 'India Live' : item.category || 'Hub'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {item.formattedAddress}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
