'use client'

// Custom Next.js image loader that routes all <Image> src URLs through
// Supabase Storage's on-the-fly transform API, converting to webp and
// resizing to the exact rendered width.  This keeps cellular load times
// fast even for 12-megapixel originals.
//
// Supabase transform endpoint:
//   /storage/v1/render/image/public/<bucket>/<path>?width=W&quality=Q&format=webp
//
// Note: image transforms require the Supabase Pro plan or higher.

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  try {
    const url = new URL(src.replace(
      '/storage/v1/object/',
      '/storage/v1/render/image/',
    ))
    url.searchParams.set('width', width.toString())
    url.searchParams.set('quality', (quality ?? 80).toString())
    url.searchParams.set('format', 'webp')
    url.searchParams.set('resize', 'cover')
    return url.href
  } catch {
    // Fallback to original URL if parsing fails (e.g. relative src in dev)
    return src
  }
}
