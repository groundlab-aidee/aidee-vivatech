type UserMetadata = Record<string, unknown>

export function getCleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getMetadataString(metadata: UserMetadata, key: string) {
  return getCleanString(metadata[key])
}

function normalizeGoogleAvatarUrl(url: string) {
  if (!url.includes('googleusercontent.com')) {
    return url
  }

  return url.replace(/=s\d+(-c)?$/, '=s256-c')
}

export function getUserAvatarUrl(metadata: UserMetadata) {
  const avatarUrl =
    getMetadataString(metadata, 'avatar_url') ??
    getMetadataString(metadata, 'picture') ??
    getMetadataString(metadata, 'avatarUrl')

  return avatarUrl ? normalizeGoogleAvatarUrl(avatarUrl) : null
}

export function getResolvedAvatarUrl({
  metadata,
  profileAvatarUrl,
}: {
  metadata: UserMetadata
  profileAvatarUrl?: unknown
}) {
  const avatarUrl = getCleanString(profileAvatarUrl) ?? getUserAvatarUrl(metadata)

  return avatarUrl ? normalizeGoogleAvatarUrl(avatarUrl) : null
}

export function getUserFullName(metadata: UserMetadata) {
  return (
    getMetadataString(metadata, 'full_name') ??
    getMetadataString(metadata, 'name')
  )
}
