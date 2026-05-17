// Canonical camelCase interfaces for the Photos feature.
// All snake_case DB rows are mapped HERE and never leak into components.

export interface Album {
  id: string
  title: string
  description: string | null
  eventDate: string | null      // YYYY-MM-DD
  createdBy: string             // family member id, e.g. 'raju'
  coverPhotoUrl: string | null
  photoCount: number
  createdAt: string             // ISO timestamp
}

export interface Photo {
  id: string
  albumId: string
  storageUrl: string
  mediaType: 'image' | 'video'
  caption: string | null
  uploadedBy: string            // family member id
  createdAt: string             // ISO timestamp
}

export type CreateAlbumInput = {
  title: string
  description?: string | null
  eventDate?: string | null
  createdBy: string
}

// ── Row → interface mappers ────────────────────────────────────

type AnyRow = Record<string, unknown>

export function rowToAlbum(row: AnyRow, photoCount = 0): Album {
  return {
    id:            row.id            as string,
    title:         row.title         as string,
    description:   (row.description  as string | null) ?? null,
    eventDate:     (row.event_date   as string | null) ?? null,
    createdBy:     row.created_by_member_id as string,
    coverPhotoUrl: (row.cover_photo_url as string | null) ?? null,
    photoCount,
    createdAt:     row.created_at    as string,
  }
}

export function rowToPhoto(row: AnyRow): Photo {
  return {
    id:         row.id          as string,
    albumId:    row.album_id    as string,
    storageUrl: row.storage_url as string,
    mediaType:  (row.media_type as string) === 'video' ? 'video' : 'image',
    caption:    (row.caption    as string | null) ?? null,
    uploadedBy: row.uploaded_by_member_id as string,
    createdAt:  row.created_at  as string,
  }
}

// ── Interface → insert payload mapper ─────────────────────────

export function albumToInsert(input: CreateAlbumInput) {
  return {
    title:                input.title,
    description:          input.description ?? null,
    event_date:           input.eventDate   ?? null,
    created_by_member_id: input.createdBy,
  }
}
