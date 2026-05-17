'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { useFamily } from '../context/FamilyContext'
import { usePhotos, type UploadProgress } from '../context/PhotosContext'
import type { Album, CreateAlbumInput, Photo } from './PhotoTypes'

type Step = 'pick-files' | 'choose-album' | 'uploading' | 'done'

type Props = {
  /** When set, skips the album-selection list and shows the uploader picker only. */
  preselectedAlbumId?: string
  onClose: () => void
  onDone?: (photos: Photo[]) => void
}

// ── InlineAlbumForm ──────────────────────────────────────────────────────────

type InlineAlbumFormProps = {
  onCreated: (album: Album) => void
  onCancel: () => void
}

function InlineAlbumForm({ onCreated, onCancel }: InlineAlbumFormProps) {
  const { members } = useFamily()
  const { createAlbum } = usePhotos()
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = title.trim().length > 0 && creatorId !== null && !isSaving

  async function handleSave() {
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    const input: CreateAlbumInput = {
      title: title.trim(),
      eventDate: eventDate || null,
      createdBy: creatorId!,
    }
    const album = await createAlbum(input)
    setIsSaving(false)
    if (!album) { setError('Failed to create album.'); return }
    onCreated(album)
  }

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">New Album</p>

      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Album title…"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />

      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-600">Created by</p>
        <div className="flex gap-2">
          {members.map((m) => {
            const sel = creatorId === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setCreatorId(sel ? null : m.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 text-[11px] font-medium transition-all ${
                  sel
                    ? `${m.colors.border} ${m.colors.bgLight} ${m.colors.text}`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${m.colors.bg}`}>
                  {m.initials}
                </span>
                {m.name}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
        >
          {isSaving ? 'Creating…' : 'Create Album'}
        </button>
      </div>
    </div>
  )
}

// ── UploadFlow ───────────────────────────────────────────────────────────────

export function UploadFlow({ preselectedAlbumId, onClose, onDone }: Props) {
  const { members } = useFamily()
  const { albums, uploadPhotos } = usePhotos()

  const [step, setStep] = useState<Step>('pick-files')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(preselectedAlbumId ?? null)
  const [uploaderId, setUploaderId] = useState<string | null>(null)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>({})
  const [uploadedPhotos, setUploadedPhotos] = useState<Photo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId) ?? null
  const canProceed = files.length > 0
  const canUpload = selectedAlbumId !== null && uploaderId !== null && files.length > 0

  // ── File helpers ─────────────────────────────────────────────────────────

  function acceptFiles(newFiles: File[]) {
    const images = newFiles.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    const urls = images.map((f) => URL.createObjectURL(f))
    setFiles((prev) => [...prev, ...images])
    setPreviews((prev) => [...prev, ...urls])
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    setFiles((prev) => prev.filter((_, j) => j !== i))
    setPreviews((prev) => prev.filter((_, j) => j !== i))
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave() { setIsDragging(false) }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    acceptFiles(Array.from(e.dataTransfer.files))
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  const startUpload = useCallback(async () => {
    if (!selectedAlbumId || !uploaderId || files.length === 0) return
    setStep('uploading')
    const done = await uploadPhotos(selectedAlbumId, files, uploaderId, setProgress)
    setUploadedPhotos(done)
    setStep('done')
    onDone?.(done)
  }, [selectedAlbumId, uploaderId, files, uploadPhotos, onDone])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={(e) => { if (e.key === 'Escape' && step !== 'uploading') onClose() }}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={step !== 'uploading' ? onClose : undefined}
      />

      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {step === 'pick-files'   && 'Select Photos'}
            {step === 'choose-album' && 'Choose Album'}
            {step === 'uploading'    && 'Uploading…'}
            {step === 'done'         && 'Upload Complete'}
          </h2>
          {step !== 'uploading' && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step: pick-files ───────────────────────────────────────── */}
          {step === 'pick-files' && (
            <div className="space-y-4 p-6">
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-slate-600">
                  {isDragging ? 'Drop photos here' : 'Click or drag photos here'}
                </p>
                <p className="mt-1 text-xs text-slate-400">PNG, JPG, HEIC, WEBP supported</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => acceptFiles(Array.from(e.target.files ?? []))}
                />
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((url, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                      <Image
                        src={url}
                        alt={`Preview ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="25vw"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-500"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step: choose-album ─────────────────────────────────────── */}
          {step === 'choose-album' && (
            <div className="space-y-5 p-6">

              {/* If album is pre-selected, show it as a read-only badge */}
              {preselectedAlbumId && selectedAlbum ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    {selectedAlbum.coverPhotoUrl ? (
                      <Image
                        src={selectedAlbum.coverPhotoUrl}
                        alt={selectedAlbum.title}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">Adding to</p>
                    <p className="truncate text-sm font-semibold text-slate-800">{selectedAlbum.title}</p>
                  </div>
                </div>
              ) : (
                /* Full album picker */
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Album</p>

                  {albums.length > 0 && (
                    <div className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
                      {albums.map((album) => {
                        const sel = selectedAlbumId === album.id
                        return (
                          <button
                            key={album.id}
                            type="button"
                            onClick={() => { setSelectedAlbumId(album.id); setShowInlineForm(false) }}
                            className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                              sel
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                              {album.coverPhotoUrl ? (
                                <Image
                                  src={album.coverPhotoUrl}
                                  alt={album.title}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm font-medium ${sel ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {album.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                              </p>
                            </div>
                            {sel && (
                              <svg className="h-4 w-4 shrink-0 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {showInlineForm ? (
                    <InlineAlbumForm
                      onCreated={(album) => {
                        setSelectedAlbumId(album.id)
                        setShowInlineForm(false)
                      }}
                      onCancel={() => setShowInlineForm(false)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setSelectedAlbumId(null); setShowInlineForm(true) }}
                      className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      New album…
                    </button>
                  )}
                </div>
              )}

              {/* Uploader picker */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Uploading as</p>
                <div className="grid grid-cols-4 gap-2">
                  {members.map((m) => {
                    const sel = uploaderId === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setUploaderId(sel ? null : m.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-xs font-medium transition-all ${
                          sel
                            ? `${m.colors.border} ${m.colors.bgLight} ${m.colors.text}`
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${m.colors.bg}`}>
                          {m.initials}
                        </span>
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                {files.length} {files.length === 1 ? 'photo' : 'photos'} ready to upload
                {selectedAlbum && ` to "${selectedAlbum.title}"`}
              </p>
            </div>
          )}

          {/* ── Step: uploading ────────────────────────────────────────── */}
          {step === 'uploading' && (
            <div className="space-y-3 p-6">
              {Object.values(progress).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={item.previewUrl}
                      alt={item.file.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-600">{item.file.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {item.status === 'pending' && (
                        <span className="text-[10px] text-slate-400">Waiting…</span>
                      )}
                      {item.status === 'uploading' && (
                        <>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
                          </div>
                          <span className="text-[10px] text-indigo-500">Uploading</span>
                        </>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[10px] font-medium text-emerald-600">Done</span>
                      )}
                      {item.status === 'error' && (
                        <span className="truncate text-[10px] text-red-500">
                          {item.errorMsg ?? 'Error'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step: done ─────────────────────────────────────────────── */}
          {step === 'done' && (() => {
            const failed = Object.values(progress).filter((p) => p.status === 'error')
            const allFailed = uploadedPhotos.length === 0 && failed.length > 0
            return (
              <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                {allFailed ? (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}

                <div>
                  {uploadedPhotos.length > 0 && (
                    <p className="text-base font-semibold text-slate-900">
                      {uploadedPhotos.length} {uploadedPhotos.length === 1 ? 'photo' : 'photos'} uploaded
                      {selectedAlbum && <> to &ldquo;{selectedAlbum.title}&rdquo;</>}
                    </p>
                  )}
                  {failed.length > 0 && (
                    <div className="mt-2 space-y-1 text-left">
                      <p className="text-sm font-medium text-red-600">
                        {failed.length} {failed.length === 1 ? 'file' : 'files'} failed:
                      </p>
                      {failed.map((f) => (
                        <p key={f.id} className="text-xs text-red-500">
                          {f.file.name}: {f.errorMsg ?? 'Unknown error'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          {step === 'pick-files' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('choose-album')}
                disabled={!canProceed}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </>
          )}

          {step === 'choose-album' && (
            <>
              <button
                type="button"
                onClick={() => setStep('pick-files')}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={startUpload}
                disabled={!canUpload}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Upload {files.length > 0
                  ? `${files.length} ${files.length === 1 ? 'Photo' : 'Photos'}`
                  : 'Photos'}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
