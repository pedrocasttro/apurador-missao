import { notFound } from 'next/navigation';
import { appRoutes } from '../routes';
import { PresidentPage } from '../../components/president-page';

export function generateStaticParams() {
  return appRoutes.filter((route) => route.slug).map((route) => ({ section: route.slug }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!appRoutes.some((route) => route.slug === section)) notFound();
  if (section === 'presidente') return <PresidentPage />;
  return null;
}
