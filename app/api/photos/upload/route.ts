// Mobile Native Share Sheet → API Layer → Supabase Storage + PostgreSQL
//
// To wire a PWA share target to this endpoint, add to public/manifest.json:
//   "share_target": {
//     "action": "/api/photos/upload",
//     "method": "POST",
//     "enctype": "multipart/form-data",
//     "params": { "files": [{ "name": "file", "accept": ["image/*"] }] }
//   }
//
// Expected FormData fields:
//   file              — image File
//   album_id          — UUID of target album
//   uploaded_by_member_id — e.g. 'raju'

import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { PHOTOS_BUCKET, buildStoragePath } from '@/app/lib/supabase/types'

export async function POST(request: Request) {
  let supabase: ReturnType<typeof getSupabaseServerClient>
  try {
    supabase = getSupabaseServerClient()
  } catch {
    return Response.json({ error: 'Supabase is not configured on this server.' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid multipart form data.' }, { status: 400 })
  }

  const file = formData.get('file')
  const albumId = formData.get('album_id')
  const memberId = formData.get('uploaded_by_member_id')

  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing "file" field.' }, { status: 400 })
  }
  if (typeof albumId !== 'string' || !albumId) {
    return Response.json({ error: 'Missing "album_id" field.' }, { status: 400 })
  }
  if (typeof memberId !== 'string' || !memberId) {
    return Response.json({ error: 'Missing "uploaded_by_member_id" field.' }, { status: 400 })
  }

  const storagePath = buildStoragePath(albumId, file)

  // 1. Upload binary to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 })
  }

  // 2. Resolve the public CDN URL
  const { data: { publicUrl } } = supabase.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(storagePath)

  // 3. Persist metadata in PostgreSQL
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({ album_id: albumId, storage_url: publicUrl, uploaded_by_member_id: memberId })
    .select()
    .single()

  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 })
  }

  // 4. Update album cover if it has none
  await supabase
    .from('albums')
    .update({ cover_photo_url: publicUrl })
    .eq('id', albumId)
    .is('cover_photo_url', null)

  return Response.json(photo, { status: 201 })
}
