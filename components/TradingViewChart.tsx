'use client'

import { useEffect, useRef } from 'react'

interface Props {
  symbol?:          string
  interval?:        string
  height?:          number
  hideTopToolbar?:  boolean
}

export default function TradingViewChart({
  symbol         = 'OANDA:NAS100USD',
  interval       = '15',
  height         = 500,
  hideTopToolbar = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Limpiar cualquier widget previo
    container.innerHTML = ''

    const widgetEl = document.createElement('div')
    widgetEl.className = 'tradingview-widget-container__widget'
    widgetEl.style.height = `${height}px`
    widgetEl.style.width = '100%'
    container.appendChild(widgetEl)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:           false,
      symbol,
      interval,
      timezone:           'America/New_York',
      theme:              'dark',
      style:              '1',
      locale:             'es',
      enable_publishing:  false,
      withdateranges:     true,
      hide_side_toolbar:  false,
      hide_top_toolbar:   hideTopToolbar,
      allow_symbol_change: false,
      save_image:         false,
      height,
      width:              '100%',
    })
    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [symbol, interval, height, hideTopToolbar])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height, width: '100%', overflow: 'hidden', borderRadius: 16 }}
    />
  )
}
