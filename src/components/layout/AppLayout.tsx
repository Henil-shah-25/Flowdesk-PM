import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DesktopTopBar } from './DesktopTopBar';
import { FloatingRail } from './FloatingRail';
import { MobileBottomNav } from './MobileBottomNav';
import { TopHeader } from './TopHeader';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TaskDetail } from '../tasks/TaskDetail';
import { useSyncCoordinator } from '../../services/syncService';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  // Activate cross-device and cross-tab synchronization listener
  useSyncCoordinator();

  return (
    <div className="relative min-h-screen flex flex-col text-graphite antialiased font-sans">
      {/* Mobile top header (fixed, 56px high) */}
      <TopHeader />

      {/* Desktop centered glass pill top bar (fixed, 80px high) */}
      <DesktopTopBar />

      {/* Desktop floating vertical rail */}
      <FloatingRail />

      {/* Main Content Area: nav height + padding, safe areas */}
      <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:pl-[140px] lg:pr-[48px] pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pt-[110px] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-16 max-w-[1760px] mx-auto w-full">
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
