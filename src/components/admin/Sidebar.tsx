'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import {
  Trophy,
  LayoutDashboard,
  Users,
  User,
  Calendar,
  LogOut,
  Globe,
  Menu,
  X,
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Manage Teams', path: '/admin/teams', icon: Users },
    { name: 'Manage Players', path: '/admin/players', icon: User },
    { name: 'Manage Matches', path: '/admin/matches', icon: Calendar },
  ]

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(path)
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-150 text-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-150">
        <Trophy className="h-6 w-6 text-blue-650" />
        <span className="font-black text-lg tracking-wider text-slate-900">
          KPL <span className="text-blue-600 font-black">ADMIN</span>
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-150 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <Globe className="h-4 w-4 text-slate-400" />
          View Website
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-left cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:block w-64 flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-slate-150 text-slate-900 w-full sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-blue-650" />
          <span className="font-black tracking-wider text-slate-900">KPL ADMIN</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar (Drawer Overlay) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
