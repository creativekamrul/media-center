/** Nested screens always consume Back before root-tab navigation or Android exit. */
export function backDestination(hasDetail: boolean, tab: string): 'detail' | 'home' | 'exit' {
  if (hasDetail) return 'detail';
  return tab === 'Home' ? 'exit' : 'home';
}
