import type { Metadata } from 'next';
import { getPerks, PERKS_SOURCE } from '@/lib/perks';
import { EmptyState, PageHeader, Tag } from '@/components/ui/primitives';
import { PillLink, Pills } from '@/components/ui/Tabs';
import { IconArrowUpRight, IconGift, IconSearch } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from '../starter/starter.module.css';

export const metadata: Metadata = {
  title: 'Perks for open source',
  description: 'Free plans, credits and programs for open source projects and maintainers, refreshed daily from a public list.',
  alternates: { canonical: '/perks' },
};

type Params = { category?: string; q?: string };

function href(current: Params, patch: Partial<Params>) {
  const next = { ...current, ...patch };
  const search = new URLSearchParams();
  if (next.category) search.set('category', next.category);
  if (next.q) search.set('q', next.q);
  const query = search.toString();
  return query ? `/perks?${query}` : '/perks';
}

export default async function PerksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const { perks, fromList } = await getPerks();
  const categories = [...new Set(perks.map(perk => perk.category))];
  const counts = new Map(categories.map(category => [category, perks.filter(perk => perk.category === category).length]));
  const category = categories.find(name => name === raw.category);
  const q = (raw.q ?? '').trim().slice(0, 60);
  const needle = q.toLowerCase();
  const current: Params = { category, q: q || undefined };
  const visible = perks.filter(
    perk => (!category || perk.category === category) && (!needle || `${perk.name} ${perk.description} ${perk.category}`.toLowerCase().includes(needle))
  );

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="Perks for open source"
        description="Free plans, credits and programs that companies offer open source projects and their maintainers. Check each offer's terms on the company's page before you apply."
      />
      <div className={styles.filters}>
        <form action="/perks" method="get" className={styles.search} role="search">
          <IconSearch size={15} aria-hidden="true" />
          <label htmlFor="perks-q" className="visually-hidden">
            Search perks
          </label>
          <input id="perks-q" name="q" defaultValue={q} placeholder="Search perks, companies, keywords…" className={styles.searchInput} />
          {category && <input type="hidden" name="category" value={category} />}
        </form>
        <Pills label="Category" scroll>
          <PillLink href={href(current, { category: undefined })} active={!category}>
            All {perks.length}
          </PillLink>
          {categories.map(name => (
            <PillLink key={name} href={href(current, { category: name })} active={name === category}>
              {name} {counts.get(name)}
            </PillLink>
          ))}
        </Pills>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<IconGift size={16} />} title="No perks match">
          Try another category or a shorter search.
        </EmptyState>
      ) : (
        <section aria-labelledby="perks-heading" className={styles.results}>
          <h2 id="perks-heading" className={styles.count}>
            {visible.length} {visible.length === 1 ? 'perk' : 'perks'}
          </h2>
          <ul className={rows.list}>
            {visible.map(perk => (
              <li key={`${perk.category}-${perk.url}`} className={rows.row} data-spotlight="wash">
                <div className={rows.main}>
                  <a href={perk.url} target="_blank" rel="noopener noreferrer" className={`${rows.title} ${rows.stretch}`}>
                    {perk.name}
                  </a>
                  <p className={rows.description}>{perk.description}</p>
                  <div className={rows.tags}>
                    <Tag tone="muted">{perk.category}</Tag>
                    {perk.checked && <Tag>Checked by Orion</Tag>}
                  </div>
                </div>
                <div className={rows.aside}>
                  <IconArrowUpRight size={14} aria-hidden="true" />
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            {fromList ? (
              <>
                Listed by{' '}
                <a href={PERKS_SOURCE} target="_blank" rel="noopener noreferrer">
                  Awesome OSS Perks
                </a>{' '}
                (public domain), refreshed daily, plus the offers Orion checked by hand. Know one that’s missing? Add it there.
              </>
            ) : (
              'The public perks list is unavailable right now, so this shows the offers Orion checked by hand.'
            )}
          </p>
        </section>
      )}
    </>
  );
}
