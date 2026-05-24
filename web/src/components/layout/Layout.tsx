import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Plus } from 'lucide-react';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-x-hidden">
      <Header />
      <div className="flex pt-16 w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 lg:ml-64 p-6 transition-all duration-300 bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Global Floating Action Button */}
      <Link 
        to="/projects"
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        title="Manage Projects"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </div>
  );
};
