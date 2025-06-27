import { NextResponse } from 'next/server'

export async function GET() {
  const buildTime = process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev'
  const deployTime = new Date().toISOString()
  
  return NextResponse.json({
    status: 'ok',
    buildTime,
    deployTime,
    timestamp: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    nodeEnv: process.env.NODE_ENV
  })
} 