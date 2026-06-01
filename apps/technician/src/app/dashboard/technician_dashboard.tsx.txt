'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Sparkles, Clipboard, MapPin, Clock, CheckCircle2, AlertCircle, Wifi, WifiOff, LogOut, Bell } from 'lucide-react'
import type { WorkOrder, Technician, Notification } from '@/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/types'

export default function TechDashboard() {
  const [tech, setTech]               = useState<Technician | null>(null)
  const [workOrders, setWorkOrders]   = useState<WorkOrder[]>([])
  const [notifications, setNotifs]    = useState<Notification[]>([])
  const [isOnline, setIsOnline]       = useState(false)
  const [locationWatcher, setWatcher] = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: techData }, { data: orders }, { data: notifs }] = await Promise.all([
      supabase.from('technicians').select('*').eq('user_id', user.id).single(),
      supabase.from('work_orders').select('*, customer:customers(full_name, phone, address, city, state)')
        .or(`assigned_tech_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false).order('created_at', { ascending: false }).limit(10),
    ])

    if (techData) { setTech(techData); setIsOnline(techData.is_online) }
    if (orders)   setWorkOrders(orders)
    if (notifs)   setNotifs(notifs)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Real-time updates
  useEffect(() => {
    const channel = supabase.channel('tech-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  const toggleOnline = async () => {
    if (!tech) return
    const going = !isOnline
    setIsOnline(going)

    if (going) {
      // Start GPS tracking
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          await supabase.from('technicians').update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
            last_location_at: new Date().toISOString(),
            is_online: true,
          }).eq('id', tech.id)
        },
        undefined,
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      )
      setWatcher(id)
    } else {
      if (locationWatcher !== null) navigator.geolocation.clearWatch(locationWatcher)
      setWatcher(null)
      await supabase.from('technicians').update({ is_online: false }).eq('id', tech.id)
    }
  }

  const handleSignOut = async () => {
    if (locationWatcher !== null) navigator.geolocation.clearWatch(locationWatcher)
    if (tech) await supabase.from('technicians').update({ is_online: false }).eq('id', tech.id)
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const stats = {
    assigned:   workOrders.filter(w => w.status === 'assigned').length,
    inProgress: workOrders.filter(w => w.status === 'in_progress').length,
    completed:  workOrders.filter(w => w.status === 'completed').length,
    pending:    workOrders.filter(w => w.status === 'pending').length,
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar + main layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
          <div className="px-5 py-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-plush-500" />
              <span className="font-display font-bold text-gray-900">Plush Intentions</span>
            </div>
            <p className="text-xs text-gray-400">Technician Portal</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link href="/dashboard" className="nav-link bg-plush-50 text-plush-700">
              <Clipboard className="w-5 h-5" /> Dashboard
            </Link>
            <Link href="/work-orders" className="nav-link text-gray-600 hover:bg-gray-50">
              <Clipboard className="w-5 h-5" /> Work Orders
              {stats.assigned + stats.inProgress > 0 && (
                <span className="ml-auto bg-plush-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.assigned + stats.inProgress}
                </span>
              )}
            </Link>
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-3">
            {/* Online toggle */}
            <button onClick={toggleOnline}
              className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isOnline ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'Online — Sharing Location' : 'Go Online'}
            </button>
            {/* Profile */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-plush-gradient flex items-center justify-center text-white text-sm font-bold">
                {tech?.full_name?.charAt(0) ?? 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{tech?.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{tech?.status}</p>
              </div>
              <button onClick={handleSignOut} className="text-gray-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900">
                Good {getGreeting()}, {tech?.full_name?.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-500 mt-1">Here's your work order overview for today.</p>
            </div>
            {/* Notifications */}
            <div className="relative">
              <button className="relative p-2 text-gray-500 hover:text-plush-600 hover:bg-plush-50 rounded-xl transition-all">
                <Bell className="w-6 h-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Status alert if pending */}
          {tech?.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 mb-6">
              <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Application Under Review</p>
                <p className="text-sm text-amber-700 mt-0.5">Your application is currently pending admin approval. You'll be notified once a decision is made.</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Assigned',    value: stats.assigned,   color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'In Progress', value: stats.inProgress, color: '#8B5CF6', bg: '#F5F3FF' },
              { label: 'Completed',   value: stats.completed,  color: '#10B981', bg: '#ECFDF5' },
              { label: 'Pending',     value: stats.pending,    color: '#F59E0B', bg: '#FFFBEB' },
            ].map(s => (
              <div key={s.label} className="card flex flex-col gap-1" style={{ borderLeft: `4px solid ${s.color}` }}>
                <span className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Active Work Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-gray-900">Active Work Orders</h2>
              <Link href="/work-orders" className="text-plush-600 text-sm font-medium hover:underline">View all</Link>
            </div>
            {workOrders.filter(w => ['assigned','in_progress'].includes(w.status)).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No active work orders right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.filter(w => ['assigned','in_progress'].includes(w.status)).map(wo => (
                  <WorkOrderCard key={wo.id} wo={wo} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function WorkOrderCard({ wo }: { wo: WorkOrder }) {
  return (
    <Link href={`/work-orders/${wo.id}`}>
      <div className="border border-gray-100 rounded-xl p-4 hover:border-plush-200 hover:bg-plush-50/30 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-plush-600 bg-plush-50 px-2 py-0.5 rounded">{wo.wo_number}</span>
              <span className="badge" style={{ background: STATUS_COLORS[wo.status] + '20', color: STATUS_COLORS[wo.status] }}>
                {STATUS_LABELS[wo.status]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 truncate">{wo.title}</h3>
            <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
              <MapPin className="w-3 h-3" />
              <span>{wo.job_address}, {wo.job_city}, {wo.job_state}</span>
            </div>
            {wo.scheduled_date && (
              <div className="flex items-center gap-1 mt-0.5 text-gray-400 text-xs">
                <Clock className="w-3 h-3" />
                <span>{new Date(wo.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {wo.scheduled_time ?? ''}</span>
              </div>
            )}
          </div>
          <div className="text-gray-300">›</div>
        </div>
      </div>
    </Link>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-plush-gradient animate-spin" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 50%, 50% 50%)' }} />
        <p className="text-gray-500 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
