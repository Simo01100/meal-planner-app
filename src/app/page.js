export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🍽️ Meal Planner
        </h1>
        <p className="text-gray-600 mb-8">
          Pianifica i tuoi pasti settimanali e genera la lista della spesa
        </p>
        <a 
          href="/auth/login"
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
        >
          Inizia Ora
        </a>
      </div>
    </main>
  )
}