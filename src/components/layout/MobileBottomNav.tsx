import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Sun,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Plus,
  Lightbulb,
  Timer,
  BarChart3,
  Users,
  Settings,
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
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Check if any "More" items are currently active
  const isMoreItemActive = ['/tasks', '/team', '/ideas', '/reports', '/focus', '/settings', '/account'].some(
    (p) => location.pathname.startsWith(p)
  );

  return (
    <>
      {/* Floating Quick Action Button — positioned neatly above bottom nav with safe-area spacing */}
      <div
        className="md:hidden fixed right-4 z-40"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (location.pathname.startsWith('/projects/')) {
              // On a project page, open new task or template
              navigate(location.pathname);
            } else {
              navigate('/tasks');
            }
          }}
          className="w-12 h-12 rounded-full bg-nearblack text-white flex items-center justify-center shadow-[0_8px_24px_rgba(23,25,27,0.28)] border border-white/20 focus:outline-none active:bg-black"
          aria-label="Quick action"
        >
          <Plus size={22} className="stroke-[2.5]" />
        </motion.button>
      </div>

      {/* Floating Glass Bottom Nav Pill with 5 Icons */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed left-3 right-3 z-40 max-w-sm mx-auto"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="bg-white/80 backdrop-blur-[20px] border border-white/80 shadow-[0_12px_36px_rgba(20,25,30,0.14)] rounded-full px-2 py-1.5 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;

            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all select-none active:scale-95 ${
                    isMoreOpen || isMoreItemActive
                      ? 'bg-nearblack text-white shadow-sm'
                      : 'text-secondary hover:text-graphite'
                  }`}
                  aria-label="More navigation links"
                >
                  <Icon size={19} />
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
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      isActive
                        ? 'bg-nearblack text-white shadow-sm'
                        : 'text-secondary hover:text-graphite'
                    }`}
                  >
                    <Icon size={19} />
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
          <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-graphite/25 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="relative w-full max-w-sm bg-white/90 backdrop-blur-[24px] border border-white/80 shadow-[0_20px_60px_rgba(20,25,30,0.22)] rounded-[30px] p-5 mb-20 z-10 space-y-2"
              style={{ marginBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">All Workspaces</h4>
                <span className="text-[11px] text-muted font-normal">Flowdesk</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigate('/tasks');
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all ${
                  location.pathname === '/tasks' ? 'bg-nearblack text-white' : 'hover:bg-black/5 text-graphite'
                }`}
              >
                <CheckSquare size={17} className={location.pathname === '/tasks' ? 'text-lime' : 'text-secondary'} />
                <span>Tasks & Kanban</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/team');
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all ${
                  location.pathname === '/team' ? 'bg-nearblack text-white' : 'hover:bg-black/5 text-graphite'
                }`}
              >
                <Users size={17} className={location.pathname === '/team' ? 'text-lime' : 'text-secondary'} />
                <span>Team & Workload</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/ideas');
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all ${
                  location.pathname === '/ideas' ? 'bg-nearblack text-white' : 'hover:bg-black/5 text-graphite'
                }`}
              >
                <Lightbulb size={17} className={location.pathname === '/ideas' ? 'text-lime' : 'text-secondary'} />
                <span>Ideas Whiteboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/reports');
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all ${
                  location.pathname === '/reports' ? 'bg-nearblack text-white' : 'hover:bg-black/5 text-graphite'
                }`}
              >
                <BarChart3 size={17} className={location.pathname === '/reports' ? 'text-lime' : 'text-secondary'} />
                <span>Reports & Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/focus');
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all ${
                  location.pathname === '/focus' ? 'bg-nearblack text-white' : 'hover:bg-black/5 text-graphite'
                }`}
              >
                <Timer size={17} className={location.pathname === '/focus' ? 'text-lime' : 'text-secondary'} />
                <span>Focus Session</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all ${
                  location.pathname === '/settings' ? 'bg-nearblack text-white' : 'hover:bg-black/5 text-graphite'
                }`}
              >
                <Settings size={17} className={location.pathname === '/settings' ? 'text-lime' : 'text-secondary'} />
                <span>Settings & Database</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
