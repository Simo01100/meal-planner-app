'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function MealPlanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mealPlan, setMealPlan] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [currentWeekStart, setCurrentWeekStart] = useState(null)
  
  // Modal selezione ricetta
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState({ day: '', meal: '' })
  const [filteredRecipes, setFilteredRecipes] = useState([])

  // Modal creazione ricetta
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: 'pranzo',
    servings: 2
  })
  const [newIngredients, setNewIngredients] = useState([
    { name: '', quantity: '', unit: '' }
  ])
  const [creatingRecipe, setCreatingRecipe] = useState(false)

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const daysLabels = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  const meals = ['breakfast', 'lunch', 'dinner']
  const mealsLabels = { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena' }
  const mealsCategories = { breakfast: 'colazione', lunch: 'pranzo', dinner: 'cena' }

  useEffect(() => {
    initWeek()
    loadRecipes()
  }, [])

  useEffect(() => {
    if (currentWeekStart) {
      loadMealPlan()
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

  const loadRecipes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error('Errore caricamento ricette:', error)
    }
  }

  const loadMealPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const weekStartStr = currentWeekStart.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setMealPlan(data)
    } catch (error) {
      console.error('Errore caricamento piano:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = (day, meal) => {
    const slotKey = `${day}_${meal}`
    const assignedRecipeId = mealPlan?.[slotKey]

    if (assignedRecipeId) {
      if (confirm('Vuoi rimuovere questa ricetta dal piano?')) {
        handleRemoveRecipe(day, meal)
      }
      return
    }

    setSelectedSlot({ day, meal })
    const category = mealsCategories[meal]
    const filtered = recipes.filter(r => r.category === category)
    setFilteredRecipes(filtered)
    setShowSelectModal(true)
  }

  const handleAssignRecipe = async (recipeId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const weekStartStr = currentWeekStart.toISOString().split('T')[0]
      const slotKey = `${selectedSlot.day}_${selectedSlot.meal}`

      if (mealPlan) {
        const { error } = await supabase
          .from('meal_plans')
          .update({ [slotKey]: recipeId })
          .eq('id', mealPlan.id)

        if (error) throw error
        setMealPlan({ ...mealPlan, [slotKey]: recipeId })
      } else {
        const { data, error } = await supabase
          .from('meal_plans')
          .insert({
            user_id: user.id,
            week_start_date: weekStartStr,
            [slotKey]: recipeId
          })
          .select()
          .single()

        if (error) throw error
        setMealPlan(data)
      }

      setShowSelectModal(false)
    } catch (error) {
      console.error('Errore assegnazione ricetta:', error)
      alert('Errore durante l\'assegnazione')
    }
  }

  const handleRemoveRecipe = async (day, meal) => {
    try {
      const slotKey = `${day}_${meal}`
      const { error } = await supabase
        .from('meal_plans')
        .update({ [slotKey]: null })
        .eq('id', mealPlan.id)

      if (error) throw error
      setMealPlan({ ...mealPlan, [slotKey]: null })
    } catch (error) {
      console.error('Errore rimozione ricetta:', error)
    }
  }

  // NUOVE FUNZIONI PER CREAZIONE RICETTA

  const handleOpenCreateModal = () => {
    // Imposta categoria automaticamente in base al pasto selezionato
    const category = mealsCategories[selectedSlot.meal]
    setNewRecipe({
      name: '',
      category: category,
      servings: 2
    })
    setNewIngredients([{ name: '', quantity: '', unit: '' }])
    setShowSelectModal(false)
    setShowCreateModal(true)
  }

  const handleAddIngredient = () => {
    setNewIngredients([...newIngredients, { name: '', quantity: '', unit: '' }])
  }

  const handleRemoveIngredient = (index) => {
    if (newIngredients.length > 1) {
      setNewIngredients(newIngredients.filter((_, i) => i !== index))
    }
  }

  const handleIngredientChange = (index, field, value) => {
    const updated = [...newIngredients]
    updated[index][field] = value
    setNewIngredients(updated)
  }

  const handleCreateAndAssign = async (e) => {
    e.preventDefault()
    setCreatingRecipe(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Crea la ricetta
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name: newRecipe.name,
          category: newRecipe.category,
          servings: parseInt(newRecipe.servings)
        })
        .select()
        .single()

      if (recipeError) throw recipeError

      // 2. Crea gli ingredienti
      const validIngredients = newIngredients.filter(ing => ing.name.trim() !== '')
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

      // 3. Aggiorna lista ricette locale
      setRecipes([...recipes, recipe])

      // 4. Assegna automaticamente al piano
      await handleAssignRecipe(recipe.id)

      // 5. Chiudi modal
      setShowCreateModal(false)
      alert('Ricetta creata e assegnata! 🎉')
    } catch (error) {
      console.error('Errore creazione ricetta:', error)
      alert('Errore durante la creazione')
    } finally {
      setCreatingRecipe(false)
    }
  }

  const changeWeek = (direction) => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentWeekStart(newDate)
    setLoading(true)
  }

  const getRecipeById = (recipeId) => {
    return recipes.find(r => r.id === recipeId)
  }

  const formatWeekRange = () => {
    if (!currentWeekStart) return ''
    const end = new Date(currentWeekStart)
    end.setDate(end.getDate() + 6)
    const options = { day: 'numeric', month: 'short' }
    return `${currentWeekStart.toLocaleDateString('it-IT', options)} - ${end.toLocaleDateString('it-IT', options)}`
  }

  const getMealIcon = (meal) => {
    switch(meal) {
      case 'breakfast': return '🥐'
      case 'lunch': return '🍝'
      case 'dinner': return '🍲'
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

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Piano Settimanale
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

          {/* Legenda */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Suggerimento:</strong> Clicca su uno slot vuoto per assegnare una ricetta, 
              o su uno slot pieno per rimuoverla.
            </p>
          </div>
        </div>

        {/* Griglia Piano Settimanale */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
                    Pasto
                  </th>
                  {daysLabels.map((day, index) => (
                    <th key={index} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {meals.map((meal) => (
                  <tr key={meal} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <span>{getMealIcon(meal)}</span>
                        <span>{mealsLabels[meal]}</span>
                      </div>
                    </td>
                    
                    {daysOfWeek.map((day) => {
                      const slotKey = `${day}_${meal}`
                      const recipeId = mealPlan?.[slotKey]
                      const recipe = recipeId ? getRecipeById(recipeId) : null

                      return (
                        <td key={day} className="px-2 py-2">
                          <button
                            onClick={() => handleSlotClick(day, meal)}
                            className={`w-full h-20 rounded-lg border-2 border-dashed transition ${
                              recipe
                                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            {recipe ? (
                              <div className="text-center px-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {recipe.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {recipe.servings} porz.
                                </p>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400">
                                <p className="text-2xl">+</p>
                              </div>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistiche */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Pasti Pianificati</p>
            <p className="text-2xl font-bold text-gray-900">
              {mealPlan ? Object.values(mealPlan).filter(v => v && typeof v === 'string' && v.length === 36).length : 0} / 21
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Ricette Disponibili</p>
            <p className="text-2xl font-bold text-gray-900">
              {recipes.length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Completamento</p>
            <p className="text-2xl font-bold text-gray-900">
              {mealPlan ? Math.round((Object.values(mealPlan).filter(v => v && typeof v === 'string' && v.length === 36).length / 21) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* MODAL 1: Selezione Ricetta Esistente */}
      {showSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Seleziona Ricetta per {mealsLabels[selectedSlot.meal]}
                </h2>
                <button
                  onClick={() => setShowSelectModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-4">📖</p>
                  <p className="text-gray-500 mb-2">
                    Nessuna ricetta disponibile per {mealsLabels[selectedSlot.meal]}
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    Crea una nuova ricetta e aggiungila automaticamente al piano!
                  </p>
                  <button
                    onClick={handleOpenCreateModal}
                    className="btn-primary"
                  >
                    ➕ Crea Nuova Ricetta
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleAssignRecipe(recipe.id)}
                        className="card text-left hover:shadow-lg transition border-2 border-transparent hover:border-green-500"
                      >
                        <h3 className="font-semibold text-lg mb-2">
                          {recipe.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          👥 {recipe.servings} porzioni
                        </p>
                      </button>
                    ))}
                  </div>
                  
                  {/* Bottone per creare nuova anche se ci sono ricette */}
                  <div className="mt-6 pt-6 border-t text-center">
                    <button
                      onClick={handleOpenCreateModal}
                      className="text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                      ➕ Oppure crea una nuova ricetta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Creazione Nuova Ricetta */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Crea Nuova Ricetta per {mealsLabels[selectedSlot.meal]}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowSelectModal(true)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAndAssign} className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {/* Nome */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Ricetta *
                </label>
                <input
                  type="text"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                  className="input-field"
                  placeholder="Es: Pasta al Pomodoro"
                  required
                />
              </div>

              {/* Categoria (readonly) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={newRecipe.category}
                  className="input-field bg-gray-100 capitalize"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Categoria impostata automaticamente in base al pasto selezionato
                </p>
              </div>

              {/* Porzioni */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero Porzioni *
                </label>
                <input
                  type="number"
                  value={newRecipe.servings}
                  onChange={(e) => setNewRecipe({ ...newRecipe, servings: e.target.value })}
                  className="input-field"
                  min="1"
                  max="20"
                  required
                />
              </div>

              {/* Ingredienti */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Ingredienti
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    + Aggiungi
                  </button>
                </div>

                <div className="space-y-2">
                  {newIngredients.map((ingredient, index) => (
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
                        placeholder="Qtà"
                        className="input-field w-20"
                      />
                      <input
                        type="text"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                        placeholder="Unità"
                        className="input-field w-20"
                      />
                      {newIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="text-red-600 hover:text-red-700 px-2"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowSelectModal(true)
                  }}
                  className="btn-secondary flex-1"
                  disabled={creatingRecipe}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 disabled:opacity-50"
                  disabled={creatingRecipe}
                >
                  {creatingRecipe ? 'Creazione...' : 'Crea e Assegna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}