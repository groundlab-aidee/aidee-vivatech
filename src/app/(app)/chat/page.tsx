import { redirect } from 'next/navigation'

type ChatPageProps = {
  searchParams: Promise<{
    projectId?: string | string[]
  }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { projectId } = await searchParams
  const safeProjectId = typeof projectId === 'string' ? projectId : ''

  if (safeProjectId) {
    redirect(`/workspace/project/${safeProjectId}`)
  }

  redirect('/workspace')
}
