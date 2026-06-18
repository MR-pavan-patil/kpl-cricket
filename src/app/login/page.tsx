'use client'

import { useActionState, startTransition } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { Trophy, Mail, Lock, ShieldAlert } from 'lucide-react'

const initialState = {
  error: null as string | null,
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-wider text-slate-900 mb-6 group">
          <Trophy className="h-8 w-8 text-blue-650 group-hover:rotate-12 transition-transform duration-300" />
          <span>KPL <span className="text-blue-650 font-black">CRICKET</span></span>
        </Link>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h2>
        <p className="mt-2 text-xs text-slate-500 font-medium">
          Sign in to manage teams, rosters, and matches.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-150 shadow-md hover:border-blue-500/20 transition-all duration-350">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {state?.error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/60 flex items-start gap-2.5 text-rose-800 text-xs font-semibold animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="leading-5">{state.error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@kplcricket.com"
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600 transition-all text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? 'Verifying Credentials...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link href="/" className="text-xs text-slate-450 hover:text-slate-800 transition-colors font-bold">
              &larr; Back to Public Tournament Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
