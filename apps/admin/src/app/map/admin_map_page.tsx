'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { MapPin, RefreshCw, Wifi, WifiOff, Users, Clipboard } from 'lucide-react'
import type { Technician, WorkOrder } from '@/types'

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false })

export default function LiveMapPage() {
  const [adminName, setAdminName]   = useState('Admin')
  const [technicians, setTechs]     = useState<Technician[]>([])
  const [workOrders, setWOs]        = useState<WorkOrder[]>([])
  const [lastRefresh, setRefresh]   = useState(new Date())
  const [loading, setLoading]       = useState(true)
  const intervalRef                 = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (p?.full_name) setAdminName(p.full_name)
    }
    const [{ data: techs }, { data: orders }] = await Promise.all([
      supabase.from('technicians').select('*').eq('status', 'approved'),
      supabase.from('work_orders')
        .select('*, technician:technicians(full_name)')
        .in('status', ['assigned', 'in_progress'])
        .not('job_lat', 'is', null),
    ])
    if (techs)  setTechs(techs as Technician[])
    if (orders) setWOs(orders as WorkOrder[])
    setRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(fetchData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  // Real-time tech location updates
  useEffect(() => {
    const ch = supabase.channel('live-map-tech')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'technicians' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  const onlineTechs  = technicians.filter(t => t.is_online && t.current_lat && t.current_lng)
  const offlineTechs = technicians.filter(t => !t.is_online)

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Header bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Live Operations Map</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600">{onlineTechs.length} Online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-gray-600">{offlineTechs.length} Offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-plush-500" />
                <span className="text-gray-600">{workOrders.length} Active Jobs</span>
              </div>
            </div>
            <button onClick={fetchData} className="btn-ghost text-sm gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Map + Sidebar layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: tech list */}
          <div className="w-72 bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              {/* Online Techs */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Online ({onlineTechs.length})</h3>
                </div>
                {onlineTechs.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-2">No technicians online</p>
                ) : onlineTechs.map(t => (
                  <TechCard key={t.id} tech={t} online={true} />
                ))}
              </div>

              {/* Offline Techs */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <WifiOff className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Offline ({offlineTechs.length})</h3>
                </div>
                {offlineTechs.map(t => <TechCard key={t.id} tech={t} online={false} />)}
              </div>

              {/* Active Jobs */}
              {workOrders.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Clipboard className="w-4 h-4 text-plush-500" />
                    <h3 className="text-sm font-bold text-plush-700 uppercase tracking-wide">Active Jobs ({workOrders.length})</h3>
                  </div>
                  {workOrders.map(wo => (
                    <div key={wo.id} className="mb-2 p-2.5 rounded-xl border border-gray-100 hover:border-plush-100 hover:bg-plush-50/30 transition-all">
                      <p className="font-mono text-xs font-bold text-plush-600">{wo.wo_number}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{wo.title}</p>
                      <p className="text-xs text-gray-400">{wo.job_city}, {wo.job_state}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Full-screen map */}
          <div className="flex-1 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-plush-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-gray-500 text-sm">Loading live map...</p>
                </div>
              </div>
            ) : (
              <LiveMap technicians={onlineTechs} workOrders={workOrders} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function TechCard({ tech, online }: { tech: Technician; online: boolean }) {
  return (
    <div className={`mb-2 p-3 rounded-xl border transition-all ${online ? 'border-green-100 bg-green-50' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${online ? 'bg-green-500' : 'bg-gray-300'}`}>
          {tech.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${online ? 'text-green-800' : 'text-gray-500'}`}>{tech.full_name}</p>
          {online && tech.last_location_at && (
            <p className="text-xs text-green-600">Updated {timeAgo(tech.last_location_at)}</p>
          )}
          {!online && <p className="text-xs text-gray-400">Offline</p>}
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
      </div>
    </div>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}
