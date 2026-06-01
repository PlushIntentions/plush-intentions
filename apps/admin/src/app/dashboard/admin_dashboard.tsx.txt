'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import {
  Users, Clipboard, CheckCircle2, Clock,
  AlertCircle, TrendingUp, Bell, Plus, ArrowRight, Wifi
} from 'lucide-react'
import type { WorkOrder, Technician, Notification } from '@/types'
import { STATUS_COLORS, STATUS_LABELS, TECH_STATUS_COLORS } from '@/types'

export default function AdminDashboard() {
  const [adminName, setAdminName]     = useState('Admin')
  const [technicians, setTechs]       = useState<Technician[]>([])
  const [workOrders, setWorkOrders]   = useState<WorkOrder[]>([])
  const [notifications, setNotifs]    = useState<Notification[]>([])
  const [loading, setLoading]         = useState(true)

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth/login'; return }

    const [
      { data: profile },
      { data: techs },
      { data: orders },
      { data: notifs },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('technicians').select('*').order('created_at', { ascending: false }),
      supabase.from('work_orders').select('*, customer:customers(full_name), technician:technicians(full_name)')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false)
        .order('created_at', { ascending: false }).limit(20),
    ])

    if (profile?.full_name) setAdminName(profile.full_name)
    if (techs)  setTechs(techs)
    if (orders) setWorkOrders(orders)
    if (notifs) setNotifs(notifs)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technicians' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  const markNotifRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(p => p.filter(n => n.id !== id))
  }

  const stats = {
    pendingTechs:  technicians.filter(t => t.status === 'pending').length,
    approvedTechs: technicians.filter(t => t.status === 'approved').length,
    onlineTechs:   technicians.filter(t => t.is_online).length,
    openOrders:    workOrders.filter(w => ['pending','assigned','in_progress'].includes(w.status)).length,
    completedToday: workOrders.filter(w => w.status === 'completed' && w.completed_at &&
      new Date(w.completed_at).toDateString() === new Date().toDateString()).length,
    totalOrders:   workOrders.length,
  }

  const recentPending = workOrders.filter(w => w.status === 'pending').slice(0, 5)
  const pendingTechs  = technicians.filter(t => t.status === 'pending').slice(0, 5)

  if (loading) return <LoadingScreen />

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative group">
              <button className="relative p-2.5 bg-white border border-gray-100 text-gray-500 hover:text-plush-600 rounded-xl shadow-sm transition-all">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {notifications.length > 0 && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-3 hidden group-focus-within:block">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">Notifications</p>
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => markNotifRead(n.id)}>
                      <div className="w-2 h-2 rounded-full bg-plush-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link href="/work-orders/new" className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> New Work Order
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon={AlertCircle} label="Pending Applications" value={stats.pendingTechs}
            color="#F59E0B" bg="#FFFBEB" href="/technicians?filter=pending" />
          <StatCard icon={Users}       label="Approved Technicians" value={stats.approvedTechs}
            color="#10B981" bg="#ECFDF5" href="/technicians?filter=approved" />
          <StatCard icon={Wifi}        label="Technicians Online"   value={stats.onlineTechs}
            color="#3B82F6" bg="#EFF6FF" href="/map" />
          <StatCard icon={Clipboard}   label="Open Work Orders"     value={stats.openOrders}
            color="#8B5CF6" bg="#F5F3FF" href="/work-orders?filter=open" />
          <StatCard icon={CheckCircle2} label="Completed Today"     value={stats.completedToday}
            color="#10B981" bg="#ECFDF5" href="/work-orders?filter=completed" />
          <StatCard icon={TrendingUp}  label="Total Work Orders"    value={stats.totalOrders}
            color="#6B7280" bg="#F9FAFB" href="/work-orders" />
        </div>

        {/* Two-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Technician Applications */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-gray-900">Pending Applications</h2>
              <Link href="/technicians?filter=pending" className="text-plush-600 text-sm font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {pendingTechs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending applications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTechs.map(tech => (
                  <Link key={tech.id} href={`/technicians/${tech.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-plush-50 transition-all border border-gray-50 hover:border-plush-100 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                        {tech.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{tech.full_name}</p>
                        <p className="text-xs text-gray-400">{tech.city}, {tech.state} · Applied {timeAgo(tech.created_at)}</p>
                      </div>
                      <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Unassigned Work Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-gray-900">Unassigned Work Orders</h2>
              <Link href="/work-orders?filter=pending" className="text-plush-600 text-sm font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {recentPending.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">All work orders are assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPending.map(wo => (
                  <Link key={wo.id} href={`/work-orders/${wo.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-plush-50 transition-all border border-gray-50 hover:border-plush-100 cursor-pointer">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-plush-600">{wo.wo_number}</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm truncate">{wo.title}</p>
                        <p className="text-xs text-gray-400">{wo.job_city}, {wo.job_state}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(wo.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg, href }: {
  icon: any; label: string; value: number; color: string; bg: string; href: string
}) {
  return (
    <Link href={href}>
      <div className="card hover:shadow-md transition-all cursor-pointer group" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
          <div className="p-2 rounded-xl" style={{ background: bg }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Loading admin dashboard...</p>
    </div>
  )
}
