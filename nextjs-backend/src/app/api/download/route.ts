import { NextResponse } from 'next/server'

export async function GET() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  const REPO = 'CubeStar1/ai-keyboard'

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 })
  }

  try {
    // 1. Get the latest release info
    const releaseResponse = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 3600 }, // Cache release info for 1 hour
    })

    if (!releaseResponse.ok) {
      const error = await releaseResponse.text()
      console.error('Failed to fetch release info:', error)
      return NextResponse.json(
        { error: 'Failed to find latest release' },
        { status: releaseResponse.status }
      )
    }

    const releaseData = await releaseResponse.json()
    // Find the .exe asset (installer)
    const asset = releaseData.assets.find((a: any) => a.name.endsWith('.exe'))

    if (!asset) {
      return NextResponse.json(
        { error: 'No windows executable found in latest release' },
        { status: 404 }
      )
    }

    // 2. Fetch the actual asset content
    // For private repos, we need to fetch using the asset ID and octet-stream header
    const assetResponse = await fetch(
      `https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/octet-stream',
        },
      }
    )

    if (!assetResponse.ok) {
      console.error('Failed to fetch asset content:', assetResponse.statusText)
      return NextResponse.json(
        { error: 'Failed to download asset' },
        { status: assetResponse.status }
      )
    }

    // 3. Stream the response back to the client
    const response = new NextResponse(assetResponse.body)

    // Set appropriate headers for a download
    response.headers.set('Content-Type', 'application/octet-stream')
    response.headers.set('Content-Disposition', `attachment; filename="${asset.name}"`)
    response.headers.set('Content-Length', asset.size.toString())

    return response
  } catch (error: any) {
    console.error('Download proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
