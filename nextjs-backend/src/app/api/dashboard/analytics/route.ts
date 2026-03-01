import { NextResponse } from 'next/server'

// Generate mock time-series data
function generateTimeSeriesData(period: string) {
  const now = new Date()
  const data = []

  let count: number
  let interval: number
  let labelFormat: (date: Date) => string

  switch (period) {
    case 'minute':
      count = 60
      interval = 1000 * 60 // 1 minute
      labelFormat = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      break
    case 'hour':
      count = 24
      interval = 1000 * 60 * 60 // 1 hour
      labelFormat = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      break
    case 'day':
    default:
      count = 30
      interval = 1000 * 60 * 60 * 24 // 1 day
      labelFormat = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      break
  }

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * interval)
    const baseValue = 100 + Math.sin(i / 5) * 30
    data.push({
      time: labelFormat(date),
      completions: Math.floor(baseValue + Math.random() * 50),
      latency: Math.floor(120 + Math.random() * 60),
    })
  }

  return data
}

// Generate mock distribution data
function generateDistributionData() {
  return [
    { name: 'Code Completion', value: 45, fill: '#3b82f6' },
    { name: 'Chat', value: 25, fill: '#8b5cf6' },
    { name: 'Voice', value: 15, fill: '#f59e0b' },
    { name: 'Transcribe', value: 10, fill: '#10b981' },
    { name: 'Other', value: 5, fill: '#6b7280' },
  ]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'day'

  const data = {
    timeSeries: generateTimeSeriesData(period),
    distribution: generateDistributionData(),
  }

  return NextResponse.json({ success: true, data })
}
