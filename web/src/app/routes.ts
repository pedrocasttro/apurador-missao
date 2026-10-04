export const appRoutes = [
  { href: '/', slug: '', label: 'Visão geral', title: 'Visão geral' },
  { href: '/presidente/', slug: 'presidente', label: 'Presidente', title: 'Presidência' },
  { href: '/senado/', slug: 'senado', label: 'Senado', title: 'Senado Federal' },
  { href: '/cadeiras/', slug: 'cadeiras', label: 'Cadeiras', title: 'Cadeiras' },
  { href: '/missao/', slug: 'missao', label: 'Missão', title: 'Missão' },
  { href: '/explorar/', slug: 'explorar', label: 'Explorar', title: 'Explorar' },
] as const;

export const routeFromPath = (pathname: string) =>
  appRoutes.find((route) => route.href === pathname || route.href === `${pathname}/`) ?? appRoutes[0];
