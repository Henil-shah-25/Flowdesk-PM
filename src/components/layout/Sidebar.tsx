import React from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from './navigationConfig';
import { SyncIndicator } from '../common/SyncIndicator';
import { motion } from 'framer-motion';

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white/60 backdrop-blur-[20px] border-r border-white/80 p-5 z-20 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 rounded-[10px] bg-indigo flex items-center justify-center text-white font-bold text-sm shadow-sm">
          F
        </div>
        <div>
          <span className="font-semibold text-base text-graphite tracking-tight block leading-tight">
            Flowdesk
          </span>
          <span className="text-[11px] text-secondary">Personal Workspace</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-graphite bg-white/90 shadow-[0_2px_12px_rgba(20,24,30,0.05)] border border-white'
                    : 'text-secondary hover:text-graphite hover:bg-white/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-indigo' : 'text-secondary'} />
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Sync Status */}
      <div className="pt-4 border-t border-[rgba(20,24,30,0.06)]">
        <SyncIndicator />
      </div>
    </aside>
  );
};
