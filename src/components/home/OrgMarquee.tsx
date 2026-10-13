import Image from 'next/image';
import type { GsocOrganization } from '@/lib/gsoc';
import Marquee from '../fx/Marquee';
import styles from './home.module.css';

/** Same order for everyone on a given day, a different slice each day. */
function dailyPick<T>(items: T[], count: number, day: number): T[] {
  let seed = day % 2147483647 || 1;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return [...items]
    .map(item => [next(), item] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, count)
    .map(([, item]) => item);
}

export default function OrgMarquee({ orgs, year, day }: { orgs: GsocOrganization[]; year: number; day: number }) {
  const picked = dailyPick(
    orgs.filter(org => org.logo),
    36,
    day
  );
  if (picked.length < 8) return null;

  return (
    <Marquee label={`Organizations mentoring in Google Summer of Code ${year}`} duration={90} gap={36}>
      {picked.map(org => (
        <span key={org.slug} className={styles.org}>
          <Image src={org.logo!} alt="" width={24} height={24} className={styles.orgLogo} unoptimized loading="lazy" />
          <span>{org.name}</span>
        </span>
      ))}
    </Marquee>
  );
}
