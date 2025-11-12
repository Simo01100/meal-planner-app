'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function NewRecipePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  
  // Dati ricetta
  const [name, setName] = useState('')
  const [category, setCategory] = useState('pranzo')
  const [servings, setServings] = useState(2)
  
  // Ingredienti manuali
  const [ingredients, setIngredients] = useState([
    { name: '', quantity: '', unit: '' }
  ])

  // Ingredienti AI
  const [showAIIngredients, setShowAIIngredients] = useState(false)
  const [aiIngredients, setAiIngredients] = useState([])

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

  // NUOVA FUNZIONE: Genera ingredienti con AI
  const handleGenerateWithAI = async () => {
    if (!name.trim()) {
      alert('Inserisci prima il nome della ricetta!')
      return
    }

    setGeneratingAI(true)
    try {
      const response = await fetch('/api/generate-ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeName: name,
          category: category
        }),
      })

      if (!response.ok) {
        throw new Error('Errore API')
      }

      const data = await response.json()
      
      if (data.success && data.ingredients) {
        setAiIngredients(data.ingredients)
        setShowAIIngredients(true)
      } else {
        throw new Error(data.error || 'Errore sconosciuto')
      }
    } catch (error) {
      console.error('Error generating ingredients:', error)
      alert('Errore durante la generazione. Riprova!')
    } finally {
      setGeneratingAI(false)
    }
  }

  // Toggle selezione ingrediente AI
  const toggleAIIngredient = (index) => {
    const updated = [...aiIngredients]
    updated[index].selected = !updated[index].selected
    setAiIngredients(updated)
  }

  // Usa ingredienti AI selezionati
  const useSelectedAIIngredients = () => {
    const selected = aiIngredients.filter(ing => ing.selected)
    setIngredients(selected.map(ing => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit
    })))
    setShowAIIngredients(false)
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

      // 2. Crea gli ingredienti
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

          {/* SEZIONE INGREDIENTI */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Ingredienti
              </label>
              <div className="flex space-x-2">
                {/* Bottone AI */}
                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generatingAI || !name.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
                >
                  {generatingAI ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      <span>Generazione...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Genera con AI</span>
                    </>
                  )}
                </button>
                
                {/* Bottone Manuale */}
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  + Aggiungi Manuale
                </button>
              </div>
            </div>

            {/* Ingredienti Manuali */}
            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    placeholder="Nome (es: Pasta)"
                    className="input-field flex-1"
                  />
                  <input
                    type="text"
                    value={ingredient.quantity}
                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="input-field w-24"
                  />
                  <input
                    type="text"
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    placeholder="Unità"
                    className="input-field w-24"
                  />
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
            
            {ingredients.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Nessun ingrediente. Usa AI o aggiungi manualmente.
              </p>
            )}
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

      {/* MODAL INGREDIENTI AI */}
      {showAIIngredients && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold flex items-center space-x-2">
                    <span>✨</span>
                    <span>Ingredienti Generati dall'AI</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Seleziona quali ingredienti vuoi usare
                  </p>
                </div>
                <button
                  onClick={() => setShowAIIngredients(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Lista Ingredienti */}
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="space-y-2">
                {aiIngredients.map((ingredient, index) => (
                  <div
                    key={index}
                    onClick={() => toggleAIIngredient(index)}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                      ingredient.selected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={ingredient.selected}
                      onChange={() => {}}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />

                    {/* Ingrediente */}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">
                        {ingredient.name}
                      </p>
                    </div>

                    {/* Quantità */}
                    <div className="text-sm text-gray-600">
                      {ingredient.quantity} {ingredient.unit}
                    </div>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  💡 <strong>Suggerimento:</strong> Clicca su un ingrediente per selezionarlo/deselezionarlo. 
                  Poi potrai sempre modificare quantità o aggiungerne altri manualmente.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAIIngredients(false)}
                  className="btn-secondary flex-1"
                >
                  Annulla
                </button>
                <button
                  onClick={useSelectedAIIngredients}
                  className="btn-primary flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Usa Selezionati ({aiIngredients.filter(i => i.selected).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}