import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type DeleteProjectRequestBody = {
  projectId?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DeleteProjectRequestBody | null
  const projectId = typeof body?.projectId === 'string' ? body.projectId : ''

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const deleteSteps = [
    {
      name: 'agent_logs',
      query: supabase.from('agent_logs').delete().eq('project_id', projectId),
    },
    {
      name: 'messages',
      query: supabase.from('messages').delete().eq('project_id', projectId),
    },
    {
      name: 'project_reference_images',
      query: supabase
        .from('project_reference_images')
        .delete()
        .eq('project_id', projectId),
    },
    {
      name: 'projects',
      query: supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id),
    },
  ]

  for (const step of deleteSteps) {
    const { error } = await step.query

    if (error) {
      console.error('Failed to delete project step.', {
        code: error.code,
        message: error.message,
        step: step.name,
      })

      return NextResponse.json(
        { error: error.message, step: step.name },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ projectId })
}
