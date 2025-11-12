import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { recipeName, category } = await request.json()

    if (!recipeName) {
      return NextResponse.json(
        { error: 'Nome ricetta mancante' },
        { status: 400 }
      )
    }

    // Chiamata a Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Modello potente e veloce
        messages: [
          {
            role: 'system',
            content: `Sei un assistente esperto di cucina italiana. 
Dato il nome di una ricetta, genera una lista realistica di ingredienti con quantità appropriate per 2-4 porzioni.
Rispondi SOLO con un array JSON, nessun testo aggiuntivo.
Formato richiesto:
[
  {"name": "Nome ingrediente", "quantity": "200", "unit": "g"},
  {"name": "Altro ingrediente", "quantity": "2", "unit": "pz"}
]

Regole:
- Usa unità italiane (g, kg, ml, l, pz, qb)
- Quantità realistiche per ricette casalinghe
- Ingredienti essenziali e comuni
- Massimo 10 ingredienti
- Nome ingrediente in minuscolo
- Se la categoria è "colazione", genera ingredienti da colazione
- Se la categoria è "pranzo" o "cena", ingredienti per pasti principali`
          },
          {
            role: 'user',
            content: `Genera ingredienti per: ${recipeName}${category ? ` (categoria: ${category})` : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // Parse JSON dalla risposta
    let ingredients
    try {
      // Rimuovi eventuali backticks o testo extra
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        ingredients = JSON.parse(jsonMatch[0])
      } else {
        ingredients = JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('Parse error:', aiResponse)
      throw new Error('Risposta AI non valida')
    }

    // Valida struttura
    if (!Array.isArray(ingredients)) {
      throw new Error('Formato risposta non valido')
    }

    // Aggiungi campo selected (tutti selezionati di default)
    const formattedIngredients = ingredients.map(ing => ({
      name: ing.name || '',
      quantity: ing.quantity?.toString() || '',
      unit: ing.unit || '',
      selected: true // Tutti selezionati di default
    }))

    return NextResponse.json({
      success: true,
      ingredients: formattedIngredients
    })

  } catch (error) {
    console.error('Error generating ingredients:', error)
    return NextResponse.json(
      { error: 'Errore durante la generazione degli ingredienti', details: error.message },
      { status: 500 }
    )
  }
}
