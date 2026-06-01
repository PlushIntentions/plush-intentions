'use client'
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface JobMapProps {
  jobLat: number
  jobLng: number
  jobAddress: string
  techLat?: number | null
  techLng?: number | null
}

export default function JobMap({ jobLat, jobLng, jobAddress, techLat, techLng }: JobMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [jobLng, jobLat],
      zoom: 13,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      // Job site marker
      const jobEl = document.createElement('div')
      jobEl.innerHTML = `<div style="width:40px;height:40px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#611a78,#c44df3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(196,77,243,0.6);font-size:18px"><span style="transform:rotate(45deg)">📍</span></div>`

      new mapboxgl.Marker({ element: jobEl })
        .setLngLat([jobLng, jobLat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`<div style="font-family:sans-serif;color:#1a1a1a"><p style="font-weight:700;margin:0">Job Site</p><p style="font-size:11px;margin:2px 0 0">${jobAddress}</p></div>`))
        .addTo(map)

      // Technician marker if location available
      if (techLat && techLng) {
        const techEl = document.createElement('div')
        techEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,185,129,0.5);border:2px solid rgba(255,255,255,0.2);font-size:16px">🧹</div>`

        new mapboxgl.Marker({ element: techEl })
          .setLngLat([techLng, techLat])
          .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false })
            .setHTML(`<div style="font-family:sans-serif;color:#1a1a1a"><p style="font-weight:700;margin:0">Your Location</p></div>`))
          .addTo(map)

        // Draw route line between tech and job
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
          paint: { 'line-color': '#c44df3', 'line-width': 3, 'line-dasharray': [2, 2] },
        })

        // Fit map to show both markers
        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([techLng, techLat])
        bounds.extend([jobLng, jobLat])
        map.fitBounds(bounds, { padding: 80 })
      }
    })

    return () => { map.remove() }
  }, [jobLat, jobLng, techLat, techLng])

  return <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
}
