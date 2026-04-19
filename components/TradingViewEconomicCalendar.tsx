'use client'

import { useEffect, useRef } from 'react'

interface Props {
  height?:           number
  countryFilter?:    string
  importanceFilter?: string
}

export default function TradingViewEconomicCalendar({
  height           = 400,
  countryFilter    = 'us,eu,jp',
  importanceFilter = '-1,0,1',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    const widgetEl = document.createElement('div')
    widgetEl.className = 'tradingview-widget-container__widget'
    container.appendChild(widgetEl)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme:       'dark',
      isTransparent:    true,
      width:            '100%',
      height,
      locale:           'es',
      importanceFilter,
      countryFilter,
    })
    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [height, countryFilter, importanceFilter])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height, width: '100%', overflow: 'hidden', borderRadius: 16 }}
    />
  )
}
