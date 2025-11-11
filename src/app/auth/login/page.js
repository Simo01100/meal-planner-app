'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Login riuscito, vai alla dashboard
      router.push('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Accedi</h1>
        <p className="text-gray-600 text-center mb-8">
          Benvenuto di nuovo! 👋
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Campo Email */}
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

          {/* Campo Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Messaggio errore */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Button Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        {/* Link registrazione */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Non hai un account?{' '}
          <a href="/auth/signup" className="text-green-600 hover:underline">
            Registrati
          </a>
        </p>
      </div>
    </main>
  )
}