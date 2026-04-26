import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/users': 'Users Management',
  '/rooms': 'Rooms Management',
  '/bug-reports': 'Bug Reports',
  '/notifications': 'Notifications',
};

export default function Layout({ onLogout }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'OneRoom Admin';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
