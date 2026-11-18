import React from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from './navigationConfig';
import { motion } from 'framer-motion';

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto"
      aria-label="Mobile Navigation"
    >
      <div className="bg-white/75 backdrop-blur-[16px] border border-white/85 shadow-[0_10px_35px_rgba(20,24,30,0.12)] rounded-[22px] px-2 py-2 flex items-center justify-between overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center min-w-[44px] py-1 px-1.5 rounded-[14px] text-[10px] font-medium transition-all ${
                  isActive ? 'text-graphite font-semibold' : 'text-secondary hover:text-graphite'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative p-1">
                    <Icon size={20} className={isActive ? 'text-indigo' : 'text-secondary'} />
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavDot"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className="truncate max-w-[48px]">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
