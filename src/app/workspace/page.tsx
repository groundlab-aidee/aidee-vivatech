import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function WorkspacePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName =
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email?.split('@')[0] ??
    '사용자'

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10 text-zinc-950">
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">Aidee workspace</p>
            <h1 className="text-3xl font-semibold">{displayName}님</h1>
          </div>

          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium transition hover:bg-zinc-50"
            >
              로그아웃
            </button>
          </form>
        </header>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm leading-6 text-zinc-600">
            Google OAuth와 보호 라우트가 연결됐습니다. 이 화면을 새 workspace
            UI로 확장하면 됩니다.
          </p>
        </div>
      </section>
    </main>
  )
}
