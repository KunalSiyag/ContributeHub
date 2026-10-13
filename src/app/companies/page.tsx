import type { Metadata } from 'next';
import { getYcOpenSource, YC_SOURCE, type YcCompany } from '@/lib/yc';
import { ButtonAnchor } from '@/components/ui/Button';
import { Avatar, EmptyState, PageHeader, Tag } from '@/components/ui/primitives';
import { PillLink, Pills } from '@/components/ui/Tabs';
import { IconArrowUpRight, IconBuilding, IconGithub, IconSearch } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from '../starter/starter.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Open source companies',
  description: 'Y Combinator-backed companies building open source products, which ones are hiring, and where to find their code.',
  alternates: { canonical: '/companies' },
};

type Params = { status?: string; hiring?: string; industry?: string; year?: string; q?: string };

function href(current: Params, patch: Partial<Params>) {
  const next = { ...current, ...patch };
  const search = new URLSearchParams();
  if (next.status === 'all') search.set('status', 'all');
  if (next.hiring === '1') search.set('hiring', '1');
  if (next.industry) search.set('industry', next.industry);
  if (next.year) search.set('year', next.year);
  if (next.q) search.set('q', next.q);
  const query = search.toString();
  return query ? `/companies?${query}` : '/companies';
}

/** Batch years present in the data, newest first ("Winter 2023" → 2023). */
function batchYears(companies: YcCompany[]) {
  return [...new Set(companies.map(company => /\b(20\d\d)\b/.exec(company.batch)?.[1]).filter((year): year is string => Boolean(year)))].sort((a, b) => b.localeCompare(a));
}

function topIndustries(companies: YcCompany[]) {
  const tally = new Map<string, number>();
  for (const company of companies) for (const industry of company.industries) tally.set(industry, (tally.get(industry) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
}

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const all = await getYcOpenSource();
  const years = batchYears(all);
  const q = (raw.q ?? '').trim().slice(0, 60);
  const current: Params = {
    status: raw.status === 'all' ? 'all' : undefined,
    hiring: raw.hiring === '1' ? '1' : undefined,
    industry: raw.industry,
    year: years.find(year => year === raw.year),
    q: q || undefined,
  };
  const needle = q.toLowerCase();
  const visible = all.filter(
    company =>
      (current.status === 'all' || company.status === 'Active' || company.status === 'Public') &&
      (current.hiring !== '1' || company.hiring) &&
      (!current.industry || company.industries.includes(current.industry)) &&
      (!current.year || company.batch.endsWith(current.year)) &&
      (!needle || [company.name, company.oneLiner, company.location, company.batch, ...company.industries].some(value => value.toLowerCase().includes(needle)))
  );

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Open source companies"
        description="Companies backed by Y Combinator whose product is open source. Contributing to their repositories is real-world experience, and a growing number hire from their contributors."
      />
      <div className={styles.filters}>
        <form action="/companies" method="get" className={styles.search} role="search">
          <IconSearch size={15} aria-hidden="true" />
          <label htmlFor="companies-q" className="visually-hidden">
            Search companies
          </label>
          <input id="companies-q" name="q" defaultValue={q} placeholder="Search companies, industries, locations…" className={styles.searchInput} />
          {current.status && <input type="hidden" name="status" value={current.status} />}
          {current.hiring && <input type="hidden" name="hiring" value={current.hiring} />}
          {current.industry && <input type="hidden" name="industry" value={current.industry} />}
          {current.year && <input type="hidden" name="year" value={current.year} />}
        </form>
        <Pills label="Company status">
          <PillLink href={href(current, { status: undefined })} active={current.status !== 'all'}>
            Active
          </PillLink>
          <PillLink href={href(current, { status: 'all' })} active={current.status === 'all'}>
            Including acquired and inactive
          </PillLink>
          <PillLink href={href(current, { hiring: current.hiring === '1' ? undefined : '1' })} active={current.hiring === '1'}>
            Hiring now
          </PillLink>
        </Pills>
        <Pills label="YC batch year" scroll>
          <PillLink href={href(current, { year: undefined })} active={!current.year}>
            Every batch
          </PillLink>
          {years.map(year => (
            <PillLink key={year} href={href(current, { year })} active={year === current.year}>
              {year}
            </PillLink>
          ))}
        </Pills>
        <Pills label="Industry" scroll>
          <PillLink href={href(current, { industry: undefined })} active={!current.industry}>
            Every industry
          </PillLink>
          {topIndustries(all).map(industry => (
            <PillLink key={industry} href={href(current, { industry })} active={industry === current.industry}>
              {industry}
            </PillLink>
          ))}
        </Pills>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<IconBuilding size={16} />} title="No companies match">
          {all.length === 0 ? 'The company list is unavailable right now; try again later.' : 'Try fewer filters.'}
        </EmptyState>
      ) : (
        <section aria-labelledby="companies-heading" className={styles.results}>
          <h2 id="companies-heading" className={styles.count}>
            {visible.length} companies, newest batch first
          </h2>
          <ul className={rows.list}>
            {visible.map(company => (
              <li key={company.slug} className={`${rows.row} ${rows.withLead}`} data-spotlight="wash">
                <Avatar src={company.logo} name={company.name} size={36} square />
                <div className={rows.main}>
                  <div className={rows.context}>
                    <span>{company.batch}</span>
                    {company.teamSize ? (
                      <>
                        <span className={rows.sep}>·</span>
                        <span>{company.teamSize} people</span>
                      </>
                    ) : null}
                    {company.location && (
                      <>
                        <span className={rows.sep}>·</span>
                        <span>{company.location.split(';')[0]}</span>
                      </>
                    )}
                  </div>
                  <a href={company.website ?? company.url} target="_blank" rel="noopener noreferrer" className={`${rows.title} ${rows.stretch}`}>
                    {company.name}
                  </a>
                  {company.oneLiner && <p className={rows.description}>{company.oneLiner}</p>}
                  <div className={rows.tags}>
                    {company.hiring && <Tag tone="accent">Hiring</Tag>}
                    {company.status !== 'Active' && <Tag tone="muted">{company.status}</Tag>}
                    {company.industries.slice(0, 3).map(industry => (
                      <Tag key={industry} tone="muted">
                        {industry}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div className={rows.aside}>
                  <a
                    href={`https://github.com/search?q=${encodeURIComponent(company.name)}&type=users`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={rows.externalIcon}
                    title="Find them on GitHub"
                    aria-label={`Find ${company.name} on GitHub`}
                  >
                    <IconGithub size={15} />
                  </a>
                  <ButtonAnchor href={company.url} variant="secondary" size="sm">
                    YC profile
                    <IconArrowUpRight size={13} />
                  </ButtonAnchor>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            From the{' '}
            <a href={YC_SOURCE} target="_blank" rel="noopener noreferrer">
              yc-oss
            </a>{' '}
            snapshot of Y Combinator&rsquo;s public directory (companies tagged Open Source), refreshed daily.
          </p>
        </section>
      )}
    </>
  );
}
