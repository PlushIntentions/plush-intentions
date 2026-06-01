'use client'
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface AdminMapProps {
  jobLat:     number
  jobLng:     number
  jobAddress: string
  techLat:    number | null
  techLng:    number | null
  techName:   string | null
  techOnline: boolean
}

export default function AdminMap({
  jobLat, jobLng, jobAddress,
  techLat, techLng, techName, techOnline,
}: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const techMarker   = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Center between job and tech if both exist
    const centerLng = techLng ?? jobLng
    const centerLat = techLat ?? jobLat

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 13,
    })

    map.on('load', () => {
      // ── Job Site Marker (purple pin) ──────────────────────────
      const jobEl = document.createElement('div')
      jobEl.innerHTML = `
        <div style="
          width:44px;height:44px;border-radius:50% 50% 50% 0;
          background:linear-gradient(135deg,#611a78,#c44df3,#f43f5e);
          transform:rotate(-45deg);border:3px solid #fff;
          box-shadow:0 4px 20px rgba(196,77,243,.5);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:18px;">📍</span>
        </div>
      `

      new mapboxgl.Marker(jobEl)
        .setLngLat([jobLng, jobLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
            <div style="font-family:Inter,sans-serif;padding:6px 2px;">
              <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#611a78;">📍 Job Site</p>
              <p style="font-size:12px;color:#555;margin:0;">${jobAddress}</p>
            </div>
          `)
        )
        .addTo(map)

      // ── Tech Marker (blue pulsing dot) ────────────────────────
      if (techLat && techLng) {
        const techEl = document.createElement('div')
        techEl.innerHTML = `
          <div style="position:relative;width:44px;height:44px;">
            ${techOnline ? `<div style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(59,130,246,.3);
              animation:pulse 2s infinite;
            "></div>` : ''}
            <div style="
              position:absolute;inset:4px;border-radius:50%;
              background:${techOnline ? '#3B82F6' : '#9CA3AF'};
              border:3px solid #fff;
              box-shadow:0 3px 12px rgba(59,130,246,.5);
              display:flex;align-items:center;justify-content:center;
              font-size:16px;
            ">🧹</div>
          </div>
          <style>
            @keyframes pulse {
              0%,100%{transform:scale(1);opacity:.8}
              50%{transform:scale(1.5);opacity:.2}
            }
          </style>
        `

        const marker = new mapboxgl.Marker(techEl)
          .setLngLat([techLng, techLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div style="font-family:Inter,sans-serif;padding:6px 2px;">
                <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#1D4ED8;">🧹 ${techName ?? 'Technician'}</p>
                <p style="font-size:12px;color:#555;margin:0;">${techOnline ? '🟢 Currently Online' : '⚪ Offline'}</p>
              </div>
            `)
          )
          .addTo(map)

        techMarker.current = marker
      }

      // ── Fit bounds to show both markers ──────────────────────
      if (techLat && techLng) {
        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([jobLng, jobLat])
        bounds.extend([techLng, techLat])
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 })
      }

      // ── Route line between tech and job ───────────────────────
      if (techLat && techLng) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [[techLng, techLat], [jobLng, jobLat]],
            },
          },
        })
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#c44df3', 'line-width': 2, 'line-dasharray': [2, 4] },
        })
      }
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update tech marker position when it changes (real-time)
  useEffect(() => {
    if (techMarker.current && techLat && techLng) {
      techMarker.current.setLngLat([techLng, techLat])
    }
  }, [techLat, techLng])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
