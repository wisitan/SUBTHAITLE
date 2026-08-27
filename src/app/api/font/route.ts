import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const family = searchParams.get('family');
  
  if (!family) {
    return NextResponse.json({ error: 'Missing family' }, { status: 400 });
  }

  const cleanName = family.replace(/\s+/g, '+');
  // We fetch standard weight (400) and bold (700, 800) and EXPLICITLY request the Thai subset
  const cssUrl = `https://fonts.googleapis.com/css?family=${cleanName}:400,700,800&subset=thai,latin`;

  try {
    const cssRes = await fetch(cssUrl, {
      headers: {
        // Spoofing an old Android browser forces Google Fonts to return raw .ttf instead of .woff2
        // while avoiding bot-blocking that happens to 'curl' UA on Vercel IPs
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
      },
      cache: 'force-cache',
    });
    
    if (!cssRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch CSS from Google Fonts' }, { status: cssRes.status });
    }

    const cssText = await cssRes.text();
    
    // Extract the FIRST url(...) which is usually the regular/400 weight for the requested font
    // Handles optional quotes: url("https://...") or url('https://...') or url(https://...)
    const match = cssText.match(/url\(['"]?(https:\/\/[^'"\)]+\.ttf)['"]?\)/);
    
    if (match && match[1]) {
      return NextResponse.json({ url: match[1] });
    }
    
    return NextResponse.json({ error: 'TTF URL not found in CSS' }, { status: 404 });
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
