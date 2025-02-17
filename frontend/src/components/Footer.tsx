import Link from 'next/link'

export default function Footer() {
  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">EduMed</Link>
        <div>
          <Link href="/login" className="mr-4">Login</Link>
          <Link href="/register" className="mr-4">Register</Link>
          <Link href="/profile">Profile</Link>
        </div>
      </nav>
    </header>
  )
}