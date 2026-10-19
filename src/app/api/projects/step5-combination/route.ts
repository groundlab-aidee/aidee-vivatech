import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const SHAPES = ['직선으로 둘러싸인 다각형', '곡선으로 이루어진 도형', '직선과 곡선이 결합된 도형']
const FORMS = ['기하학적 형태', '유기적 형태', '복합 형태']

export async function POST(request: Request) {
  try {
    const { projectId, shape, form, previousCombination, saveOnly } = await request.json()
    if (typeof projectId !== 'string' || !SHAPES.includes(shape) || !FORMS.includes(form)) {
      return NextResponse.json({ error: 'Invalid combination' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: project, error } = await supabase
      .from('projects').select('id, requirements').eq('id', projectId).eq('user_id', user.id).single()
    if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const requirements = project.requirements && typeof project.requirements === 'object' && !Array.isArray(project.requirements)
      ? project.requirements as Record<string, unknown>
      : {}
    const existing = Array.isArray(requirements.step5CombinationHistory)
      ? requirements.step5CombinationHistory
      : []
    if (existing.length === 0 && previousCombination && SHAPES.includes(previousCombination.shape) && FORMS.includes(previousCombination.form)) {
      existing.push(previousCombination)
    }
    const current = requirements.step5Combination && typeof requirements.step5Combination === 'object'
      ? requirements.step5Combination as Record<string, unknown>
      : null
    if (existing.length === 0 && current && SHAPES.includes(current.shape as string) && FORMS.includes(current.form as string)) {
      existing.push(current)
    }
    const history = saveOnly
      ? existing
      : [...existing, { shape, form, createdAt: new Date().toISOString() }]
    const { error: updateError } = await supabase.from('projects').update({
      requirements: { ...requirements, step5Combination: { shape, form }, step5CombinationHistory: history },
    }).eq('id', projectId).eq('user_id', user.id)
    if (updateError) throw updateError
    return NextResponse.json({ shape, form, history })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
