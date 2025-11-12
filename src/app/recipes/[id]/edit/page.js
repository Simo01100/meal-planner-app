'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  
  // Dati ricetta
  const [name, setName] = useState('')
  const [category, setCategory] = useState('pranzo')
  const [servings, setServings] = useState(2)
  
  // Ingredienti
  const [ingredients, setIngredients] = useState([])
  const [originalRecipe, setOriginalRecipe] = useState(null)

  // Modal AI
  const [showAIIngredients, setShowAIIngredients] = useState(false)
  const [aiIngredients, setAiIngredients] = useState([])

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

      setOriginalRecipe(recipeData)
      setName(recipeData.name)
      setCategory(recipeData.category)
      setServings(recipeData.servings)

      // Carica ingredienti
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('order_index', { ascending: true })

      if (ingredientsError) throw ingredientsError

      // Se non ci sono ingredienti, metti almeno uno vuoto
      if (ingredientsData.length === 0) {
        setIngredients([{ name: '', quantity: '', unit: '' }])
      } else {
        setIngredients(ingredientsData.map(ing => ({
          id: ing.id, // Salviamo l'ID per UPDATE
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit
        })))
      }

    } catch (error) {
      console.error('Errore caricamento ricetta:', error)
      alert('Ricetta non trovata')
      router.push('/recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }])
  }

  const handleRemoveIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value
    setIngredients(newIngredients)
  }

  // FUNZIONE AI (opzionale, per aggiungere ingredienti)
  const handleGenerateWithAI = async () => {
    if (!name.trim()) {
      alert('Inserisci prima il nome della ricetta!')
      return
    }

    setGeneratingAI(true)
    try {
      const response = await fetch('/api/generate-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeName: name, category: category }),
      })

      if (!response.ok) throw new Error('Errore API')

      const data = await response.json()
      
      if (data.success && data.ingredients) {
        setAiIngredients(data.ingredients)
        setShowAIIngredients(true)
      }
    } catch (error) {
      console.error('Error generating ingredients:', error)
      alert('Errore durante la generazione. Riprova!')
    } finally {
      setGeneratingAI(false)
    }
  }

  const toggleAIIngredient = (index) => {
    const updated = [...aiIngredients]
    updated[index].selected = !updated[index].selected
    setAiIngredients(updated)
  }

  const useSelectedAIIngredients = () => {
    const selected = aiIngredients.filter(ing => ing.selected)
    // Aggiungi ai esistenti invece di sostituire
    setIngredients([
      ...ingredients,
      ...selected.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit
      }))
    ])
    setShowAIIngredients(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Aggiorna la ricetta
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name,
          category,
          servings: parseInt(servings)
        })
        .eq('id', recipeId)

      if (recipeError) throw recipeError

      // 2. Cancella tutti gli ingredienti vecchi
      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('recipe_id', recipeId)

      if (deleteError) throw deleteError

      // 3. Inserisci i nuovi ingredienti
      const validIngredients = ingredients.filter(
        ing => ing.name.trim() !== ''
      )

      if (validIngredients.length > 0) {
        const ingredientsData = validIngredients.map((ing, index) => ({
          recipe_id: recipeId,
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

      alert('Ricetta aggiornata con successo! 🎉')
      router.push(`/recipes/${recipeId}`)
    } catch (error) {
      console.error('Errore aggiornamento ricetta:', error)
      alert('Errore durante l\'aggiornamento della ricetta')
    } finally {
      setSaving(false)
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Indietro
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Modifica Ricetta
          </h1>
        </div>

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
              <div className="flex space-x-2">
                {/* Bottone AI */}
                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generatingAI || !name.trim()}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center space-x-1"
                >
                  {generatingAI ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      <span>Gen...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>AI</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  + Aggiungi
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    placeholder="Nome"
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
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL AI (stesso di new) */}
      {showAIIngredients && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold flex items-center space-x-2">
                    <span>✨</span>
                    <span>Aggiungi Ingredienti AI</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Seleziona quali ingredienti aggiungere
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
                    <input
                      type="checkbox"
                      checked={ingredient.selected}
                      onChange={() => {}}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">
                        {ingredient.name}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {ingredient.quantity} {ingredient.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                  Aggiungi Selezionati ({aiIngredients.filter(i => i.selected).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}