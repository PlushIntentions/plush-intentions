'use client'
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface JobMapProps {
  lat: number
  lng: number
  address: string
}

export default function JobMap({ lat, lng, address }: JobMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: 15,
    })

    // Custom marker element
    const el = document.createElement('div')
    el.className = 'job-marker'
    el.style.cssText = `
      width: 40px; height: 40px; border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg, #611a78 0%, #c44df3 50%, #f43f5e 100%);
      transform: rotate(-45deg); border: 3px solid white;
      box-shadow: 0 4px 15px rgba(196,77,243,0.5);
    `

    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
      .setHTML(`
        <div style="font-family:Inter,sans-serif;padding:8px 4px;">
          <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#1a1a1a;">📍 Job Location</p>
          <p style="font-size:12px;color:#666;margin:0;">${address}</p>
        </div>
      `)

    new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map)

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [lat, lng, address])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
