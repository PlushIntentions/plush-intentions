'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Plus, Search, Clipboard, MapPin, Clock, User, Filter } from 'lucide-react'
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '@/types'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'

const STATUS_FILTERS: { label: string; value: WorkOrderStatus | 'all' | 'open' }[] = [
  { label: 'All',         value: 'all' },
  { label: 'Open',        value: 'open' },
  { label: 'Pending',     value: 'pending' },
  { label: 'Assigned',    value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed',   value: 'completed' },
  { label: 'Cancelled',   value: 'cancelled' },
]

export default function WorkOrdersPage() {
  const searchParams              = useSearchParams()
  const [adminName, setAdminName] = useState('Admin')
  const [workOrders, setWOs]      = useState<WorkOrder[]>([])
  const [filter, setFilter]       = useState<string>(searchParams.get('filter') ?? 'all')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (p?.full_name) setAdminName(p.full_name)
    }
    const { data } = await supabase
      .from('work_orders')
      .select('*, customer:customers(full_name, phone), technician:technicians(full_name, is_online)')
      .order('created_at', { ascending: false })
    if (data) setWOs(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const ch = supabase.channel('admin-wos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  const filtered = workOrders.filter(wo => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'open' ? ['pending','assigned','in_progress'].includes(wo.status) :
      wo.status === filter
    const matchSearch = !search.trim() ||
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      wo.wo_number.toLowerCase().includes(search.toLowerCase()) ||
      wo.job_city.toLowerCase().includes(search.toLowerCase()) ||
      (wo.customer as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Work Orders</h1>
            <p className="text-gray-500 mt-1">{workOrders.length} total · {workOrders.filter(w => w.status === 'pending').length} unassigned</p>
          </div>
          <Link href="/work-orders/new" className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> New Work Order
          </Link>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-10" placeholder="Search WO#, title, customer, city..." />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all whitespace-nowrap ${
                  filter === f.value
                    ? 'bg-plush-500 border-plush-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-plush-300'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="th">Work Order</th>
                <th className="th">Location</th>
                <th className="th">Customer</th>
                <th className="th">Technician</th>
                <th className="th">Priority</th>
                <th className="th">Status</th>
                <th className="th">Scheduled</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading work orders...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="text-center py-16">
                    <Clipboard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No work orders found</p>
                  </div>
                </td></tr>
              ) : filtered.map(wo => (
                <tr key={wo.id} className="table-row">
                  <td className="td">
                    <div>
                      <span className="font-mono text-xs font-bold text-plush-600 bg-plush-50 px-2 py-0.5 rounded">{wo.wo_number}</span>
                      <p className="font-semibold text-gray-800 mt-1 text-sm">{wo.title}</p>
                      <p className="text-xs text-gray-400">{wo.service_type}</p>
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-start gap-1 text-gray-600 text-xs">
                      <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{wo.job_address}<br />{wo.job_city}, {wo.job_state}</span>
                    </div>
                  </td>
                  <td className="td">
                    {wo.customer
                      ? <div className="flex items-center gap-1.5 text-sm"><User className="w-3.5 h-3.5 text-gray-400" />{(wo.customer as any).full_name}</div>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="td">
                    {wo.technician
                      ? <div>
                          <p className="text-sm font-medium">{(wo.technician as any).full_name}</p>
                          {(wo.technician as any).is_online && <span className="text-xs text-green-600">🟢 Online</span>}
                        </div>
                      : <Link href={`/work-orders/${wo.id}`} className="text-xs text-amber-600 hover:underline font-medium">Assign →</Link>}
                  </td>
                  <td className="td">
                    <span className="badge" style={{ background: PRIORITY_COLORS[wo.priority] + '20', color: PRIORITY_COLORS[wo.priority] }}>
                      {PRIORITY_LABELS[wo.priority]}
                    </span>
                  </td>
                  <td className="td">
                    <span className="badge" style={{ background: STATUS_COLORS[wo.status] + '20', color: STATUS_COLORS[wo.status] }}>
                      {STATUS_LABELS[wo.status]}
                    </span>
                  </td>
                  <td className="td">
                    {wo.scheduled_date
                      ? <div className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{new Date(wo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="td">
                    <Link href={`/work-orders/${wo.id}`} className="btn-ghost text-xs px-3 py-1.5">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
