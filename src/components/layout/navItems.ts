export const navItems = [
  { path: '/', label: '홈', icon: 'home' },
  { path: '/upload', label: '업로드', icon: 'upload' },
  { path: '/review', label: '오답', icon: 'review' },
  { path: '/settings', label: '설정', icon: 'settings' },
] as const

export type NavIcon = typeof navItems[number]['icon']
