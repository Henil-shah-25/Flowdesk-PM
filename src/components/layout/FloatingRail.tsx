import React, { useState } from 'react';
import { Search, Plus, Bookmark, Settings as SettingsIcon } from 'lucide-react';
import { IconButton, Modal } from '../ui';
import { useNavigate } from 'react-router-dom';

export const FloatingRail: React.FC = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <aside
        aria-label="Quick Actions"
        className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 bg-white/40 backdrop-blur-[24px] border border-white/65 shadow-glass rounded-full p-2 flex-col items-center gap-3"
      >
        <IconButton
          icon={<Search size={16} />}
          aria-label="Search items"
          variant="glass"
          size="sm"
          onClick={() => setIsSearchOpen(true)}
        />

        <IconButton
          icon={<Plus size={18} />}
          aria-label="Quick add"
          variant="dark"
          size="sm"
          onClick={() => navigate('/projects')}
        />

        <IconButton
          icon={<Bookmark size={16} />}
          aria-label="Favorites"
          variant="glass"
          size="sm"
          onClick={() => navigate('/today')}
        />

        <IconButton
          icon={<SettingsIcon size={16} />}
          aria-label="Settings"
          variant="glass"
          size="sm"
          onClick={() => navigate('/settings')}
        />
      </aside>

      {/* Global Quick Search Modal */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Quick Search"
        description="Search across projects, tasks, departments, and ideas."
      >
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              autoFocus
              placeholder="Type keywords to filter workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="text-xs text-secondary/80 py-2">
            Tip: Press <kbd className="px-1.5 py-0.5 bg-black/5 rounded">Esc</kbd> to close.
          </div>
        </div>
      </Modal>
    </>
  );
};
