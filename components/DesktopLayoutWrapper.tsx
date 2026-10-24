'use client';

import React from 'react';
import { useUI } from '@/hooks/useUI';
import { useRole } from '@/hooks/useRole';

export function DesktopLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useUI();
  const { user } = useRole();

  const desktopPadding = !user ? 'md:pl-0' : isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64';

  return (
    <div
      className={`${desktopPadding} min-h-screen flex flex-col pb-24 md:pb-0 transition-all duration-300 ease-in-out w-full min-w-0`}
    >
      {children}
    </div>
  );
}
