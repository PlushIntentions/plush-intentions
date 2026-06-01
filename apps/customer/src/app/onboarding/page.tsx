'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Sparkles, User, MapPin, Briefcase, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

const SKILLS_LIST = [
  'Residential Cleaning','Commercial Cleaning','Deep Cleaning',
  'Carpet Cleaning','Window Cleaning','Upholstery Cleaning',
  'Pressure Washing','Green / Eco-Friendly Products',
  'Pet-Friendly Techniques','Post-Construction Cleanup',
  'Move-In / Move-Out','Organization',
]

// Step schemas
const accountSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Valid phone number required'),
})

const addressSchema = z.object({
  address: z.string().min(3, 'Street address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  zip: z.string().min(5, 'ZIP code required'),
})

const professionalSchema = z.object({
  years_experience: z.coerce.number().min(0).max(50),
  bio: z.string().min(20, 'Please tell us a bit more about yourself (min 20 characters)'),
})

const STEPS = [
  { id: 'account',      label: 'Account',      icon: User,      title: 'Create Your Account',      subtitle: 'Start your Plush Intentions journey' },
  { id: 'address',      label: 'Address',       icon: MapPin,    title: 'Your Service Area',         subtitle: 'Where will you be working from?' },
  { id: 'professional', label: 'Experience',    icon: Briefcase, title: 'Professional Background',   subtitle: 'Tell us about your skills and experience' },
  { id: 'review',       label: 'Review',        icon: CheckCircle2, title: 'Review & Submit',        subtitle: 'Confirm your application details' },
]

type AccountData    = z.infer<typeof accountSchema>
type AddressData    = z.infer<typeof addressSchema>
type ProfessionalData = z.infer<typeof professionalSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]               = useState(0)
  const [selectedSkills, setSkills]   = useState<string[]>([])
  const [selectedCerts, setCerts]     = useState<string[]>([])
  const [certInput, setCertInput]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const [accountData, setAccountData]         = useState<AccountData | null>(null)
  const [addressData, setAddressData]         = useState<AddressData | null>(null)
  const [professionalData, setProfData]       = useState<ProfessionalData | null>(null)

  const accountForm = useForm<AccountData>({ resolver: zodResolver(accountSchema) })
  const addressForm = useForm<AddressData>({ resolver: zodResolver(addressSchema) })
  const proForm     = useForm<ProfessionalData>({ resolver: zodResolver(professionalSchema), defaultValues: { years_experience: 0 } })

  const toggleSkill = (s: string) =>
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const addCert = () => {
    if (certInput.trim() && !selectedCerts.includes(certInput.trim())) {
      setCerts(prev => [...prev, certInput.trim()])
      setCertInput('')
    }
  }

  const handleAccountSubmit = (data: AccountData) => { setAccountData(data); setStep(1) }
  const handleAddressSubmit = (data: AddressData) => { setAddressData(data); setStep(2) }
  const handleProSubmit     = (data: ProfessionalData) => { setProfData(data); setStep(3) }

  const handleFinalSubmit = async () => {
    if (!accountData || !addressData || !professionalData) return
    setSubmitting(true)
    setError(null)
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: { data: { full_name: accountData.full_name, role: 'technician' } },
      })
      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Account creation failed')

      // 2. Call DB function — creates pending technician + notifies admins
      const { error: rpcError } = await supabase.rpc('create_pending_technician', {
        p_user_id:   authData.user.id,
        p_full_name: accountData.full_name,
        p_email:     accountData.email,
        p_phone:     accountData.phone,
        p_address:   addressData.address,
        p_city:      addressData.city,
        p_state:     addressData.state,
        p_zip:       addressData.zip,
        p_skills:    selectedSkills,
        p_certs:     selectedCerts,
        p_years:     professionalData.years_experience,
        p_bio:       professionalData.bio,
      })
      if (rpcError) throw rpcError

      router.push('/onboarding/success')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-plush-subtle">
      {/* Top bar */}
      <header className="bg-plush-gradient px-6 py-4 flex items-center gap-3">
        <Sparkles className="text-white w-6 h-6" />
        <span className="text-white font-display text-xl font-bold">Plush Intentions</span>
        <span className="text-white/60 text-sm ml-auto">Technician Application</span>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-4">
          {/* Step dots */}
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isCompleted = i < step
              const isCurrent   = i === step
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted ? 'bg-plush-500 text-white' :
                    isCurrent   ? 'bg-plush-gradient text-white shadow-lg shadow-plush-300' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-plush-600' : 'text-gray-400'}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-plush-gradient rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </div>

      {/* Form content */}
      <main className="max-w-2xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          {/* ── STEP 0: Account ── */}
          {step === 0 && (
            <motion.div key="account" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <div className="card">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">{STEPS[0].title}</h2>
                <p className="text-gray-500 mb-6">{STEPS[0].subtitle}</p>
                <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input {...accountForm.register('full_name')} className="input-field" placeholder="Jane Smith" />
                    {accountForm.formState.errors.full_name && <p className="text-red-500 text-xs mt-1">{accountForm.formState.errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input {...accountForm.register('email')} type="email" className="input-field" placeholder="jane@example.com" />
                    {accountForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{accountForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                    <input {...accountForm.register('phone')} type="tel" className="input-field" placeholder="(555) 000-0000" />
                    {accountForm.formState.errors.phone && <p className="text-red-500 text-xs mt-1">{accountForm.formState.errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                    <input {...accountForm.register('password')} type="password" className="input-field" placeholder="Minimum 8 characters" />
                    {accountForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{accountForm.formState.errors.password.message}</p>}
                  </div>
                  <button type="submit" className="btn-primary w-full mt-2">
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Address ── */}
          {step === 1 && (
            <motion.div key="address" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <div className="card">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">{STEPS[1].title}</h2>
                <p className="text-gray-500 mb-6">{STEPS[1].subtitle}</p>
                <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Street Address *</label>
                    <input {...addressForm.register('address')} className="input-field" placeholder="123 Main Street" />
                    {addressForm.formState.errors.address && <p className="text-red-500 text-xs mt-1">{addressForm.formState.errors.address.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                      <input {...addressForm.register('city')} className="input-field" placeholder="Cleveland" />
                      {addressForm.formState.errors.city && <p className="text-red-500 text-xs mt-1">{addressForm.formState.errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">State *</label>
                      <input {...addressForm.register('state')} className="input-field" placeholder="OH" maxLength={2} />
                      {addressForm.formState.errors.state && <p className="text-red-500 text-xs mt-1">{addressForm.formState.errors.state.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ZIP Code *</label>
                    <input {...addressForm.register('zip')} className="input-field" placeholder="44052" maxLength={10} />
                    {addressForm.formState.errors.zip && <p className="text-red-500 text-xs mt-1">{addressForm.formState.errors.zip.message}</p>}
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Professional ── */}
          {step === 2 && (
            <motion.div key="professional" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <div className="card">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">{STEPS[2].title}</h2>
                <p className="text-gray-500 mb-6">{STEPS[2].subtitle}</p>
                <form onSubmit={proForm.handleSubmit(handleProSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Years of Experience</label>
                    <input {...proForm.register('years_experience')} type="number" min={0} max={50} className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Skills <span className="text-gray-400 font-normal">(select all that apply)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {SKILLS_LIST.map(skill => (
                        <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                            selectedSkills.includes(skill)
                              ? 'bg-plush-500 border-plush-500 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-plush-300'
                          }`}>
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Certifications <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex gap-2 mb-2">
                      <input value={certInput} onChange={e => setCertInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCert())}
                        className="input-field flex-1" placeholder="e.g. ISSA Cleaning Technician" />
                      <button type="button" onClick={addCert} className="btn-secondary px-4 py-2">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCerts.map(c => (
                        <span key={c} className="flex items-center gap-1 bg-plush-50 text-plush-700 px-3 py-1 rounded-full text-sm">
                          {c}
                          <button type="button" onClick={() => setCerts(p => p.filter(x => x !== c))} className="text-plush-400 hover:text-plush-700 ml-1">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">About You *</label>
                    <textarea {...proForm.register('bio')} rows={4} className="input-field resize-none"
                      placeholder="Tell us about your cleaning experience, your approach, and why you want to join Plush Intentions..." />
                    {proForm.formState.errors.bio && <p className="text-red-500 text-xs mt-1">{proForm.formState.errors.bio.message}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                      Review Application <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && accountData && addressData && professionalData && (
            <motion.div key="review" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <div className="card">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">{STEPS[3].title}</h2>
                <p className="text-gray-500 mb-6">{STEPS[3].subtitle}</p>

                {/* Summary sections */}
                <div className="space-y-4 mb-6">
                  <ReviewSection title="Personal Information" onEdit={() => setStep(0)}>
                    <ReviewRow label="Name"  value={accountData.full_name} />
                    <ReviewRow label="Email" value={accountData.email} />
                    <ReviewRow label="Phone" value={accountData.phone} />
                  </ReviewSection>
                  <ReviewSection title="Service Area" onEdit={() => setStep(1)}>
                    <ReviewRow label="Address" value={`${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.zip}`} />
                  </ReviewSection>
                  <ReviewSection title="Professional Background" onEdit={() => setStep(2)}>
                    <ReviewRow label="Experience" value={`${professionalData.years_experience} year${professionalData.years_experience !== 1 ? 's' : ''}`} />
                    <ReviewRow label="Skills" value={selectedSkills.length > 0 ? selectedSkills.join(', ') : 'None selected'} />
                    {selectedCerts.length > 0 && <ReviewRow label="Certifications" value={selectedCerts.join(', ')} />}
                    <ReviewRow label="About" value={professionalData.bio} />
                  </ReviewSection>
                </div>

                <div className="bg-plush-50 border border-plush-100 rounded-xl p-4 mb-6">
                  <p className="text-sm text-plush-800">
                    By submitting, your application will be reviewed by our admin team. You'll receive an email once a decision has been made. This typically takes 1–3 business days.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </button>
                  <button onClick={handleFinalSubmit} disabled={submitting} className="btn-primary flex-1">
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit Application'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function ReviewSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <button onClick={onEdit} className="text-plush-600 text-sm font-medium hover:underline">Edit</button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-gray-500 min-w-[100px]">{label}:</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}
