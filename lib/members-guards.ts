export function shouldBlockDuplicateActiveEnrollment(
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BANNED',
  hasDuplicate: boolean
) {
  return status === 'ACTIVE' && hasDuplicate
}
