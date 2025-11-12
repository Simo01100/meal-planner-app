'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Layout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navigateTo = (path) => {
    router.push(path)
    setMobileMenuOpen(false) // Chiudi menu dopo navigazione
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => navigateTo('/dashboard')}
              className="flex items-center"
            >
              <span className="text-2xl">🍽️</span>
              <span className="ml-2 text-xl font-bold text-gray-900 hidden sm:block">
                Meal Planner
              </span>
              <span className="ml-2 text-lg font-bold text-gray-900 sm:hidden">
                MP
              </span>
            </button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => navigateTo('/dashboard')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </button>
              <button
                onClick={() => navigateTo('/recipes')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Ricette
              </button>
              <button
                onClick={() => navigateTo('/meal-plan')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Piano
              </button>
              <button
                onClick={() => navigateTo('/shopping-list')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Spesa
              </button>

              {/* User menu Desktop */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <span className="text-sm text-gray-600 max-w-[150px] truncate">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Esci
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                // X icon
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger icon
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 pt-2 pb-3 space-y-1">
              <button
                onClick={() => navigateTo('/dashboard')}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                🏠 Home
              </button>
              <button
                onClick={() => navigateTo('/recipes')}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                📖 Ricette
              </button>
              <button
                onClick={() => navigateTo('/meal-plan')}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                📅 Piano Settimanale
              </button>
              <button
                onClick={() => navigateTo('/shopping-list')}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                🛒 Lista Spesa
              </button>
            </div>
            
            {/* User section Mobile */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-4">
                <div className="text-sm text-gray-600 mb-2">
                  Accesso effettuato come:
                </div>
                <div className="text-sm font-medium text-gray-900 mb-3 break-all">
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-medium"
                >
                  Esci
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Overlay per chiudere menu quando clicchi fuori */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Contenuto */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
