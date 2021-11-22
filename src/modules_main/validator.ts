export function validateCardId (_id: string): boolean {
  if (!_id) return false;
  if (!_id.startsWith('c')) {
    return false;
  }
  return true;
}
