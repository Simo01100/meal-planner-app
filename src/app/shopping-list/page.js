'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function ShoppingListPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [shoppingItems, setShoppingItems] = useState([])
  const [currentWeekStart, setCurrentWeekStart] = useState(null)
  const [showRecipesModal, setShowRecipesModal] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [recipesForIngredient, setRecipesForIngredient] = useState([])

  useEffect(() => {
    initWeek()
  }, [])

  useEffect(() => {
    if (currentWeekStart) {
      loadShoppingList()
    }
  }, [currentWeekStart])

  const initWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  const loadShoppingList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const weekStartStr = currentWeekStart.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)
        .eq('is_deleted', false)
        .order('is_purchased', { ascending: true })
        .order('ingredient_name', { ascending: true })

      if (error) throw error
      setShoppingItems(data || [])
    } catch (error) {
      console.error('Errore caricamento lista:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateShoppingList = async () => {
    setGenerating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const weekStartStr = currentWeekStart.toISOString().split('T')[0]

      // 1. Ottieni il piano settimanale
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)
        .single()

      if (planError || !mealPlan) {
        alert('Nessun piano settimanale trovato per questa settimana!')
        setGenerating(false)
        return
      }

      // 2. Raccogli tutti gli ID delle ricette
      const recipeIds = []
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const meals = ['breakfast', 'lunch', 'dinner']

      days.forEach(day => {
        meals.forEach(meal => {
          const recipeId = mealPlan[`${day}_${meal}`]
          if (recipeId) recipeIds.push(recipeId)
        })
      })

      if (recipeIds.length === 0) {
        alert('Il piano settimanale è vuoto! Aggiungi qualche ricetta prima.')
        setGenerating(false)
        return
      }

      // 3. Ottieni ingredienti per tutte le ricette
      const { data: ingredients, error: ingError } = await supabase
        .from('ingredients')
        .select('*, recipes(id, name)')
        .in('recipe_id', recipeIds)

      if (ingError) throw ingError

      // 4. Aggrega ingredienti per nome e unità
      const aggregated = {}

      ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase()}_${ing.unit.toLowerCase()}`
        
        if (!aggregated[key]) {
          aggregated[key] = {
            name: ing.name,
            quantity: 0,
            unit: ing.unit,
            recipeIds: [],
            recipeNames: []
          }
        }

        // Somma quantità (converte in numero se possibile)
        const qty = parseFloat(ing.quantity) || 0
        aggregated[key].quantity += qty

        // Aggiungi ricetta
        if (!aggregated[key].recipeIds.includes(ing.recipe_id)) {
          aggregated[key].recipeIds.push(ing.recipe_id)
          aggregated[key].recipeNames.push(ing.recipes.name)
        }
      })

      // 5. Cancella vecchia lista
      const { error: deleteError } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)

      if (deleteError) throw deleteError

      // 6. Crea nuova lista
      const itemsToInsert = Object.values(aggregated).map(item => ({
        user_id: user.id,
        week_start_date: weekStartStr,
        ingredient_name: item.name,
        quantity: item.quantity.toString(),
        unit: item.unit,
        recipe_ids: item.recipeIds,
        is_purchased: false,
        is_deleted: false
      }))

      const { error: insertError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)

      if (insertError) throw insertError

      alert('Lista della spesa generata con successo! 🎉')
      await loadShoppingList()
    } catch (error) {
      console.error('Errore generazione lista:', error)
      alert('Errore durante la generazione della lista')
    } finally {
      setGenerating(false)
    }
  }

  const togglePurchased = async (itemId, currentState) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ is_purchased: !currentState })
        .eq('id', itemId)

      if (error) throw error

      // Aggiorna stato locale
      setShoppingItems(items =>
        items.map(item =>
          item.id === itemId
            ? { ...item, is_purchased: !currentState }
            : item
        )
      )
    } catch (error) {
      console.error('Errore toggle acquistato:', error)
    }
  }

  const deleteItem = async (itemId) => {
    if (!confirm('Vuoi eliminare questo articolo dalla lista?')) return

    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ is_deleted: true })
        .eq('id', itemId)

      if (error) throw error

      setShoppingItems(items => items.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Errore eliminazione:', error)
    }
  }

  const showRecipesForIngredient = async (item) => {
    setSelectedIngredient(item)

    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .in('id', item.recipe_ids)

      if (error) throw error
      setRecipesForIngredient(recipes || [])
      setShowRecipesModal(true)
    } catch (error) {
      console.error('Errore caricamento ricette:', error)
    }
  }

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      setShoppingItems(items =>
        items.map(item =>
          item.id === itemId
            ? { ...item, quantity: newQuantity }
            : item
        )
      )
    } catch (error) {
      console.error('Errore aggiornamento quantità:', error)
    }
  }

  const changeWeek = (direction) => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentWeekStart(newDate)
    setLoading(true)
  }

  const formatWeekRange = () => {
    if (!currentWeekStart) return ''
    const end = new Date(currentWeekStart)
    end.setDate(end.getDate() + 6)
    const options = { day: 'numeric', month: 'short' }
    return `${currentWeekStart.toLocaleDateString('it-IT', options)} - ${end.toLocaleDateString('it-IT', options)}`
  }

  const notPurchasedItems = shoppingItems.filter(item => !item.is_purchased)
  const purchasedItems = shoppingItems.filter(item => item.is_purchased)

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
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Lista della Spesa
          </h1>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeWeek(-1)}
              className="btn-secondary"
            >
              ← Settimana Precedente
            </button>
            
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {formatWeekRange()}
              </p>
            </div>
            
            <button
              onClick={() => changeWeek(1)}
              className="btn-secondary"
            >
              Settimana Successiva →
            </button>
          </div>

          {/* Genera Button */}
          {shoppingItems.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-4xl mb-4">🛒</p>
              <p className="text-lg text-gray-900 font-semibold mb-2">
                Nessuna lista per questa settimana
              </p>
              <p className="text-gray-600 mb-6">
                Genera automaticamente la lista della spesa dal tuo piano settimanale!
              </p>
              <button
                onClick={generateShoppingList}
                disabled={generating}
                className="btn-primary disabled:opacity-50"
              >
                {generating ? 'Generazione in corso...' : '✨ Genera Lista Spesa'}
              </button>
            </div>
          )}

          {shoppingItems.length > 0 && (
            <div className="flex space-x-3">
              <button
                onClick={generateShoppingList}
                disabled={generating}
                className="btn-primary disabled:opacity-50"
              >
                {generating ? 'Rigenerazione...' : '🔄 Rigenera Lista'}
              </button>
              <div className="flex-1" />
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-800">
                  <strong>{notPurchasedItems.length}</strong> da comprare • 
                  <strong className="ml-2">{purchasedItems.length}</strong> acquistati
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Lista Articoli */}
        {shoppingItems.length > 0 && (
          <div className="space-y-6">
            {/* Da Comprare */}
            {notPurchasedItems.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-2">📝</span>
                  Da Comprare ({notPurchasedItems.length})
                </h2>
                <div className="space-y-2">
                  {notPurchasedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => togglePurchased(item.id, item.is_purchased)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />

                      {/* Nome e Quantità */}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.ingredient_name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-600">{item.unit}</span>
                        </div>
                      </div>

                      {/* Info & Delete */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => showRecipesForIngredient(item)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50"
                        >
                          ℹ️ Info
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm px-2"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acquistati */}
            {purchasedItems.length > 0 && (
              <div className="card bg-gray-50">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-600">
                  <span className="text-2xl mr-2">✅</span>
                  Acquistati ({purchasedItems.length})
                </h2>
                <div className="space-y-2">
                  {purchasedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-300 bg-white"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => togglePurchased(item.id, item.is_purchased)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />

                      {/* Nome (barrato) */}
                      <div className="flex-1">
                        <p className="font-medium text-gray-500 line-through">
                          {item.ingredient_name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {item.quantity} {item.unit}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-600 hover:text-red-700 text-sm px-2"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Ricette per Ingrediente */}
      {showRecipesModal && selectedIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedIngredient.ingredient_name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedIngredient.quantity} {selectedIngredient.unit}
                  </p>
                </div>
                <button
                  onClick={() => setShowRecipesModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Ricette */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Questo ingrediente è usato in:
              </p>
              <div className="space-y-3">
                {recipesForIngredient.map(recipe => (
                  <div
                    key={recipe.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {recipe.name}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {recipe.category} • {recipe.servings} porzioni
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t">
              <button
                onClick={() => setShowRecipesModal(false)}
                className="btn-secondary w-full"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}