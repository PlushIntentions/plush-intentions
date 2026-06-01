'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ChevronLeft, Loader2, Clipboard, MapPin, User, Calendar, DollarSign } from 'lucide-react'
import type { Technician, Customer } from '@/types'
import { SERVICE_TYPES } from '@/types'

const schema = z.object({
  wo_number:      z.string().min(1, 'Work Order number is required'),
  title:          z.string().min(3, 'Title is required'),
  description:    z.string().min(10, 'Description is required'),
  service_type:   z.string().min(1, 'Service type is required'),
  priority:       z.enum(['low', 'medium', 'high', 'urgent']),
  customer_id:    z.string().optional(),
  assigned_tech_id: z.string().optional(),
  // Location
  job_address:    z.string().min(3, 'Job address is required'),
  job_city:       z.string().min(2, 'City is required'),
  job_state:      z.string().min(2, 'State is required'),
  job_zip:        z.string().min(5, 'ZIP is required'),
  job_lat:        z.coerce.number().optional(),
  job_lng:        z.coerce.number().optional(),
  // Scheduling
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  estimated_hours: z.coerce.number().optional(),
  estimated_cost:  z.coerce.number().optional(),
  notes:          z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewWorkOrderPage() {
  const router                            = useRouter()
  const [adminName, setAdminName]         = useState('Admin')
  const [technicians, setTechnicians]     = useState<Technician[]>([])
  const [customers, setCustomers]         = useState<Customer[]>([])
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [geocoding, setGeocoding]         = useState(false)

  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (p?.full_name) setAdminName(p.full_name)
      }
      const [{ data: techs }, { data: custs }] = await Promise.all([
        supabase.from('technicians').select('id, full_name, city, state').eq('status', 'approved').order('full_name'),
        supabase.from('customers').select('id, full_name, email').order('full_name'),
      ])
      if (techs)  setTechnicians(techs as Technician[])
      if (custs)  setCustomers(custs as Customer[])
    }
    load()
  }, [])

  const geocodeAddress = async () => {
    const addr = getValues()
    const query = `${addr.job_address}, ${addr.job_city}, ${addr.job_state} ${addr.job_zip}`
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
      )
      const data = await res.json()
      if (data.features?.[0]) {
        const [lng, lat] = data.features[0].center
        setValue('job_lat', lat)
        setValue('job_lng', lng)
      }
    } finally {
      setGeocoding(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload: any = {
        wo_number:       data.wo_number.trim().toUpperCase(),
        title:           data.title,
        description:     data.description,
        service_type:    data.service_type,
        priority:        data.priority,
        status:          data.assigned_tech_id ? 'assigned' : 'pending',
        job_address:     data.job_address,
        job_city:        data.job_city,
        job_state:       data.job_state,
        job_zip:         data.job_zip,
        notes:           data.notes || null,
      }

      if (data.job_lat)           payload.job_lat          = data.job_lat
      if (data.job_lng)           payload.job_lng          = data.job_lng
      if (data.scheduled_date)    payload.scheduled_date   = data.scheduled_date
      if (data.scheduled_time)    payload.scheduled_time   = data.scheduled_time
      if (data.estimated_hours)   payload.estimated_hours  = data.estimated_hours
      if (data.estimated_cost)    payload.estimated_cost   = data.estimated_cost
      if (data.customer_id)       payload.customer_id      = data.customer_id
      if (data.assigned_tech_id) {
        payload.assigned_tech_id = data.assigned_tech_id
        payload.assigned_by      = user?.id
        payload.assigned_at      = new Date().toISOString()
      }

      const { data: inserted, error: insertError } = await supabase
        .from('work_orders').insert(payload).select().single()
      if (insertError) throw insertError

      // Notify assigned technician
      if (data.assigned_tech_id && inserted) {
        const tech = technicians.find(t => t.id === data.assigned_tech_id)
        if (tech) {
          await supabase.from('notifications').insert({
            user_id: tech.user_id,
            title:   '📋 New Work Order Assigned',
            message: `Work Order ${data.wo_number} — "${data.title}" has been assigned to you.`,
            type:    'work_order_assigned',
            link:    `/work-orders/${inserted.id}`,
          })
        }
      }

      router.push(`/work-orders/${inserted.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create work order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar adminName={adminName} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="btn-ghost text-sm">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Create Work Order</h1>
            <p className="text-gray-500 mt-0.5">Enter all details for the new work order</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
          )}

          {/* Work Order Identity */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Clipboard className="w-5 h-5 text-plush-500" />
              <h2 className="text-lg font-display font-bold text-gray-900">Work Order Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Work Order Number * <span className="font-normal text-gray-400">(e.g. WO-1042)</span>
                </label>
                <input {...register('wo_number')} className="input-field font-mono"
                  placeholder="WO-1001" />
                {errors.wo_number && <p className="text-red-500 text-xs mt-1">{errors.wo_number.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Service Type *</label>
                <select {...register('service_type')} className="select-field">
                  <option value="">Select service type...</option>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.service_type && <p className="text-red-500 text-xs mt-1">{errors.service_type.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input {...register('title')} className="input-field"
                  placeholder="Brief description of the work order" />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <textarea {...register('description')} rows={4} className="input-field resize-none"
                  placeholder="Detailed description of the work to be performed..." />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority *</label>
                <select {...register('priority')} className="select-field">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes</label>
                <input {...register('notes')} className="input-field"
                  placeholder="Internal notes for your team..." />
              </div>
            </div>
          </div>

          {/* Job Location */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-plush-500" />
              <h2 className="text-lg font-display font-bold text-gray-900">Job Location</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Street Address *</label>
                <input {...register('job_address')} className="input-field" placeholder="123 Main Street" />
                {errors.job_address && <p className="text-red-500 text-xs mt-1">{errors.job_address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                <input {...register('job_city')} className="input-field" placeholder="Cleveland" />
                {errors.job_city && <p className="text-red-500 text-xs mt-1">{errors.job_city.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">State *</label>
                  <input {...register('job_state')} className="input-field" placeholder="OH" maxLength={2} />
                  {errors.job_state && <p className="text-red-500 text-xs mt-1">{errors.job_state.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ZIP *</label>
                  <input {...register('job_zip')} className="input-field" placeholder="44052" />
                  {errors.job_zip && <p className="text-red-500 text-xs mt-1">{errors.job_zip.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude</label>
                <input {...register('job_lat')} type="number" step="any" className="input-field font-mono text-sm" placeholder="Auto-filled on geocode" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude</label>
                <input {...register('job_lng')} type="number" step="any" className="input-field font-mono text-sm" placeholder="Auto-filled on geocode" />
              </div>
              <div className="col-span-2">
                <button type="button" onClick={geocodeAddress} disabled={geocoding}
                  className="btn-secondary gap-2 text-sm">
                  {geocoding ? <><Loader2 className="w-4 h-4 animate-spin" /> Geocoding...</> : <><MapPin className="w-4 h-4" /> Auto-Geocode Address</>}
                </button>
                <p className="text-xs text-gray-400 mt-1">Automatically fills lat/lng coordinates from the address using Mapbox</p>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-plush-500" />
              <h2 className="text-lg font-display font-bold text-gray-900">Assignment</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Technician</label>
                <select {...register('assigned_tech_id')} className="select-field">
                  <option value="">Unassigned (assign later)</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} — {t.city}, {t.state}</option>
                  ))}
                </select>
                {technicians.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No approved technicians available yet.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
                <select {...register('customer_id')} className="select-field">
                  <option value="">No customer linked</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scheduling & Billing */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5 text-plush-500" />
              <h2 className="text-lg font-display font-bold text-gray-900">Scheduling & Billing</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Scheduled Date</label>
                <input {...register('scheduled_date')} type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Scheduled Time</label>
                <input {...register('scheduled_time')} type="time" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Hours</label>
                <input {...register('estimated_hours')} type="number" step="0.5" min="0" className="input-field" placeholder="0.0" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Cost ($)</label>
                <input {...register('estimated_cost')} type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-8">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Work Order...</>
                : <><Clipboard className="w-4 h-4" /> Create Work Order</>}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
