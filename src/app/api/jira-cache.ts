import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CACHE_PATH = path.resolve(process.cwd(), 'jira-issues-cache.json');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const useCache = searchParams.get('useCache') !== '0';
  // projectKey param is ignored for now (single cache file)
  try {
    if (useCache) {
      try {
        const raw = await fs.readFile(CACHE_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(raw));
      } catch (e) {
        // Cache does not exist, return 404
        return NextResponse.json({ error: 'Cache not found' }, { status: 404 });
      }
    } else {
      // If not using cache, just return 404 to force re-fetch in client logic
      return NextResponse.json({ error: 'Cache bypassed' }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read cache', details: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.issues)) {
      return NextResponse.json({ error: 'Invalid body, expected { issues: [...] }' }, { status: 400 });
    }
    // Overwrite the cache file
    await fs.writeFile(CACHE_PATH, JSON.stringify({ issues: body.issues }, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to write cache', details: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await fs.unlink(CACHE_PATH);
    return NextResponse.json({ success: true });
  } catch (err) {
    // If file does not exist, treat as success
    if ((err as any).code === 'ENOENT') {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Failed to delete cache', details: String(err) }, { status: 500 });
  }
} 