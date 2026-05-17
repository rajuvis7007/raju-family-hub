@AGENTS.md

# Raju Family Dashboard

A private family hub for Raju, Joshna, Amrita, and Shreya. Four tabs: Dashboard, Photos, Tasks, Calendar. Built with Next.js 16.2.6 / React 19 / Tailwind v4 / Supabase. Next planned step: **Capacitor for native Android/iOS**.

---

## Tech Stack

| Layer | Detail |
|---|---|
| Framework | Next.js 16.2.6, App Router, `'use client'` on all interactive components |
| UI | React 19.2.4, Tailwind CSS v4 (`@import "tailwindcss"` — no config file, no `tailwind.config.js`) |
| Database + Storage | Supabase JS v2 — plain `SupabaseClient` (no `Database` generic — causes `never` types) |
| Type safety | All Supabase rows cast to `Record<string, unknown>`, mapped via local `rowToX()` functions |
| Native (planned) | Capacitor — wraps the Next.js build in a native shell for Android/iOS |

---

## Project Structure

```
app/
  page.tsx                   # Dashboard — live tasks + calendar events widgets
  layout.tsx                 # Root layout — provider chain + AppShell
  globals.css                # Tailwind v4 import, no utility config
  components/
    AppShell.tsx             # Sidebar + sticky top bar (bell icon, member avatar)
    Sidebar.tsx              # Desktop fixed / mobile slide-over nav + bell button
  context/
    FamilyContext.tsx        # Static member list + activeMember state
    TasksContext.tsx         # Tasks CRUD, attachment uploads, done-task pagination
    PhotosContext.tsx        # Albums + photos CRUD, album pagination (24/page)
    CalendarContext.tsx      # Events CRUD, eventsError state
    NotificationsContext.tsx # Browser notification scheduling (60s interval)
    ToastContext.tsx         # Toast queue (success/error/info, auto-dismiss 4.5s)
  tasks/
    page.tsx                 # Task list with open/done split + Load more
    TaskRow.tsx              # Row with checkbox, due-date badge, paperclip, delete
    NewTaskModal.tsx         # Create task modal with attachment picker
    MemberFilter.tsx         # Filter pill bar
  photos/
    page.tsx                 # Albums grid + gallery view (all inline components)
    UploadFlow.tsx           # Multi-step upload modal (pick → album → upload → done)
    PhotoTypes.ts            # Album/Photo types + row mappers + albumToInsert
  calendar/
    page.tsx                 # Monthly 42-cell grid, DayDetailModal, CreateEventModal
lib/
  supabase/
    client.ts                # getSupabaseClient(), isSupabaseConfigured()
    image-loader.ts          # Next.js loaderFile for Supabase image transforms (WebP)
    types.ts                 # PHOTOS_BUCKET, buildStoragePath()
supabase/migrations/
  001_photos_schema.sql      # albums, photos tables; photos storage bucket + RLS policies
  002_add_media_type.sql     # adds media_type column to photos (image|video)
  003_tasks_schema.sql       # tasks, task_attachments tables; task-attachments bucket + RLS
  004_events_schema.sql      # events table
  005_bucket_size_limits.sql # 200 MB cap on photos bucket, 50 MB on task-attachments
```

---

## Provider Chain (layout.tsx)

```tsx
<ToastProvider>
  <FamilyProvider>
    <TasksProvider>
      <PhotosProvider>
        <CalendarProvider>
          <NotificationsProvider>
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </CalendarProvider>
      </PhotosProvider>
    </TasksProvider>
  </FamilyProvider>
</ToastProvider>
```

Order matters: `NotificationsProvider` must be inside `TasksProvider` and `CalendarProvider` because it consumes both.

---

## Family Members

Defined statically in `FamilyContext.tsx`. **All Tailwind color class strings must be complete static strings** — no dynamic string construction (`bg-${color}-500`) because Tailwind v4 scans source files for class names.

| Member | ID | Colors |
|---|---|---|
| Raju | `raju` | indigo |
| Joshna | `joshna` | rose |
| Amrita | `amrita` | emerald |
| Shreya | `shreya` | amber |

---

## Supabase Patterns — Critical

### Client
Always use `getSupabaseClient()` from `app/lib/supabase/client.ts`. Returns `null` if env vars missing. Never use `createClient<Database>()` — the generic causes insert types to resolve to `never[]`.

