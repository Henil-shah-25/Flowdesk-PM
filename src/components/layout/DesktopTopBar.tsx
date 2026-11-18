import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { navItems } from './navigationConfig';
import { SyncIndicator } from '../common/SyncIndicator';
import { Bell, Inbox } from 'lucide-react';
import { IconButton } from '../ui';

export const DesktopTopBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="hidden md:flex items-center justify-between px-8 w-full fixed top-0 left-0 right-0 z-30 pointer-events-none h-[80px]">
      {/* Top Left: Logo tile in lime + App Name */}
      <div
        onClick={() => navigate('/')}
        className="flex items-center gap-3.5 pointer-events-auto cursor-pointer group"
      >
        <div className="w-11 h-11 rounded-[12px] bg-lime flex items-center justify-center font-bold text-nearblack text-lg shadow-sm group-hover:scale-105 transition-transform">
          F
        </div>
        <span className="font-normal text-2xl text-graphite tracking-tight">
          Flowdesk
        </span>
      </div>

      {/* Center: Centered glass pill containing the main nav (48px high, 16px items) */}
      <nav
        aria-label="Main Navigation"
        className="pointer-events-auto h-12 bg-white/40 backdrop-blur-[24px] border border-white/65 shadow-glass rounded-full p-1.5 flex items-center gap-1"
      >
        {navItems.map((item) => {
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="relative px-5 py-2 rounded-full text-[16px] font-normal transition-colors select-none flex items-center justify-center h-full"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-charcoal rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span
                    className={`relative z-10 transition-colors ${
                      isActive ? 'text-white font-medium' : 'text-secondary hover:text-graphite'
                    }`}
                  >
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Top Right: Circular glass icon buttons + lime avatar (52px) */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <SyncIndicator />

        <IconButton
          icon={<Bell size={18} />}
          aria-label="Notifications"
          variant="glass"
          size="md"
        />

        <IconButton
          icon={<Inbox size={18} />}
          aria-label="Inbox"
          variant="glass"
          size="md"
        />

        {/* Avatar circle in lime - 52px */}
        <div
          onClick={() => navigate('/settings')}
          className="w-[52px] h-[52px] rounded-full bg-lime text-nearblack font-semibold text-sm flex items-center justify-center border border-white/70 shadow-sm cursor-pointer hover:scale-105 transition-transform"
          title="Settings & Workspace Profile"
        >
          HS
        </div>
      </div>
    </header>
  );
};
