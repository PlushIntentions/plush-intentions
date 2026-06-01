'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Users, Search, CheckCircle2, XCircle, Clock, Phone, MapPin, Briefcase } from 'lucide-react'
import type { Technician, TechnicianStatus } from '@/types'
import { TECH_STATUS_COLORS } from '@/types'

const FILTERS: { label: string; value: TechnicianStatus | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied',   value: 'denied' },
]

export default function TechniciansPage() {
  const searchParams                  = useSearchParams()
  const [adminName, setAdminName]     = useState('Admin')
  const [technicians, setTechs]       = useState<Technician[]>([])
  const [filter, setFilter]           = useState<TechnicianStatus | 'all'>(
    (searchParams.get('filter') as TechnicianStatus) ?? 'all'
  )
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (p?.full_name) setAdminName(p.full_name)
    }
    const { data } = await supabase
      .from('technicians').select('*').order('created_at', { ascending: false })
    if (data) setTechs(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const ch = supabase.channel('techs-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technicians' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  const filtered = technicians.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter
    const matchSearch = search.trim() === '' ||
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.city ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Technicians</h1>
            <p className="text-gray-500 mt-1">{technicians.length} total · {technicians.filter(t => t.status === 'pending').length} pending review</p>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-10" placeholder="Search by name, email, or city..." />
          </div>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all whitespace-nowrap ${
                  filter === f.value
                    ? 'bg-plush-500 border-plush-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-plush-300'
                }`}>
                {f.label}
                <span className="ml-1.5 text-xs opacity-70">
                  ({technicians.filter(t => f.value === 'all' ? true : t.status === f.value).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="th">Technician</th>
                <th className="th">Location</th>
                <th className="th">Experience</th>
                <th className="th">Status</th>
                <th className="th">Applied</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading technicians...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="text-center py-16">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No technicians found</p>
                  </div>
                </td></tr>
              ) : filtered.map(tech => (
                <tr key={tech.id} className="table-row">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-plush-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {tech.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{tech.full_name}</p>
                        <p className="text-xs text-gray-400">{tech.email}</p>
                        <p className="text-xs text-gray-400">{tech.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{tech.city}, {tech.state}</span>
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      <span>{tech.years_experience} yr{tech.years_experience !== 1 ? 's' : ''}</span>
                    </div>
                    {tech.skills?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{tech.skills.slice(0, 2).join(', ')}{tech.skills.length > 2 ? ` +${tech.skills.length - 2}` : ''}</p>
                    )}
                  </td>
                  <td className="td">
                    <span className={`badge ${
                      tech.status === 'pending'  ? 'bg-amber-50 text-amber-700' :
                      tech.status === 'approved' ? 'bg-green-50 text-green-700' :
                                                   'bg-red-50 text-red-600'
                    }`}>
                      {tech.status === 'pending'  ? <Clock className="w-3 h-3" /> :
                       tech.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> :
                                                    <XCircle className="w-3 h-3" />}
                      {tech.status.charAt(0).toUpperCase() + tech.status.slice(1)}
                    </span>
                    {tech.is_online && (
                      <span className="badge bg-blue-50 text-blue-600 ml-1">🟢 Online</span>
                    )}
                  </td>
                  <td className="td text-gray-400 text-xs">
                    {new Date(tech.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="td">
                    <Link href={`/technicians/${tech.id}`} className="btn-ghost text-xs px-3 py-1.5">
                      Review →
                    </Link>
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
