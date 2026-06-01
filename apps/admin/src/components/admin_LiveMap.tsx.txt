'use client'
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Technician, WorkOrder } from '@/types'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface LiveMapProps {
  technicians: Technician[]
  workOrders:  WorkOrder[]
}

export default function LiveMap({ technicians, workOrders }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const techMarkers  = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const jobMarkers   = useRef<Map<string, mapboxgl.Marker>>(new Map())

  // ── Initialize map once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-81.7, 41.5],   // Default: Northeast Ohio
      zoom: 10,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      techMarkers.current.clear()
      jobMarkers.current.clear()
    }
  }, [])

  // ── Update technician markers (live GPS dots) ────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const existingIds = new Set(techMarkers.current.keys())

    technicians.forEach(tech => {
      if (!tech.current_lat || !tech.current_lng) return
      existingIds.delete(tech.id)

      if (techMarkers.current.has(tech.id)) {
        // Update position
        techMarkers.current.get(tech.id)!.setLngLat([tech.current_lng, tech.current_lat])
      } else {
        // Create new marker
        const el = document.createElement('div')
        el.innerHTML = `
          <div style="position:relative;width:46px;height:46px;cursor:pointer;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(34,197,94,.25);
              animation:techPulse 2s infinite;
            "></div>
            <div style="
              position:absolute;inset:6px;border-radius:50%;
              background:#22C55E;border:3px solid #fff;
              box-shadow:0 3px 12px rgba(34,197,94,.6);
              display:flex;align-items:center;justify-content:center;
              font-size:16px;
            ">🧹</div>
          </div>
          <style>
            @keyframes techPulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.6);opacity:.15}}
          </style>
        `

        const popup = new mapboxgl.Popup({ offset: 28, closeButton: false })
          .setHTML(`
            <div style="font-family:Inter,sans-serif;min-width:160px;padding:4px 0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-size:18px;">🧹</span>
                <div>
                  <p style="font-weight:700;font-size:13px;margin:0;color:#166534;">${tech.full_name}</p>
                  <p style="font-size:11px;color:#16a34a;margin:0;">🟢 Online</p>
                </div>
              </div>
              ${tech.last_location_at
                ? `<p style="font-size:11px;color:#6B7280;margin:0;">Updated ${new Date(tech.last_location_at).toLocaleTimeString()}</p>`
                : ''}
            </div>
          `)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([tech.current_lng, tech.current_lat])
          .setPopup(popup)
          .addTo(map)

        techMarkers.current.set(tech.id, marker)
      }
    })

    // Remove markers for techs that went offline
    existingIds.forEach(id => {
      techMarkers.current.get(id)?.remove()
      techMarkers.current.delete(id)
    })
  }, [technicians])

  // ── Update job site markers (purple pins) ────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const existingIds = new Set(jobMarkers.current.keys())

    workOrders.forEach(wo => {
      if (!wo.job_lat || !wo.job_lng) return
      existingIds.delete(wo.id)

      if (!jobMarkers.current.has(wo.id)) {
        const el = document.createElement('div')
        el.innerHTML = `
          <div style="
            width:40px;height:40px;border-radius:50% 50% 50% 0;
            background:linear-gradient(135deg,#611a78,#c44df3,#f43f5e);
            transform:rotate(-45deg);border:3px solid #fff;
            box-shadow:0 4px 15px rgba(196,77,243,.5);
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:16px;">📋</span>
          </div>
        `

        const popup = new mapboxgl.Popup({ offset: 28, closeButton: false })
          .setHTML(`
            <div style="font-family:Inter,sans-serif;min-width:180px;padding:4px 0;">
              <p style="font-size:11px;font-weight:700;color:#c44df3;margin:0 0 2px;letter-spacing:.05em;">
                ${wo.wo_number}
              </p>
              <p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1a1a1a;">${wo.title}</p>
              <p style="font-size:12px;color:#555;margin:0 0 2px;">📍 ${wo.job_address}</p>
              <p style="font-size:12px;color:#555;margin:0 0 4px;">${wo.job_city}, ${wo.job_state}</p>
              <p style="font-size:11px;font-weight:600;color:${wo.status === 'in_progress' ? '#7C3AED' : '#2563EB'};margin:0;">
                ${wo.status === 'in_progress' ? '🔵 In Progress' : '🟡 Assigned'}
              </p>
            </div>
          `)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([wo.job_lng, wo.job_lat])
          .setPopup(popup)
          .addTo(map)

        jobMarkers.current.set(wo.id, marker)
      }
    })

    // Remove markers for completed/cancelled orders
    existingIds.forEach(id => {
      jobMarkers.current.get(id)?.remove()
      jobMarkers.current.delete(id)
    })
  }, [workOrders])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {/* Map legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 10,
        background: 'white', borderRadius: 12, padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12, fontFamily: 'Inter,sans-serif'
      }}>
        <p style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>Map Legend</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ color: '#555' }}>Technician (Online)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50% 50% 50% 0', background: '#c44df3', transform: 'rotate(-45deg)' }} />
            <span style={{ color: '#555', marginLeft: 4 }}>Job Site</span>
          </div>
        </div>
      </div>
    </div>
  )
}
