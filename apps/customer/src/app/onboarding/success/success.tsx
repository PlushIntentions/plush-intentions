'use client'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Mail, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-plush-gradient flex flex-col">
      <header className="flex items-center gap-2 px-8 py-6">
        <Sparkles className="text-white w-6 h-6" />
        <span className="text-white font-display text-xl font-bold">Plush Intentions</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-plush-gradient flex items-center justify-center shadow-lg shadow-plush-300">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-3">Application Received!</h1>
          <p className="text-gray-500 mb-8">
            Thank you for applying to join the Plush Intentions team. Your application is now under review.
          </p>
          <div className="space-y-3 mb-8">
            {[
              { icon: Clock, text: 'Review typically takes 1–3 business days' },
              { icon: Mail,  text: "You'll receive an email once a decision is made" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-plush-50 rounded-xl p-3">
                <Icon className="w-5 h-5 text-plush-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>
          <Link href="/" className="btn-primary w-full block">Back to Home</Link>
        </motion.div>
      </main>
    </div>
  )
}
