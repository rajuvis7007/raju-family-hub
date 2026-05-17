'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useFamily } from '../context/FamilyContext'
import { usePhotos } from '../context/PhotosContext'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { UploadFlow } from './UploadFlow'
import type { Album, Photo } from './PhotoTypes'
import type { FamilyMember } from '../context/FamilyContext'

// ── AlbumCardSkeleton ────────────────────────────────────────────────────────

function AlbumCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}

// ── EventAlbumCard ───────────────────────────────────────────────────────────

type AlbumCardProps = {
  album: Album
  creator: FamilyMember | undefined
  onClick: () => void
}

function EventAlbumCard({ album, creator, onClick }: AlbumCardProps) {
  function formatEventDate(d: string | null): string | null {
    if (!d) return null
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {album.coverPhotoUrl ? (
          <Image
            src={album.coverPhotoUrl}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}

        {/* Photo count badge */}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
        </div>
      </div>

      {/* Info */}
      <div className="px-3 pb-3 pt-2.5">
        <p className="truncate text-sm font-semibold text-slate-800">{album.title}</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          {formatEventDate(album.eventDate) ? (
            <span className="text-xs text-slate-400">{formatEventDate(album.eventDate)}</span>
          ) : (
            <span />
          )}
          {creator && (
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ${creator.colors.bg}`}
              title={creator.name}
            >
              {creator.initials}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── PhotoLightbox ────────────────────────────────────────────────────────────

type LightboxProps = {
  photos: Photo[]
  index: number
  memberById: Record<string, FamilyMember | undefined>
  onClose: () => void
  onNavigate: (index: number) => void
}

function PhotoLightbox({ photos, index, memberById, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index]
  const uploader = photo ? memberById[photo.uploadedBy] : undefined
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && hasPrev) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, index, hasPrev, hasNext])

  if (!photo) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {uploader && (
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${uploader.colors.bg}`}>
              {uploader.initials}
            </span>
          )}
          <div>
            {uploader && <p className="text-sm font-medium text-white">{uploader.name}</p>}
            <p className="text-xs text-white/50">
              {new Date(photo.createdAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums text-white/50">{index + 1} / {photos.length}</span>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative z-10 h-full w-full" onClick={(e) => e.stopPropagation()}>
          <Image
            key={photo.id}
            src={photo.storageUrl}
            alt={`Photo ${index + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
            className="absolute left-3 z-20 rounded-full bg-black/50 p-3 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
            aria-label="Previous"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
            className="absolute right-3 z-20 rounded-full bg-black/50 p-3 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
            aria-label="Next"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Filmstrip */}
      {photos.length > 1 && (
        <div className="shrink-0 overflow-x-auto">
          <div className="flex gap-1.5 px-4 py-3">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onNavigate(i)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md transition-all ${
                  i === index
                    ? 'opacity-100 ring-2 ring-white ring-offset-1 ring-offset-black'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Image
                  src={p.storageUrl}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── GalleryView ──────────────────────────────────────────────────────────────

function GalleryView() {
  const { members } = useFamily()
  const { activeAlbum, photos, isLoadingPhotos, photosError, closeAlbum, deletePhoto } = usePhotos()
  const [showUpload, setShowUpload] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))
  const creator = activeAlbum ? memberById[activeAlbum.createdBy] : undefined

  function formatEventDate(d: string | null) {
    if (!d) return null
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (!activeAlbum) return null

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb + header */}
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400">
            <button
              onClick={closeAlbum}
              className="transition-colors hover:text-indigo-600"
            >
              Photos
            </button>
            <span>/</span>
            <span className="font-medium text-slate-700">{activeAlbum.title}</span>
          </nav>

          <div className="flex items-start justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{activeAlbum.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                {formatEventDate(activeAlbum.eventDate) && (
                  <span>{formatEventDate(activeAlbum.eventDate)}</span>
                )}
                <span>
                  {isLoadingPhotos ? '…' : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}
                </span>
                {creator && (
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${creator.colors.bgLight} ${creator.colors.text}`}>
                    <span className={`h-2 w-2 rounded-full ${creator.colors.bg}`} />
                    {creator.name}
                  </span>
                )}
              </div>
              {activeAlbum.description && (
                <p className="mt-2 text-sm text-slate-500">{activeAlbum.description}</p>
              )}
            </div>

            <button
              onClick={() => setShowUpload(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Add Photos
            </button>
          </div>
        </div>

        {/* Error */}
        {photosError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {photosError}
          </div>
        )}

        {/* Loading */}
        {isLoadingPhotos ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No photos yet</p>
              <p className="mt-0.5 text-sm text-slate-400">Add the first photo to this album</p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              + Add photos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((photo, i) => {
              const uploader = memberById[photo.uploadedBy]
              return (
                <div
                  key={photo.id}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-slate-100"
                  onClick={() => setLightboxIndex(i)}
                >
                  <Image
                    src={photo.storageUrl}
                    alt={`Photo ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 17vw"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />

                  {uploader && (
                    <span className={`absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow opacity-0 transition-opacity group-hover:opacity-100 ${uploader.colors.bg}`}>
                      {uploader.initials}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePhoto(photo.id, activeAlbum.id)
                      if (lightboxIndex !== null && lightboxIndex >= i) {
                        setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : null)
                      }
                    }}
                    aria-label="Delete photo"
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadFlow
          preselectedAlbumId={activeAlbum.id}
          onClose={() => setShowUpload(false)}
        />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          memberById={memberById}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  )
}

// ── AlbumsView ───────────────────────────────────────────────────────────────

function AlbumsView() {
  const { members } = useFamily()
  const { albums, isLoadingAlbums, albumsError, fetchAlbums, openAlbum } = usePhotos()
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => { fetchAlbums() }, [fetchAlbums])

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Photos</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isLoadingAlbums
                ? 'Loading…'
                : `${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`}
            </p>
          </div>

          <button
            onClick={() => setShowUpload(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Photos
          </button>
        </div>

        {albumsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {albumsError}
          </div>
        )}

        {isLoadingAlbums ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <AlbumCardSkeleton key={i} />)}
          </div>
        ) : albums.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No albums yet</p>
              <p className="mt-0.5 text-sm text-slate-400">Upload photos to create your first album</p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              + Upload photos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((album) => (
              <EventAlbumCard
                key={album.id}
                album={album}
                creator={memberById[album.createdBy]}
                onClick={() => openAlbum(album)}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadFlow
          onClose={() => setShowUpload(false)}
          onDone={() => fetchAlbums()}
        />
      )}
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PhotosPage() {
  const { view } = usePhotos()

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="rounded-2xl border-2 border-dashed border-slate-200 px-8 py-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900">Connect Supabase to use Photos</h2>
          <p className="mt-2 text-sm text-slate-500">
            Copy{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local.example</code>
            {' '}to{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code>
            {' '}and fill in your credentials.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-600">
            {`NEXT_PUBLIC_SUPABASE_URL=https://….supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…`}
          </pre>
          <p className="mt-4 text-xs text-slate-400">
            Then run the migration in{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">supabase/migrations/001_photos_schema.sql</code>
          </p>
        </div>
      </div>
    )
  }

  return view === 'gallery' ? <GalleryView /> : <AlbumsView />
}
