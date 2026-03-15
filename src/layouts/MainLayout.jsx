import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import ScrollToTop from '../components/common/ScrollToTop';

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8 page-transition">
            {children}
          </div>
        </main>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default MainLayout;
