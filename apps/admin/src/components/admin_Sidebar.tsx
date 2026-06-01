'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Sparkles, LayoutDashboard, Users, Clipboard,
  Map, LogOut, Bell
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/technicians', label: 'Technicians',  icon: Users },
  { href: '/work-orders', label: 'Work Orders',  icon: Clipboard },
  { href: '/map',         label: 'Live Map',     icon: Map },
]

export default function Sidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-8 h-8 rounded-lg bg-plush-gradient flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-gray-900 text-lg">Plush Intentions</span>
        </div>
        <p className="text-xs text-gray-400 ml-10">Admin Control Center</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`nav-link ${isActive
                ? 'bg-plush-50 text-plush-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Admin profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-plush-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {adminName?.charAt(0) ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{adminName}</p>
            <p className="text-xs text-plush-500 font-medium">Administrator</p>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  )
}
