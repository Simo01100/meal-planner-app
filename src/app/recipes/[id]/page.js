'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'

export default function RecipeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id

  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecipe()
  }, [recipeId])

  const loadRecipe = async () => {
    try {
      // Carica ricetta
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single()

      if (recipeError) throw recipeError
      setRecipe(recipeData)

      // Carica ingredienti
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('order_index', { ascending: true })

      if (ingredientsError) throw ingredientsError
      setIngredients(ingredientsData || [])
    } catch (error) {
      console.error('Errore caricamento ricetta:', error)
      alert('Ricetta non trovata')
      router.push('/recipes')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'colazione': return '🥐'
      case 'pranzo': return '🍝'
      case 'cena': return '🍲'
      default: return '🍽️'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </Layout>
    )
  }

  if (!recipe) return null

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Indietro
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-5xl">
                {getCategoryIcon(recipe.category)}
              </span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {recipe.name}
                </h1>
                <p className="text-gray-600 capitalize">
                  {recipe.category}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
              className="btn-primary"
            >
              Modifica
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="card mb-6">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-sm text-gray-600">Porzioni</p>
              <p className="text-2xl font-bold text-gray-900">
                {recipe.servings}
              </p>
            </div>
            <div className="border-l pl-6">
              <p className="text-sm text-gray-600">Ingredienti</p>
              <p className="text-2xl font-bold text-gray-900">
                {ingredients.length}
              </p>
            </div>
          </div>
        </div>

        {/* Ingredienti */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Ingredienti</h2>
          
          {ingredients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nessun ingrediente aggiunto
            </p>
          ) : (
            <ul className="space-y-3">
              {ingredients.map((ingredient) => (
                <li
                  key={ingredient.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <span className="font-medium text-gray-900">
                    {ingredient.name}
                  </span>
                  <span className="text-gray-600">
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}