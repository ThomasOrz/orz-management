'use client'

import { useEffect, useRef } from 'react'

interface Props {
  symbol?:   string
  interval?: string
  height?:   number
}

export default function TradingViewTechnicalAnalysis({
  symbol   = 'OANDA:NAS100USD',
  interval = '15m',
  height   = 425,
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      interval,
      width:            '100%',
      isTransparent:    true,
      height,
      symbol,
      showIntervalTabs: true,
      displayMode:      'single',
      locale:           'es',
      colorTheme:       'dark',
    })
    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [symbol, interval, height])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height, width: '100%', overflow: 'hidden', borderRadius: 16 }}
    />
  )
}
