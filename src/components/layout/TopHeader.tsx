import React from 'react';
import { SyncIndicator } from '../common/SyncIndicator';

export const TopHeader: React.FC = () => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-30 px-5 h-14 bg-white/40 backdrop-blur-[20px] border-b border-white/60 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[9px] bg-lime flex items-center justify-center font-bold text-nearblack text-sm shadow-sm">
          F
        </div>
        <span className="font-normal text-lg text-graphite tracking-tight">
          Flowdesk
        </span>
      </div>
      <SyncIndicator compact />
    </header>
  );
};
