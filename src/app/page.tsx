import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 text-zinc-950">
      <section className="w-full max-w-2xl">
        <p className="mb-5 text-sm font-medium text-zinc-500">Aidee</p>
        <h1 className="max-w-xl text-4xl font-semibold leading-tight">
          아이디어를 제품 디자인 실행으로 연결하세요.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600">
          새 Aidee 앱은 기존 워크플로 로직을 옮기고, Figma wireframe 기반으로
          화면을 다시 조립합니다.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          시작하기
        </Link>
      </section>
    </main>
  )
}
