import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DesktopTopBar } from './DesktopTopBar';
import { FloatingRail } from './FloatingRail';
import { MobileBottomNav } from './MobileBottomNav';
import { TopHeader } from './TopHeader';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TaskDetail } from '../tasks/TaskDetail';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="relative min-h-screen flex flex-col text-graphite antialiased font-sans">
      {/* Mobile top header (fixed, 56px high) */}
      <TopHeader />

      {/* Desktop centered glass pill top bar (fixed, 80px high) */}
      <DesktopTopBar />

      {/* Desktop floating vertical rail */}
      <FloatingRail />

      {/* Main Content Area: nav height + 28-30px, max-width 1760px */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:pl-[140px] lg:pr-[48px] pt-[84px] md:pt-[110px] pb-28 md:pb-16 max-w-[1760px] mx-auto w-full">
        <div key={location.pathname} className="w-full animate-page-enter">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile floating glass bottom nav bar */}
      <MobileBottomNav />

      {/* Shared TaskDetail Modal/Sheet for ?task=ID */}
      <TaskDetail />
    </div>
  );
};
