export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!value) {
    throw new Error('Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  return value
}

export function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!value) {
    throw new Error(
      'Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return value
}

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL

  if (!value) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SITE_URL')
  }

  return value.replace(/\/$/, '')
}
