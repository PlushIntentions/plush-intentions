'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import {
  Sparkles, MapPin, Clock, User, Phone, FileText,
  CheckCircle2, Play, ChevronLeft, Loader2, AlertCircle,
  DollarSign, Calendar, Wrench
} from 'lucide-react'
import type { WorkOrder } from '@/types'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from '@/types'

const Map = dynamic(() => import('@/components/JobMap'), { ssr: false })

export default function WorkOrderDetailPage() {
  const { id }                  = useParams<{ id: string }>()
  const router                  = useRouter()
  const [wo, setWo]             = useState<WorkOrder | null>(null)
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes]       = useState('')
  const [finalCost, setFinalCost] = useState('')

  const fetchWO = useCallback(async () => {
    const { data } = await supabase
      .from('work_orders')
      .select('*, customer:customers(full_name, phone, email, address, city, state, zip)')
      .eq('id', id)
      .single()
    if (data) { setWo(data); setNotes(data.completion_notes ?? ''); setFinalCost(String(data.final_cost ?? '')) }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchWO() }, [fetchWO])

  // Real-time updates
  useEffect(() => {
    const channel = supabase.channel(`wo-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'work_orders', filter: `id=eq.${id}` }, fetchWO)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, fetchWO])

  const updateStatus = async (newStatus: string) => {
    if (!wo) return
    setUpdating(true)
    const updates: any = { status: newStatus }
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString()
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.completion_notes = notes
      if (finalCost) updates.final_cost = parseFloat(finalCost)
    }
    await supabase.from('work_orders').update(updates).eq('id', wo.id)
    setUpdating(false)
    await fetchWO()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-plush-500 animate-spin" />
    </div>
  )

  if (!wo) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-gray-500">Work order not found.</p></div>
    </div>
  )

  const canStart     = wo.status === 'assigned'
  const canComplete  = wo.status === 'in_progress'
  const isCompleted  = wo.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-ghost text-sm">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-plush-500" />
          <span className="font-display font-bold text-gray-900">Plush Intentions</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono font-bold text-plush-600 bg-plush-50 px-3 py-1 rounded-lg">{wo.wo_number}</span>
          <span className="badge" style={{ background: STATUS_COLORS[wo.status] + '20', color: STATUS_COLORS[wo.status] }}>
            {STATUS_LABELS[wo.status]}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Work Order Details */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-plush-500" />
              <h2 className="text-xl font-display font-bold text-gray-900">Work Order Details</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Title</p>
                <p className="font-semibold text-gray-900">{wo.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Service Type</p>
                <p className="text-gray-700">{wo.service_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Priority</p>
                <span className="badge" style={{ background: PRIORITY_COLORS[wo.priority] + '20', color: PRIORITY_COLORS[wo.priority] }}>
                  {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Description</p>
                <p className="text-gray-700 text-sm leading-relaxed">{wo.description}</p>
              </div>
              {wo.notes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Admin Notes</p>
                  <p className="text-gray-600 text-sm italic">{wo.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-plush-500" />
              <h2 className="text-lg font-display font-bold text-gray-900">Schedule</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem icon={Calendar} label="Date" value={wo.scheduled_date
                ? new Date(wo.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Not scheduled'} />
              <InfoItem icon={Clock} label="Time" value={wo.scheduled_time ? formatTime(wo.scheduled_time) : 'TBD'} />
              <InfoItem icon={Clock} label="Est. Hours" value={wo.estimated_hours ? `${wo.estimated_hours} hrs` : 'TBD'} />
              <InfoItem icon={DollarSign} label="Est. Cost" value={wo.estimated_cost ? `$${Number(wo.estimated_cost).toFixed(2)}` : 'TBD'} />
            </div>
          </div>

          {/* Customer Info */}
          {wo.customer && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold text-gray-900">Customer</h2>
              </div>
              <div className="space-y-2">
                <InfoItem icon={User}  label="Name"    value={wo.customer.full_name} />
                {wo.customer.phone && <InfoItem icon={Phone} label="Phone" value={wo.customer.phone} />}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isCompleted && (
            <div className="card">
              <h2 className="text-lg font-display font-bold text-gray-900 mb-4">Update Status</h2>
              {canStart && (
                <button onClick={() => updateStatus('in_progress')} disabled={updating}
                  className="btn-primary w-full mb-3">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Start Work Order
                </button>
              )}
              {canComplete && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Completion Notes *</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      className="input-field resize-none" placeholder="Describe the work completed..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Final Cost ($)</label>
                    <input value={finalCost} onChange={e => setFinalCost(e.target.value)}
                      type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
                  </div>
                  <button onClick={() => updateStatus('completed')} disabled={updating || !notes.trim()}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-all">
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark as Completed
                  </button>
                </div>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="card border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-green-800">Completed</h2>
              </div>
              {wo.completed_at && <p className="text-sm text-green-700">Completed on {new Date(wo.completed_at).toLocaleString()}</p>}
              {wo.completion_notes && <p className="text-sm text-green-700 mt-2">{wo.completion_notes}</p>}
              {wo.final_cost && <p className="text-sm font-semibold text-green-800 mt-2">Final Cost: ${Number(wo.final_cost).toFixed(2)}</p>}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Map */}
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-plush-500" />
              <h2 className="text-lg font-display font-bold text-gray-900">Job Location</h2>
            </div>
            <div className="mb-3">
              <p className="font-medium text-gray-800">{wo.job_address}</p>
              <p className="text-gray-500 text-sm">{wo.job_city}, {wo.job_state} {wo.job_zip}</p>
            </div>
            {wo.job_lat && wo.job_lng ? (
              <div className="rounded-xl overflow-hidden h-80 border border-gray-100">
                <Map lat={wo.job_lat} lng={wo.job_lng} address={`${wo.job_address}, ${wo.job_city}`} />
              </div>
            ) : (
              <div className="rounded-xl bg-gray-100 h-80 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Map coordinates not available</p>
                </div>
              </div>
            )}
            {wo.job_lat && wo.job_lng && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${wo.job_lat},${wo.job_lng}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-primary w-full mt-3 block text-center">
                <MapPin className="w-4 h-4 mr-2 inline" />
                Get Directions
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
