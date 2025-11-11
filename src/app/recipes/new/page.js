'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function NewRecipePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Dati ricetta
  const [name, setName] = useState('')
  const [category, setCategory] = useState('pranzo')
  const [servings, setServings] = useState(2)
  
  // Ingredienti dinamici
  const [ingredients, setIngredients] = useState([
    { name: '', quantity: '', unit: '' }
  ])

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }])
  }

  const handleRemoveIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value
    setIngredients(newIngredients)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Crea la ricetta
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name,
          category,
          servings: parseInt(servings)
        })
        .select()
        .single()

      if (recipeError) throw recipeError

      // 2. Crea gli ingredienti (solo quelli compilati)
      const validIngredients = ingredients.filter(
        ing => ing.name.trim() !== ''
      )

      if (validIngredients.length > 0) {
        const ingredientsData = validIngredients.map((ing, index) => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          order_index: index
        }))

        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsData)

        if (ingredientsError) throw ingredientsError
      }

      alert('Ricetta creata con successo! 🎉')
      router.push('/recipes')
    } catch (error) {
      console.error('Errore creazione ricetta:', error)
      alert('Errore durante la creazione della ricetta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Nuova Ricetta
        </h1>

        <form onSubmit={handleSubmit} className="card">
          {/* Nome Ricetta */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Ricetta *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Es: Pasta al Pomodoro"
              required
            />
          </div>

          {/* Categoria */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
              required
            >
              <option value="colazione">🥐 Colazione</option>
              <option value="pranzo">🍝 Pranzo</option>
              <option value="cena">🍲 Cena</option>
            </select>
          </div>

          {/* Porzioni */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numero Porzioni *
            </label>
            <input
              type="number"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="input-field"
              min="1"
              max="20"
              required
            />
          </div>

          {/* Ingredienti */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Ingredienti
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                + Aggiungi Ingrediente
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex space-x-2">
                  {/* Nome ingrediente */}
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    placeholder="Nome (es: Pasta)"
                    className="input-field flex-1"
                  />
                  
                  {/* Quantità */}
                  <input
                    type="text"
                    value={ingredient.quantity}
                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="input-field w-24"
                  />
                  
                  {/* Unità */}
                  <input
                    type="text"
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    placeholder="Unità"
                    className="input-field w-24"
                  />

                  {/* Bottone elimina */}
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-red-600 hover:text-red-700 px-3"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Es: Pasta - 400 - g
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvataggio...' : 'Crea Ricetta'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}