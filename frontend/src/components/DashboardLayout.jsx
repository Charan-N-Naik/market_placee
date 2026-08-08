import React, { useState } from 'react';
import Sidebar from './layout/Sidebar';
import Navbar from './layout/Navbar';

export default function DashboardLayout({
  user,
  onLogout,
  navItems = [],
  activeTab,
  setActiveTab,
  children,
  role = 'farmer',
  topBarExtra
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="flex font-sans"
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-page, #f4fbf7)'
      }}
    >
      {/* Sidebar — always in flow on desktop (md+), drawer on mobile */}
      <div className="flex-shrink-0 h-full relative">
        <Sidebar
          user={user}
          onLogout={onLogout}
          navItems={navItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          role={role}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Main content area */}
      <main className="flex-1 min-w-0 flex flex-col" style={{ overflow: 'hidden' }}>
        <Navbar
          activeTab={activeTab}
          navItems={navItems}
          setSidebarOpen={setSidebarOpen}
          role={role}
          topBarExtra={topBarExtra}
          user={user}
        />

        <div
          className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10"
          style={{ overflowY: 'auto' }}
        >
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
