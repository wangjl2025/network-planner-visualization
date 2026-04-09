import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BookOpen, Layers, Grid, Cpu } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const phases = [
  { id: 1, name: 'Phase 1', title: '核心基础', icon: BookOpen, color: 'bg-blue-500' },
  { id: 2, name: 'Phase 2', title: '数据中心', icon: Layers, color: 'bg-green-500' },
  { id: 3, name: 'Phase 3', title: '扩展整合', icon: Grid, color: 'bg-purple-500' },
  { id: 4, name: 'Phase 4', title: '高级前沿', icon: Cpu, color: 'bg-orange-500' },
];

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NP</span>
              </div>
              <span className="font-semibold text-lg hidden sm:block">
                网络规划师可视化学习
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className="p-4 space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === '/'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Grid size={18} />
            <span>首页</span>
          </Link>

          <div className="pt-4">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              学习阶段
            </h3>
          </div>

          {phases.map((phase) => (
            <Link
              key={phase.id}
              to={`/phase/${phase.id}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith(`/phase/${phase.id}`)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <phase.icon size={18} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{phase.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{phase.title}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
