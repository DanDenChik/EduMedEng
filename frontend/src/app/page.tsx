import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex mx-24">
      <div className="container mx-auto px-4 py-8 flex flex-center flex-col w-3/5 mt-9">
        <h1 className="text-4xl font-bold mb-4 mt-12">Welcome to <span className='text-blue-600'>EduMed</span> — a medical diagnosis simulator</h1>
        <p className="mb-4">Practice your medical diagnostic skills with our interactive simulations</p>
        <Link href="/game" className="bg-blue-500 mt-24 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-2/5 text-center">
          Start Simulation
        </Link>
      </div>
      <img
          className="mx-auto h-128 w-2/5"
          src="/hero.png"
          alt="Hero"
      />
    </div>
  )
}