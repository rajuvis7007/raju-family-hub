// Supabase table row types — matches the migration schema exactly

export type AlbumRow = {
  id: string
  title: string
  description: string | null
  event_date: string | null        // YYYY-MM-DD
  created_by_member_id: string     // family member id, e.g. 'raju'
  cover_photo_url: string | null
  created_at: string               // ISO timestamp
}

export type PhotoRow = {
  id: string
  album_id: string
  storage_url: string              // full public CDN URL
  uploaded_by_member_id: string   // family member id
  created_at: string               // ISO timestamp
}

// Richer types used in UI
export type AlbumWithCount = AlbumRow & { photo_count: number }
export type AlbumWithPhotos = AlbumRow & { photos: PhotoRow[] }

// Supabase Storage bucket name
export const PHOTOS_BUCKET = 'photos'

// Build the storage path for a new upload
export function buildStoragePath(albumId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const slug = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
  return `albums/${albumId}/${Date.now()}_${slug}.${ext}`
}
