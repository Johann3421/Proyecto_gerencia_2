import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Topbar, { SearchContext } from './Topbar';
import Sidebar from './Sidebar';

export default function Shell() {
  const [search, setSearch] = useState('');

  return (
    <SearchContext.Provider value={{ search, setSearch }}>
      <div className="app-layout">
        <Sidebar />
        <Topbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </SearchContext.Provider>
  );
}