### Row mapping
Never use Supabase row types directly in components. Every table has a `rowToX(row: Record<string, unknown>)` mapper in its context or `PhotoTypes.ts`.

### Storage RLS — the gotcha
`public: true` on a bucket only enables CDN reads. Anon upload/delete **always** require explicit `storage.objects` policies:
```sql
create policy "allow anon upload"
  on storage.objects for insert to anon
  with check (bucket_id = 'your-bucket');

create policy "allow anon delete"
  on storage.objects for delete to anon
  using (bucket_id = 'your-bucket');
```
Wrap in a `DO $$ ... $$` block with `pg_policies` check so migrations are idempotent (see migration 003).

### Time columns
Supabase returns `time` columns as `"HH:MM:SS"`. Slice to `"HH:MM"` before storing in state or binding to `<input type="time">`.

### Idempotent migrations
Wrap `CREATE POLICY` in `DO $$ begin if not exists (select 1 from pg_policies where ...) then execute $p$...$p$; end if; end $$;`

---

## Date Handling

Always parse date strings with a local-time suffix to avoid UTC shift:
```ts
new Date(dateStr + 'T00:00:00')   // ✅ local time
new Date(dateStr)                  // ❌ treated as UTC midnight
```

For today's date as `YYYY-MM-DD` in local time: `toLocaleDateString('en-CA')` or build manually:
```ts
const d = new Date()
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
```

---

## Attachment / Upload Patterns

**File size limits** (enforced client-side via `validateAttachmentSize()` in TasksContext + in UploadFlow, and server-side via bucket policies):
- Images / audio / PDF: 20 MB
- Videos (tasks): 200 MB
- Photos bucket: 200 MB total per file

**Media type detection**: `file.type.startsWith('image/')`, `video/`, `audio/`; anything else → `'pdf'`.

**Storage paths**:
- Photos: `{albumId}/{timestamp}_{slug}.{ext}` via `buildStoragePath()`
- Task attachments: `tasks/{taskId}/{timestamp}_{slug}.{ext}` via `buildAttachmentPath()`

**Error surface**: `addTask` and `addAttachments` return `{ failedNames: string[] }`. Callers show error toasts via `useToast()`. Never swallow upload errors silently.

---

## Pagination

| Feature | Strategy |
|---|---|
| Tasks (open) | Always fetch all — you always want every open task |
| Tasks (done) | 20 per page — `loadMoreDone()`, `hasMoreDone` |
| Albums | 24 per page — `loadMoreAlbums()`, `hasMoreAlbums` |
| Photos (per album) | All at once — albums are browsed one at a time |
| Events | All at once — calendar is monthly, families don't create thousands |

Use `.range(offset, offset + PAGE_SIZE - 1)` with `.select('*', { count: 'exact', head: true })` for totals.

---

## Notifications

`NotificationsContext` fires OS browser notifications (requires permission) via `new Notification()`. Checks every 60 seconds. Deduplicates using `localStorage` keys prefixed `rfdb_notif_` — one notification per item per day. Keys from prior days are pruned on each check.

Fires for: overdue tasks, tasks due today, events today (once), events starting within 30 minutes.

**Next step**: When Capacitor is added, replace `new Notification()` with `@capacitor/local-notifications` — the check logic stays the same.

---

## Toast System

`useToast().addToast(message, type)` where `type` is `'success' | 'error' | 'info'`. Auto-dismisses after 4.5 s, max 3 toasts stacked, manually dismissable. Rendered inside `ToastProvider` at the root — no separate portal needed.

---

## Image Optimisation

Custom Next.js loader at `app/lib/supabase/image-loader.ts` routes through `/storage/v1/render/image/public/` for WebP conversion. Configured via `loaderFile` in `next.config`. Do not change the loader without checking Supabase image transform URL format.

---

## Pending: Capacitor

When Capacitor work begins:
1. `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios`
2. `npx cap init "Raju Family" com.rajufamily.dashboard`
3. Build Next.js as static export (`output: 'export'` in next.config) — or use Capacitor's built-in server mode
4. Replace `new Notification()` in NotificationsContext with `@capacitor/local-notifications`
5. Add `@capacitor/camera` if native camera upload is wanted
6. `npx cap add android && npx cap add ios`

RLS is disabled across all tables — fine for a private family app, but review before any public distribution.
