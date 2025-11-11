'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Layout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Ottieni utente corrente
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl">🍽️</span>
              <span className="ml-2 text-xl font-bold text-gray-900">
                Meal Planner
              </span>
            </div>

            {/* Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/recipes')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Ricette
              </button>
              <button
                onClick={() => router.push('/meal-plan')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Piano Settimanale
              </button>
              <button
                onClick={() => router.push('/shopping-list')}
                className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Lista Spesa
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <span className="text-sm text-gray-600">
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
          </div>
        </div>
      </nav>

      {/* Contenuto */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}