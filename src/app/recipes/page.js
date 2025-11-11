'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, colazione, pranzo, cena

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error('Errore caricamento ricette:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (recipeId) => {
    if (!confirm('Sei sicuro di voler eliminare questa ricetta?')) return

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)

      if (error) throw error
      
      // Rimuovi dalla lista locale
      setRecipes(recipes.filter(r => r.id !== recipeId))
      alert('Ricetta eliminata!')
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const filteredRecipes = filter === 'all' 
    ? recipes 
    : recipes.filter(r => r.category === filter)

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'colazione': return '🥐'
      case 'pranzo': return '🍝'
      case 'cena': return '🍲'
      default: return '🍽️'
    }
  }

  const getCategoryColor = (category) => {
    switch(category) {
      case 'colazione': return 'bg-yellow-100 text-yellow-800'
      case 'pranzo': return 'bg-green-100 text-green-800'
      case 'cena': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Le Mie Ricette
          </h1>
          <button
            onClick={() => router.push('/recipes/new')}
            className="btn-primary flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Nuova Ricetta</span>
          </button>
        </div>

        {/* Filtri */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tutte ({recipes.length})
          </button>
          <button
            onClick={() => setFilter('colazione')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'colazione' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🥐 Colazione
          </button>
          <button
            onClick={() => setFilter('pranzo')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'pranzo' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🍝 Pranzo
          </button>
          <button
            onClick={() => setFilter('cena')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'cena' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🍲 Cena
          </button>
        </div>

        {/* Lista Ricette */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Caricamento...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12 card">
            <p className="text-4xl mb-4">📖</p>
            <p className="text-xl text-gray-600 mb-2">Nessuna ricetta trovata</p>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? 'Inizia creando la tua prima ricetta!'
                : `Nessuna ricetta per ${filter}`
              }
            </p>
            <button
              onClick={() => router.push('/recipes/new')}
              className="btn-primary"
            >
              Crea la tua prima ricetta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="card hover:shadow-lg transition">
                {/* Header Card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl">
                      {getCategoryIcon(recipe.category)}
                    </span>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {recipe.name}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(recipe.category)}`}>
                        {recipe.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    👥 {recipe.servings} {recipe.servings === 1 ? 'porzione' : 'porzioni'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t">
                  <button
                    onClick={() => router.push(`/recipes/${recipe.id}`)}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 font-medium text-sm"
                  >
                    Visualizza
                  </button>
                  <button
                    onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium text-sm"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 font-medium text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}