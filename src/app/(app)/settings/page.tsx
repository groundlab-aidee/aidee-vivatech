import { redirect } from 'next/navigation'

import {
  SettingsContent,
  type SettingsPlanId,
} from '@/components/settings/SettingsContent'
import { createClient } from '@/lib/supabase/server'

const planIds = new Set<SettingsPlanId>([
  'free',
  'basic',
  'pro',
  'business',
])

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/settings')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  const currentPlan = planIds.has(profile?.plan as SettingsPlanId)
    ? (profile?.plan as SettingsPlanId)
    : 'free'

  return <SettingsContent currentPlan={currentPlan} />
}
