'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Sparkles, MapPin, Clock, Filter, Search, Clipboard } from 'lucide-react'
import type { WorkOrder, WorkOrderStatus } from '@/types'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from '@/types'

const FILTER_OPTIONS: { label: string; value: WorkOrderStatus | 'all' }[] = [
  { label: 'All',         value: 'all' },
  { label: 'Assigned',    value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed',   value: 'completed' },
  { label: 'Cancelled',   value: 'cancelled' },
]

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [filter, setFilter]         = useState<WorkOrderStatus | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: techData } = await supabase
        .from('technicians').select('id').eq('user_id', user.id).single()
      if (!techData) { setLoading(false); return }

      const { data } = await supabase
        .from('work_orders')
        .select('*, customer:customers(full_name, phone)')
        .eq('assigned_tech_id', techData.id)
        .order('created_at', { ascending: false })

      if (data) setWorkOrders(data)
      setLoading(false)
    }
    fetchOrders()

    const channel = supabase.channel('wo-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = workOrders.filter(wo => {
    const matchStatus = filter === 'all' || wo.status === filter
    const matchSearch = search.trim() === '' ||
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      wo.wo_number.toLowerCase().includes(search.toLowerCase()) ||
      wo.job_city.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-plush-500" />
          <span className="font-display font-bold text-gray-900">Plush Intentions</span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-gray-600 text-sm font-medium">My Work Orders</span>
        </div>
        <Link href="/dashboard" className="btn-ghost text-sm">← Dashboard</Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by WO#, title, or city..."
              className="input-field pl-10" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {FILTER_OPTIONS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border-2 transition-all ${
                  filter === f.value
                    ? 'bg-plush-500 border-plush-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-plush-300'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading work orders...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Clipboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No work orders found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || filter !== 'all' ? 'Try adjusting your filters.' : 'Work orders assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function WorkOrderRow({ wo }: { wo: WorkOrder }) {
  return (
    <Link href={`/work-orders/${wo.id}`}>
      <div className="card hover:border-plush-200 hover:shadow-md transition-all cursor-pointer group border border-gray-100"
        style={{ borderLeft: `4px solid ${STATUS_COLORS[wo.status]}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-sm text-plush-600 bg-plush-50 px-2.5 py-0.5 rounded-lg">{wo.wo_number}</span>
              <span className="badge" style={{ background: STATUS_COLORS[wo.status] + '20', color: STATUS_COLORS[wo.status] }}>
                {STATUS_LABELS[wo.status]}
              </span>
              <span className="badge" style={{ background: PRIORITY_COLORS[wo.priority] + '20', color: PRIORITY_COLORS[wo.priority] }}>
                {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)} Priority
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-lg group-hover:text-plush-700 transition-colors">{wo.title}</h3>
            <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{wo.service_type}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <MapPin className="w-3.5 h-3.5" />
                <span>{wo.job_address}, {wo.job_city}, {wo.job_state} {wo.job_zip}</span>
              </div>
              {wo.scheduled_date && (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(wo.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {wo.scheduled_time ? ` at ${formatTime(wo.scheduled_time)}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-plush-300 group-hover:text-plush-500 text-xl transition-colors">›</div>
        </div>
      </div>
    </Link>
  )
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
