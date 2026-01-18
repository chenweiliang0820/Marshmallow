import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Navigation */}
      <nav className="glass-effect sticky top-0 z-50 border-b border-dark-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="text-2xl font-bold text-gradient font-display">
                棉花糖工具箱
              </span>
              <span className="text-sm text-gray-400 group-hover:text-neon-blue transition-colors">
                Marshmallow Toolbox
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${
                  isHome
                    ? 'text-neon-cyan'
                    : 'text-gray-400 hover:text-neon-blue'
                }`}
              >
                首頁
              </Link>
              <Link
                to="/tools"
                className={`text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/tools')
                    ? 'text-neon-cyan'
                    : 'text-gray-400 hover:text-neon-blue'
                }`}
              >
                工具列表
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2024 棉花糖工具箱 (Marshmallow Toolbox). 專業工具集合平台</p>
            <p className="mt-2 text-gray-600">
              Built with React, TypeScript, Tailwind CSS & Vite
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}