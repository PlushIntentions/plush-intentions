'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import {
  ChevronLeft, MapPin, Clock, User, Phone, Loader2,
  CheckCircle2, Clipboard, Calendar, DollarSign,
  Wrench, AlertCircle, UserCheck, History
} from 'lucide-react'
import type { WorkOrder, Technician, WorkOrderHistory } from '@/types'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS }  from '@/types'

const AdminMap = dynamic(() => import('@/components/AdminMap'), { ssr: false })

export default function AdminWorkOrderDetail() {
  const { id }                        = useParams<{ id: string }>()
  const router                        = useRouter()
  const [adminName, setAdminName]     = useState('Admin')
  const [wo, setWo]                   = useState<WorkOrder | null>(null)
  const [technicians, setTechs]       = useState<Technician[]>([])
  const [history, setHistory]         = useState<WorkOrderHistory[]>([])
  const [selectedTech, setSelTech]    = useState('')
  const [statusUpdate, setStatusUpdate] = useState('')
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (p?.full_name) setAdminName(p.full_name)
    }

    const [{ data: woData }, { data: techs }, { data: hist }] = await Promise.all([
      supabase.from('work_orders')
        .select('*, customer:customers(full_name, phone, email, address, city, state, zip), technician:technicians(full_name, email, phone, current_lat, current_lng, is_online)')
        .eq('id', id).single(),
      supabase.from('technicians').select('*').eq('status', 'approved').order('full_name'),
      supabase.from('work_order_history').select('*').eq('work_order_id', id).order('created_at', { ascending: false }),
    ])

    if (woData) {
      setWo(woData)
      setSelTech(woData.assigned_tech_id ?? '')
      setStatusUpdate(woData.status)
      setNotes(woData.notes ?? '')
    }
    if (techs) setTechs(techs as Technician[])
    if (hist)  setHistory(hist as WorkOrderHistory[])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const ch = supabase.channel(`admin-wo-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'work_orders', filter: `id=eq.${id}` }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_order_history', filter: `work_order_id=eq.${id}` }, fetchAll)
      // Real-time technician location updates
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'technicians' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, fetchAll])

  const handleSave = async () => {
    if (!wo) return
    setSaving(true)
    setSuccessMsg(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const updates: any = {
        status: statusUpdate,
        notes: notes || null,
      }

      const changingTech = selectedTech !== (wo.assigned_tech_id ?? '')
      if (changingTech) {
        updates.assigned_tech_id = selectedTech || null
        if (selectedTech) {
          updates.assigned_by = user?.id
          updates.assigned_at = new Date().toISOString()
          if (statusUpdate === 'pending') updates.status = 'assigned'
        } else {
          updates.assigned_by = null
          updates.assigned_at = null
          if (statusUpdate === 'assigned') updates.status = 'pending'
        }
      }

      await supabase.from('work_orders').update(updates).eq('id', wo.id)

      // Notify newly assigned tech
      if (changingTech && selectedTech) {
        const tech = technicians.find(t => t.id === selectedTech)
        if (tech) {
          await supabase.from('notifications').insert({
            user_id: tech.user_id,
            title: '📋 Work Order Assigned',
            message: `Work Order ${wo.wo_number} — "${wo.title}" has been assigned to you.`,
            type: 'work_order_assigned',
            link: `/work-orders/${wo.id}`,
          })
        }
      }

      setSuccessMsg('Work order updated successfully.')
      await fetchAll()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-plush-500 animate-spin" />
      </main>
    </div>
  )

  if (!wo) return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 flex items-center justify-center">
        <div className="text-center"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-gray-500">Work order not found.</p></div>
      </main>
    </div>
  )

  const assignedTech = wo.technician as Technician | undefined

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="btn-ghost text-sm">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-lg font-bold text-plush-600 bg-plush-50 px-3 py-1 rounded-lg">{wo.wo_number}</span>
              <h1 className="text-2xl font-display font-bold text-gray-900">{wo.title}</h1>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">Created {new Date(wo.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <span className="badge text-sm px-4 py-1.5" style={{ background: STATUS_COLORS[wo.status] + '20', color: STATUS_COLORS[wo.status], border: `1px solid ${STATUS_COLORS[wo.status]}40` }}>
            {STATUS_LABELS[wo.status]}
          </span>
        </div>

        {successMsg && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT + MIDDLE: Details */}
          <div className="xl:col-span-2 space-y-5">
            {/* Work Order Info */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold">Work Order Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoBlock label="Service Type" value={wo.service_type} />
                <InfoBlock label="Priority">
                  <span className="badge" style={{ background: PRIORITY_COLORS[wo.priority] + '20', color: PRIORITY_COLORS[wo.priority] }}>
                    {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                  </span>
                </InfoBlock>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{wo.description}</p>
                </div>
                {wo.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Admin Notes</p>
                    <p className="text-sm text-gray-600 italic">{wo.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule & Billing */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold">Schedule & Billing</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoBlock label="Scheduled Date" value={wo.scheduled_date
                  ? new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Not scheduled'} />
                <InfoBlock label="Scheduled Time" value={wo.scheduled_time ? formatTime(wo.scheduled_time) : 'TBD'} />
                <InfoBlock label="Est. Hours"  value={wo.estimated_hours ? `${wo.estimated_hours} hrs` : '—'} />
                <InfoBlock label="Est. Cost"   value={wo.estimated_cost ? `$${Number(wo.estimated_cost).toFixed(2)}` : '—'} />
                {wo.started_at && (
                  <InfoBlock label="Started At" value={new Date(wo.started_at).toLocaleString()} />
                )}
                {wo.completed_at && (
                  <InfoBlock label="Completed At" value={new Date(wo.completed_at).toLocaleString()} />
                )}
                {wo.final_cost && (
                  <InfoBlock label="Final Cost" value={`$${Number(wo.final_cost).toFixed(2)}`} />
                )}
              </div>
            </div>

            {/* Customer Info */}
            {wo.customer && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-plush-500" />
                  <h2 className="text-lg font-display font-bold">Customer</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoBlock label="Name"    value={(wo.customer as any).full_name} />
                  <InfoBlock label="Email"   value={(wo.customer as any).email ?? '—'} />
                  <InfoBlock label="Phone"   value={(wo.customer as any).phone ?? '—'} />
                  <InfoBlock label="Address" value={`${(wo.customer as any).address ?? ''}, ${(wo.customer as any).city}, ${(wo.customer as any).state}`} />
                </div>
              </div>
            )}

            {/* Status History */}
            {history.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-plush-500" />
                  <h2 className="text-lg font-display font-bold">Status History</h2>
                </div>
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-plush-300 flex-shrink-0" />
                      <span className="text-gray-500 text-xs">{new Date(h.created_at).toLocaleString()}</span>
                      <span className="text-gray-600">
                        {h.from_status
                          ? <><span style={{ color: STATUS_COLORS[h.from_status] }}>{STATUS_LABELS[h.from_status]}</span> → <span style={{ color: STATUS_COLORS[h.to_status] }}>{STATUS_LABELS[h.to_status]}</span></>
                          : <>Created as <span style={{ color: STATUS_COLORS[h.to_status] }}>{STATUS_LABELS[h.to_status]}</span></>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Actions + Map */}
          <div className="space-y-5">
            {/* Admin Actions */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold">Assignment & Status</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Technician</label>
                  <select value={selectedTech} onChange={e => setSelTech(e.target.value)} className="select-field text-sm">
                    <option value="">Unassigned</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} {t.is_online ? '🟢' : '⚪'} — {t.city}, {t.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)} className="select-field text-sm">
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="input-field resize-none text-sm" placeholder="Internal notes..." />
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Dual Map: Job + Technician locations */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-plush-500" />
                <h2 className="text-lg font-display font-bold">Live Map</h2>
                {assignedTech?.is_online && (
                  <span className="badge bg-green-50 text-green-700 ml-auto text-xs">🟢 Tech Online</span>
                )}
              </div>

              {/* Job address */}
              <div className="mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Job Site</p>
                <p className="text-sm font-medium text-gray-800">{wo.job_address}, {wo.job_city}, {wo.job_state}</p>
              </div>

              {/* Tech location */}
              {assignedTech && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Technician</p>
                  <p className="text-sm font-medium text-gray-800">{assignedTech.full_name}</p>
                  {assignedTech.last_location_at && (
                    <p className="text-xs text-gray-400">Last seen: {new Date(assignedTech.last_location_at).toLocaleTimeString()}</p>
                  )}
                </div>
              )}

              {/* Map */}
              {wo.job_lat && wo.job_lng ? (
                <div className="rounded-xl overflow-hidden h-72 border border-gray-100">
                  <AdminMap
                    jobLat={wo.job_lat}
                    jobLng={wo.job_lng}
                    jobAddress={`${wo.job_address}, ${wo.job_city}`}
                    techLat={assignedTech?.current_lat ?? null}
                    techLng={assignedTech?.current_lng ?? null}
                    techName={assignedTech?.full_name ?? null}
                    techOnline={assignedTech?.is_online ?? false}
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-gray-100 h-72 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Geocode the address to see the map</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoBlock({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      {children ?? <p className="text-sm font-medium text-gray-800">{value}</p>}
    </div>
  )
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
