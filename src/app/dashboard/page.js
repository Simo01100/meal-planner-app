'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRecipes: 0,
    thisWeekMeals: 0,
    shoppingItems: 0
  })

  useEffect(() => {
    checkUser()
    loadStats()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
    }
  }

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Conta ricette
      const { count: recipesCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setStats(prev => ({
        ...prev,
        totalRecipes: recipesCount || 0
      }))
    } catch (error) {
      console.error('Errore caricamento stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dashboard
        </h1>

        {/* Cards statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card Ricette */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ricette Totali</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.totalRecipes}
                </p>
              </div>
              <div className="text-4xl">📖</div>
            </div>
          </div>

          {/* Card Piano Settimanale */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pasti Questa Settimana</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.thisWeekMeals}
                </p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
          </div>

          {/* Card Lista Spesa */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Articoli da Comprare</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.shoppingItems}
                </p>
              </div>
              <div className="text-4xl">🛒</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Azioni Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/recipes/new')}
              className="btn-primary text-left p-4 flex items-center space-x-3"
            >
              <span className="text-2xl">➕</span>
              <div>
                <p className="font-semibold">Aggiungi Ricetta</p>
                <p className="text-sm opacity-90">Crea una nuova ricetta</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/meal-plan')}
              className="btn-secondary text-left p-4 flex items-center space-x-3"
            >
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-semibold">Pianifica Settimana</p>
                <p className="text-sm text-gray-600">Organizza i tuoi pasti</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}