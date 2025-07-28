import { NextRequest, NextResponse } from 'next/server'

// Configure for static export
export const dynamic = 'force-static'
export const revalidate = false

const JIRA_BASE_URL = process.env.JIRA_BASE_URL
const JIRA_EMAIL = process.env.JIRA_EMAIL
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Missing Jira environment variables')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 })
  }

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira configuration not found' }, { status: 500 })
  }

  try {
    // Use Agile API for board/sprint endpoints, Core API for others
    const isAgile = endpoint.startsWith('board') || endpoint.startsWith('sprint')
    const apiPath = isAgile ? '/rest/agile/1.0/' : '/rest/api/3/'
    
    // Build the URL with query parameters
    const url = new URL(`${JIRA_BASE_URL}${apiPath}${endpoint}`)
    
    // Add all query parameters except 'endpoint'
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        url.searchParams.append(key, value)
      }
    })
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Jira API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Jira' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 })
  }

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira configuration not found' }, { status: 500 })
  }

  try {
    const body = await request.json()
    // Use Agile API for board/sprint endpoints, Core API for others
    const isAgile = endpoint.startsWith('board') || endpoint.startsWith('sprint')
    const apiPath = isAgile ? '/rest/agile/1.0/' : '/rest/api/3/'
    const url = `${JIRA_BASE_URL}${apiPath}${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Jira API error:', error)
    return NextResponse.json(
      { error: 'Failed to post data to Jira' },
      { status: 500 }
    )
  }
} 