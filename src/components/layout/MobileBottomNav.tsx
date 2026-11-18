import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Sun,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Plus,
  Lightbulb,
  Timer,
  BarChart3,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mobileNavItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Today', path: '/today', icon: Sun },
  { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
  { name: 'More', path: '#more', icon: MoreHorizontal, isMenu: true },
];

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      {/* Floating Center-Right "+" Quick Add Button */}
      <div className="md:hidden fixed bottom-20 right-5 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate('/projects')}
          className="w-12 h-12 rounded-full bg-nearblack text-white flex items-center justify-center shadow-[0_8px_25px_rgba(18,18,18,0.25)] focus:outline-none"
          aria-label="Quick Add"
        >
          <Plus size={22} />
        </motion.button>
      </div>

      {/* Floating Glass Bottom Nav Pill with 5 Icons */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto"
      >
        <div className="bg-white/50 backdrop-blur-[16px] border border-white/70 shadow-glass rounded-full px-3 py-2 flex items-center justify-between">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;

            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isMoreOpen ? 'bg-nearblack text-white' : 'text-secondary hover:text-graphite'
                  }`}
                  aria-label="More navigation links"
                >
                  <Icon size={18} />
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className="relative flex items-center justify-center select-none"
              >
                {({ isActive }) => (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-nearblack text-white shadow-sm'
                        : 'text-secondary hover:text-graphite'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* More Menu Popover */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-graphite/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white/80 backdrop-blur-[24px] border border-white/80 shadow-glass rounded-[28px] p-5 mb-16 z-10 space-y-2"
            >
              <h4 className="text-xs font-semibold text-secondary px-2 mb-2">More Spaces</h4>
              <button
                type="button"
                onClick={() => {
                  navigate('/ideas');
                  setIsMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 text-xs font-medium text-graphite transition-colors"
              >
                <Lightbulb size={16} />
                <span>Ideas Whiteboard</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/reports');
                  setIsMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 text-xs font-medium text-graphite transition-colors"
              >
                <BarChart3 size={16} />
                <span>Reports</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/focus');
                  setIsMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 text-xs font-medium text-graphite transition-colors"
              >
                <Timer size={16} />
                <span>Focus Session</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/account');
                  setIsMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 text-xs font-medium text-graphite transition-colors"
              >
                <User size={16} />
                <span>Account & Database</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
