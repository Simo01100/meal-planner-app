'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) throw error

      // Signup riuscito
      alert('Registrazione completata! Controlla la tua email per confermare.')
      router.push('/auth/login')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Registrati</h1>
        <p className="text-gray-600 text-center mb-8">
          Crea il tuo account gratuito 🎉
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Nome completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              placeholder="Mario Rossi"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tua@email.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Minimo 6 caratteri"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Registrazione...' : 'Crea Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Hai già un account?{' '}
          <a href="/auth/login" className="text-green-600 hover:underline">
            Accedi
          </a>
        </p>
      </div>
    </main>
  )
}