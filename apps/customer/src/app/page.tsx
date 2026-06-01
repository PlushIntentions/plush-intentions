'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Clock, Star } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-plush-gradient flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-white w-7 h-7" />
          <span className="text-white font-display text-2xl font-bold tracking-tight">Plush Intentions</span>
        </div>
        <button onClick={() => router.push('/auth/login')} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
          Already applied? Sign In
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4" /> Now Hiring Cleaning Technicians
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
            Join the<br />Plush Intentions<br />Team
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Build a rewarding career with flexible scheduling, competitive pay, and a team that values your expertise. Apply in minutes.
          </p>
          <button onClick={() => router.push('/onboarding')} className="bg-white text-plush-700 px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-plush-500/30 hover:-translate-y-1 transition-all duration-300">
            Apply Now — It's Free
          </button>
        </motion.div>

        {/* Feature pills */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mt-16">
          {[
            { icon: Clock,  label: 'Flexible Scheduling' },
            { icon: Shield, label: 'Background Checked' },
            { icon: Star,   label: 'Competitive Pay' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white/15 text-white px-5 py-3 rounded-full text-sm font-medium backdrop-blur-sm">
              <Icon className="w-4 h-4" /> {label}
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="text-center py-6 text-white/50 text-sm">
        © {new Date().getFullYear()} Plush Intentions · All Rights Reserved
      </footer>
    </div>
  )
}
