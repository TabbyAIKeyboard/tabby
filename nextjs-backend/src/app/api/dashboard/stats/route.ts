import { NextResponse } from 'next/server'

// Mock statistics data - will be replaced with real data later
export async function GET() {
  const stats = {
    totalCompletions: 12847,
    completionsChange: 24.5,
    avgLatency: 145,
    latencyChange: -12.3,
    activeSessions: 23,
    sessionsChange: 8.2,
    successRate: 98.7,
    successRateChange: 1.2,
    totalTokensUsed: 1250000,
    tokensChange: 15.4,
    memoriesStored: 342,
    memoriesChange: 28.1,
  }

  return NextResponse.json({ success: true, data: stats })
}
