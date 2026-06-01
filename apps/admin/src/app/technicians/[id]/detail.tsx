'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import {
  CheckCircle2, XCircle, ChevronLeft, User, Phone, MapPin,
  Briefcase, Star, FileText, Loader2, AlertTriangle, Clock, Clipboard
} from 'lucide-react'
import type { Technician, WorkOrder } from '@/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/types'

export default function TechnicianDetailPage() {
  const { id }                          = useParams<{ id: string }>()
  const router                          = useRouter()
  const [adminName, setAdminName]       = useState('Admin')
  const [tech, setTech]                 = useState<Technician | null>(null)
  const [workOrders, setWorkOrders]     = useState<WorkOrder[]>([])
  const [adminNotes, setAdminNotes]     = useState('')
  const [loading, setLoading]           = useState(true)
  const [processing, setProcessing]     = useState<'approving' | 'denying' | null>(null)
  const [successMsg, setSuccessMsg]     = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (p?.full_name) setAdminName(p.full_name)
    }

    const [{ data: techData }, { data: orders }] = await Promise.all([
      supabase.from('technicians').select('*').eq('id', id).single(),
      supabase.from('work_orders').select('*').eq('assigned_tech_id', id).order('created_at', { ascending: false }),
    ])

    if (techData) { setTech(techData); setAdminNotes(techData.admin_notes ?? '') }
    if (orders)   setWorkOrders(orders)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDecision = async (decision: 'approved' | 'denied') => {
    if (!tech) return
    setProcessing(decision === 'approved' ? 'approving' : 'denying')
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('technicians').update({
        status:       decision,
        admin_notes:  adminNotes,
        reviewed_by:  user?.id,
        reviewed_at:  new Date().toISOString(),
      }).eq('id', tech.id)

      if (error) throw error

      // Notify the technician
      await supabase.from('notifications').insert({
        user_id: tech.user_id,
        title: decision === 'approved'
          ? '🎉 Application Approved!'
          : '📋 Application Update',
        message: decision === 'approved'
          ? 'Congratulations! Your Plush Intentions technician application has been approved. Welcome to the team!'
          : 'Thank you for your interest. After careful review, we are unable to approve your application at this time.',
        type: decision === 'approved' ? 'approval' : 'denial',
        link: '/dashboard',
      })

      // Update profile role if approved
      if (decision === 'approved') {
        await supabase.from('profiles').update({ role: 'technician' }).eq('id', tech.user_id)
      }

      setSuccessMsg(decision === 'approved'
        ? `${tech.full_name} has been approved as a Plush Intentions technician.`
        : `${tech.full_name}'s application has been denied.`)
      await fetchData()
    } finally {
      setProcessing(null)
    }
  }

  const saveNotes = async () => {
    if (!tech) return
    await supabase.from('technicians').update({ admin_notes: adminNotes }).eq('id', tech.id)
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-plush-500 animate-spin" />
      </main>
    </div>
  )

  if (!tech) return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 flex items-center justify-center">
        <p className="text-gray-500">Technician not found.</p>
      </main>
    </div>
  )

  const isPending  = tech.status === 'pending'
  const isApproved = tech.status === 'approved'
  const isDenied   = tech.status === 'denied'

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="btn-ghost text-sm">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold text-gray-900">Technician Review</h1>
            <p className="text-gray-500 mt-0.5">Application submitted {new Date(tech.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          {/* Current status badge */}
          <span className={`badge text-sm px-4 py-1.5 ${
            isPending  ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            isApproved ? 'bg-green-50 text-green-700 border border-green-200' :
                         'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {isPending  ? <><Clock className="w-3.5 h-3.5" /> Pending Review</> :
             isApproved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Approved</> :
                          <><XCircle className="w-3.5 h-3.5" /> Denied</>}
          </span>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Profile info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Personal info */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold text-gray-900">Personal Information</h2>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-plush-gradient flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg shadow-plush-200">
                  {tech.full_name.charAt(0)}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <InfoBlock label="Full Name"  value={tech.full_name} />
                  <InfoBlock label="Email"      value={tech.email} />
                  <InfoBlock label="Phone"      value={tech.phone} />
                  <InfoBlock label="Address"    value={`${tech.address ?? ''}, ${tech.city}, ${tech.state} ${tech.zip}`} />
                </div>
              </div>
            </div>

            {/* Professional background */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Briefcase className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold text-gray-900">Professional Background</h2>
              </div>
              <div className="space-y-4">
                <InfoBlock label="Years of Experience" value={`${tech.years_experience} year${tech.years_experience !== 1 ? 's' : ''}`} />

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {tech.skills && tech.skills.length > 0 ? tech.skills.map(s => (
                      <span key={s} className="bg-plush-50 text-plush-700 px-3 py-1 rounded-full text-sm font-medium">{s}</span>
                    )) : <span className="text-gray-400 text-sm">No skills listed</span>}
                  </div>
                </div>

                {tech.certifications && tech.certifications.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Certifications</p>
                    <div className="flex flex-wrap gap-2">
                      {tech.certifications.map(c => (
                        <span key={c} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                          <Star className="w-3 h-3" /> {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">About</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{tech.bio || 'No bio provided.'}</p>
                </div>
              </div>
            </div>

            {/* Assigned Work Orders */}
            {workOrders.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Clipboard className="w-5 h-5 text-plush-500" />
                  <h2 className="text-lg font-display font-bold text-gray-900">Work Order History</h2>
                </div>
                <div className="space-y-2">
                  {workOrders.map(wo => (
                    <div key={wo.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <span className="font-mono text-xs font-bold text-plush-600 mr-2">{wo.wo_number}</span>
                        <span className="text-sm font-medium text-gray-800">{wo.title}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{wo.job_city}, {wo.job_state}</p>
                      </div>
                      <span className="badge" style={{ background: STATUS_COLORS[wo.status] + '20', color: STATUS_COLORS[wo.status] }}>
                        {STATUS_LABELS[wo.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Decision panel */}
          <div className="space-y-5">
            {/* Admin notes */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold text-gray-900">Admin Notes</h2>
              </div>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                onBlur={saveNotes} rows={5}
                className="input-field resize-none text-sm"
                placeholder="Add internal notes about this applicant (auto-saved on blur)..." />
              <button onClick={saveNotes} className="btn-ghost text-xs mt-2 w-full">Save Notes</button>
            </div>

            {/* Decision */}
            {isPending && (
              <div className="card border-2 border-plush-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-display font-bold text-gray-900">Make a Decision</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                  Once you approve or deny this application, the applicant will be notified automatically.
                </p>
                <div className="space-y-3">
                  <button onClick={() => handleDecision('approved')} disabled={!!processing}
                    className="btn-success w-full gap-2">
                    {processing === 'approving'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
                      : <><CheckCircle2 className="w-4 h-4" /> Approve Technician</>}
                  </button>
                  <button onClick={() => handleDecision('denied')} disabled={!!processing}
                    className="btn-danger w-full gap-2">
                    {processing === 'denying'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Denying...</>
                      : <><XCircle className="w-4 h-4" /> Deny Application</>}
                  </button>
                </div>
              </div>
            )}

            {!isPending && (
              <div className={`card border-2 ${isApproved ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {isApproved
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <XCircle className="w-5 h-5 text-red-400" />}
                  <h2 className={`font-bold ${isApproved ? 'text-green-800' : 'text-red-700'}`}>
                    Application {isApproved ? 'Approved' : 'Denied'}
                  </h2>
                </div>
                {tech.reviewed_at && (
                  <p className={`text-sm ${isApproved ? 'text-green-700' : 'text-red-600'}`}>
                    Decision made on {new Date(tech.reviewed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                {isPending === false && (
                  <button onClick={() => handleDecision(isApproved ? 'denied' : 'approved')}
                    disabled={!!processing}
                    className={`mt-4 w-full ${isApproved ? 'btn-danger' : 'btn-success'}`}>
                    {processing
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isApproved ? 'Revoke Approval' : 'Approve Now'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
