export function validateCardId (_id: string): boolean {
  if (!_id.startsWith('c')) {
    return false;
  }
  return true;
}
