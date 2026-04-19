'use client'

import { useEffect, useRef } from 'react'

interface Props {
  symbol?:    string
  height?:    number
  dateRange?: '1D' | '1M' | '3M' | '12M'
}

export default function TradingViewMiniChart({
  symbol    = 'OANDA:NAS100USD',
  height    = 220,
  dateRange = '1D',
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width:          '100%',
      height,
      locale:         'es',
      dateRange,
      colorTheme:     'dark',
      isTransparent:  true,
      autosize:       false,
      largeChartUrl:  '',
    })
    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [symbol, height, dateRange])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height, width: '100%', overflow: 'hidden', borderRadius: 12 }}
    />
  )
}
