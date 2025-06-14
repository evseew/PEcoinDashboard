import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Страница не найдена</h2>
        <p className="text-gray-400 mb-8">Извините, запрашиваемая страница не существует.</p>
        <Link 
          href="/"
          className="bg-gradient-to-r from-lime-400 to-green-400 hover:from-lime-300 hover:to-green-300 text-black font-bold px-6 py-3 rounded-full transition-all duration-300"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  )
} 