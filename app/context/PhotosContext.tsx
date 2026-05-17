'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'
import { PHOTOS_BUCKET, buildStoragePath } from '../lib/supabase/types'
import {
  rowToAlbum,
  rowToPhoto,
  albumToInsert,
  type Album,
  type Photo,
  type CreateAlbumInput,
} from '../photos/PhotoTypes'

// ── Per-file upload tracking (exported so UploadFlow can type it) ──

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'

export type FileUploadState = {
  id: string
  file: File
  previewUrl: string
  status: UploadStatus
  errorMsg?: string
}

export type UploadProgress = Record<string, FileUploadState>

// ── View state ────────────────────────────────────────────────

type View = 'albums' | 'gallery'

type State = {
  view: View
  albums: Album[]
  activeAlbum: Album | null
  photos: Photo[]
  isLoadingAlbums: boolean
  isLoadingPhotos: boolean
  albumsError: string | null
  photosError: string | null
}

// ── Context value ─────────────────────────────────────────────

type ContextValue = State & {
  fetchAlbums: () => Promise<void>
  openAlbum:   (album: Album) => Promise<void>
  closeAlbum:  () => void
  createAlbum: (input: CreateAlbumInput) => Promise<Album | null>
  uploadPhotos: (
    albumId: string,
    files: File[],
    uploaderId: string,
    onProgress: (p: UploadProgress) => void,
  ) => Promise<Photo[]>
  deletePhoto: (photoId: string, albumId: string) => Promise<void>
}

const PhotosContext = createContext<ContextValue>({} as ContextValue)

// ── Provider ──────────────────────────────────────────────────

export function PhotosProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    view:            'albums',
    albums:          [],
    activeAlbum:     null,
    photos:          [],
    isLoadingAlbums: false,
    isLoadingPhotos: false,
    albumsError:     null,
    photosError:     null,
  })

  // ── fetchAlbums ─────────────────────────────────────────────

  const fetchAlbums = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    setState((s) => ({ ...s, isLoadingAlbums: true, albumsError: null }))

    const { data, error } = await supabase
      .from('albums')
      .select('*, photos(count)')
      .order('created_at', { ascending: false })

    if (error) {
      setState((s) => ({ ...s, isLoadingAlbums: false, albumsError: error.message }))
      return
    }

    const albums = (data ?? []).map((row: Record<string, unknown>) => {
      const counts = row.photos as [{ count: number }] | undefined
      return rowToAlbum(row, counts?.[0]?.count ?? 0)
    })

    setState((s) => ({ ...s, albums, isLoadingAlbums: false }))
  }, [])

  // ── openAlbum ───────────────────────────────────────────────

  const openAlbum = useCallback(async (album: Album) => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    setState((s) => ({
      ...s,
      view:            'gallery',
      activeAlbum:     album,
      photos:          [],
      isLoadingPhotos: true,
      photosError:     null,
    }))

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', album.id)
      .order('created_at', { ascending: true })

    if (error) {
      setState((s) => ({ ...s, isLoadingPhotos: false, photosError: error.message }))
      return
    }

    setState((s) => ({
      ...s,
      photos:          (data ?? []).map(rowToPhoto),
      isLoadingPhotos: false,
    }))
  }, [])

  // ── closeAlbum ──────────────────────────────────────────────

  const closeAlbum = useCallback(() => {
    setState((s) => ({ ...s, view: 'albums', activeAlbum: null, photos: [] }))
  }, [])

  // ── createAlbum ─────────────────────────────────────────────

  const createAlbum = useCallback(async (
    input: CreateAlbumInput,
  ): Promise<Album | null> => {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('albums')
      .insert(albumToInsert(input))
      .select()
      .single()

    if (error || !data) return null

    const album = rowToAlbum(data as Record<string, unknown>, 0)
    setState((s) => ({ ...s, albums: [album, ...s.albums] }))
    return album
  }, [])

  // ── uploadPhotos ────────────────────────────────────────────

  const uploadPhotos = useCallback(async (
    albumId: string,
    files: File[],
    uploaderId: string,
    onProgress: (p: UploadProgress) => void,
  ): Promise<Photo[]> => {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    // Seed progress map before first upload begins
    const progress: UploadProgress = Object.fromEntries(
      files.map((f) => {
        const id = `${f.name}-${f.size}`
        return [id, { id, file: f, previewUrl: URL.createObjectURL(f), status: 'pending' as UploadStatus }]
      }),
    )
    onProgress({ ...progress })

    const uploaded: Photo[] = []

    for (const file of files) {
      const id = `${file.name}-${file.size}`
      progress[id] = { ...progress[id], status: 'uploading' }
      onProgress({ ...progress })

      const path = buildStoragePath(albumId, file)

      const { error: storageErr } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (storageErr) {
        progress[id] = { ...progress[id], status: 'error', errorMsg: storageErr.message }
        onProgress({ ...progress })
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from(PHOTOS_BUCKET)
        .getPublicUrl(path)

      const { data: photoRow, error: dbErr } = await supabase
        .from('photos')
        .insert({ album_id: albumId, storage_url: publicUrl, uploaded_by_member_id: uploaderId })
        .select()
        .single()

      if (dbErr || !photoRow) {
        progress[id] = { ...progress[id], status: 'error', errorMsg: dbErr?.message }
        onProgress({ ...progress })
        continue
      }

      const photo = rowToPhoto(photoRow as Record<string, unknown>)
      uploaded.push(photo)
      progress[id] = { ...progress[id], status: 'done' }
      onProgress({ ...progress })
    }

    // Update state: photos list + album cover / count
    if (uploaded.length > 0) {
      await supabase
        .from('albums')
        .update({ cover_photo_url: uploaded[0].storageUrl })
        .eq('id', albumId)
        .is('cover_photo_url', null)

      setState((s) => ({
        ...s,
        photos: s.activeAlbum?.id === albumId ? [...s.photos, ...uploaded] : s.photos,
        albums: s.albums.map((a) =>
          a.id !== albumId ? a : {
            ...a,
            photoCount:    a.photoCount + uploaded.length,
            coverPhotoUrl: a.coverPhotoUrl ?? uploaded[0].storageUrl,
          }
        ),
      }))
    }

    return uploaded
  }, [])

  // ── deletePhoto ─────────────────────────────────────────────

  const deletePhoto = useCallback(async (photoId: string, albumId: string) => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    await supabase.from('photos').delete().eq('id', photoId)

    setState((s) => {
      const remaining = s.photos.filter((p) => p.id !== photoId)
      const newCover  = remaining.at(-1)?.storageUrl ?? null
      return {
        ...s,
        photos: remaining,
        albums: s.albums.map((a) =>
          a.id !== albumId ? a : {
            ...a,
            photoCount:    Math.max(0, a.photoCount - 1),
            coverPhotoUrl: newCover,
          }
        ),
      }
    })
  }, [])

  return (
    <PhotosContext.Provider value={{
      ...state,
      fetchAlbums, openAlbum, closeAlbum,
      createAlbum, uploadPhotos, deletePhoto,
    }}>
      {children}
    </PhotosContext.Provider>
  )
}

export function usePhotos() {
  return useContext(PhotosContext)
}
