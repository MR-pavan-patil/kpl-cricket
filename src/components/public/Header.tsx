'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Trophy, ShieldAlert, ChevronDown, Home, Users, Calendar, Award, BarChart3, Sparkles } from 'lucide-react'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSeason = searchParams.get('season') || '2'
  const activeTabParam = searchParams.get('tab') || 'overview'

  const handleSeasonChange = (s: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('season', s)
    router.push(`${pathname}?${params.toString()}`)
  }

  const navLinks = [
    { name: 'Home', tab: 'overview', path: '/', href: `/?tab=overview&season=${currentSeason}` },
    { name: 'Teams & Squads', tab: 'teams', path: '/teams', href: `/?tab=teams&season=${currentSeason}` },
    { name: 'Schedule', tab: 'fixtures', path: '/schedule', href: `/?tab=fixtures&season=${currentSeason}` },
    { name: 'Standings & Stats', tab: 'standings', path: '/stats', href: `/?tab=standings&season=${currentSeason}` },
    { name: 'Knockout Bracket', tab: 'bracket', path: '/bracket', href: `/?tab=bracket&season=${currentSeason}` },
  ]

  const mobileNavItems = [
    { name: 'Home', tab: 'overview', path: '/', href: `/?tab=overview&season=${currentSeason}`, icon: Home },
    { name: 'Teams', tab: 'teams', path: '/teams', href: `/?tab=teams&season=${currentSeason}`, icon: Users },
    { name: 'Schedule', tab: 'fixtures', path: '/schedule', href: `/?tab=fixtures&season=${currentSeason}`, icon: Calendar },
    { name: 'Standings', tab: 'standings', path: '/stats', href: `/?tab=standings&season=${currentSeason}`, icon: Trophy },
    { name: 'Knockout', tab: 'bracket', path: '/bracket', href: `/?tab=bracket&season=${currentSeason}`, icon: Award },
  ]

  const isLinkActive = (item: { tab: string; path: string }) => {
    if (pathname === '/') {
      return activeTabParam === item.tab
    }
    return pathname.startsWith(item.path)
  }

  return (
    <>
      {/* Top Desktop & Mobile Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Season Selector */}
            <div className="flex items-center gap-3">
              <Link href={`/?tab=overview&season=${currentSeason}`} className="flex items-center gap-2 text-xl font-extrabold text-gray-900 group">
                <Trophy className="h-6 w-6 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
                <span className="tracking-tight">
                  KPL <span className="text-blue-600">CRICKET</span>
                </span>
              </Link>

              {/* Season Selector Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={currentSeason}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="appearance-none bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold px-3 py-1 pr-6 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="2">Season 2 (Active) 🔥</option>
                  <option value="1">Season 1 (Archive) 🏆</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-blue-600 absolute right-2 pointer-events-none" />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const active = isLinkActive(link)
                return (
                  <Link
                    key={link.tab}
                    href={link.href}
                    className={`text-sm font-semibold transition-all relative py-1.5 ${
                      active
                        ? 'text-blue-600 font-bold'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    {link.name}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </Link>
                )
              })}
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
              >
                <ShieldAlert className="h-4 w-4 text-blue-400" />
                Admin Portal
              </Link>
            </nav>

            {/* Mobile Admin Link Button */}
            <div className="md:hidden flex items-center">
              <Link
                href="/admin"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold shadow-sm"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Fixed Mobile Bottom Navigation Bar (Ultra fast client tab switching) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-1 px-2 flex justify-around items-center">
        {mobileNavItems.map((item) => {
          const IconComponent = item.icon
          const active = isLinkActive(item)
          return (
            <Link
              key={item.tab}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 transition-all ${
                active ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {/* Top active indicator line */}
              {active && (
                <span className="absolute -top-1 w-8 h-1 bg-blue-600 rounded-b-full shadow-sm" />
              )}
              <IconComponent className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-blue-600' : 'text-gray-500'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
