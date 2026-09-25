import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Map, Bell, User } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Home', icon: <Home className="w-6 h-6" /> },
    { to: '/planner', label: 'Plan', icon: <Compass className="w-6 h-6" /> },
    { to: '/journey/active', label: 'Journey', icon: <Map className="w-6 h-6" /> },
    { to: '/events', label: 'Alerts', icon: <Bell className="w-6 h-6" /> },
    { to: '/profile', label: 'Profile', icon: <User className="w-6 h-6" /> }
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-[999] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          // Check if active (handle root path explicitly)
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-brand-600' : 'text-slate-500 font-semibold'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}