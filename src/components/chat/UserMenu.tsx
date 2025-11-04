'use client'
import clsx from 'clsx'
import { User as UserIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [username, setUsername] = useState('User')
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const handleLogout = () => {
    // bersihkan token
    localStorage.removeItem('token')
    // bersihkan cookie flag supaya middleware blokir route private
    document.cookie = 'tsat_auth=; Max-Age=0; Path=/; SameSite=Lax'
    router.replace('/login')
  }

  return (
    <div className="fixed right-4 top-4 md:right-6 md:top-5 z-20">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
        className={clsx(
          'flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-2.5',
          'shadow-soft hover:shadow-md transition cursor-pointer'
        )}
      >
        <span className="h-8 w-8 rounded-full overflow-hidden grid place-items-center">
          {logoError ? (
            <UserIcon className="h-5 w-5 text-slate-600" />
          ) : (
            <Image
              src="/user_logo.png"
              alt="User"
              width={32}
              height={32}
              className="h-full w-full object-cover"
              onError={() => setLogoError(true)}
              priority
            />
          )}
        </span>
      </button>

      {/* {open && (
        <div
          ref={popRef}
          role="menu"
          className="mt-2 w-40 rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg p-1 fixed top-16 right-4"
        >
          <div className="px-3 py-2 text-sm font-semibold text-slate-800">
            {username}
          </div>

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer bg-red-400"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      )} */}
    </div>
  )
}
