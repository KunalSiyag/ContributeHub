'use client';

import { useId, useMemo, useState } from 'react';
import { IconArrowUpRight, IconSearch } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Tabs';
import { EmptyState, Tag } from '@/components/ui/primitives';
import rows from '@/components/rows.module.css';
import { RESOURCES, RESOURCE_CATEGORIES, type Resource, type ResourceCategory } from '@/lib/resources';
import styles from './page.module.css';

type CategoryFilter = ResourceCategory | 'all';

const CATEGORY_LABEL = Object.fromEntries(RESOURCE_CATEGORIES.map(category => [category.id, category.label])) as Record<
  ResourceCategory,
  string
>;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function matches(resource: Resource, terms: string[]) {
  const haystack = `${resource.title} ${resource.description}`.toLowerCase();
  return terms.every(term => haystack.includes(term));
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function ResourceRow({ resource, showCategory }: { resource: Resource; showCategory: boolean }) {
  return (
    <li className={`${rows.row} ${styles.resourceRow}`}>
      <div className={rows.main}>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${rows.title} ${rows.stretch} ${styles.resourceTitle}`}
        >
          {resource.title}
          <IconArrowUpRight size={13} className={styles.external} />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        <p className={rows.description}>{resource.description}</p>
        <div className={styles.resourceMeta}>
          <span className={styles.host}>{hostOf(resource.url)}</span>
          {showCategory && (
            <>
              <span className={rows.sep} aria-hidden="true">
                ·
              </span>
              <span>{CATEGORY_LABEL[resource.category]}</span>
            </>
          )}
        </div>
      </div>
      <div className={rows.aside}>
        <Tag>{resource.type}</Tag>
      </div>
    </li>
  );
}

/** Searchable, filterable list of every resource. */
export default function ResourceLibrary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const searchId = useId();

  const trimmed = query.trim();
  const found = useMemo(() => {
    const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.length > 0 ? RESOURCES.filter(resource => matches(resource, terms)) : RESOURCES;
  }, [trimmed]);

  // Counts follow the search, so each category shows how many results it holds.
  const options = useMemo(() => {
    const counts = new Map<ResourceCategory, number>();
    for (const resource of found) counts.set(resource.category, (counts.get(resource.category) ?? 0) + 1);
    return [
      { id: 'all' as CategoryFilter, label: 'All', count: found.length },
      ...RESOURCE_CATEGORIES.map(entry => ({
        id: entry.id as CategoryFilter,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      })),
    ];
  }, [found]);

  const visible = category === 'all' ? found : found.filter(resource => resource.category === category);
  const active = RESOURCE_CATEGORIES.find(entry => entry.id === category);

  const clearSearch = () => {
    setQuery('');
    document.getElementById(searchId)?.focus();
  };

  const elsewhere = category !== 'all' ? found.length : 0;

  return (
    <div className={styles.libraryLayout}>
      <nav className={styles.categoryNav} aria-label="Resource categories">
        <span className={`eyebrow ${styles.navLabel}`} aria-hidden="true">
          Categories
        </span>
        <ul className={styles.navList}>
          {options.map(option => (
            <li key={option.id}>
              <button
                type="button"
                className={styles.navButton}
                aria-pressed={category === option.id}
                onClick={() => setCategory(option.id)}
              >
                <span className={styles.navText}>{option.label}</span>
                <span className={[styles.navCount, option.count === 0 && styles.navCountEmpty].filter(Boolean).join(' ')}>
                  {option.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.libraryMain}>
        <SearchInput
          id={searchId}
          value={query}
          onValueChange={setQuery}
          placeholder="Search titles and descriptions…"
          aria-label="Search resources"
          wrapperClassName={styles.search}
        />

        <div className={styles.pillScroller} role="group" aria-label="Resource categories">
          {options.map(option => (
            <Pill
              key={option.id}
              pressed={category === option.id}
              onClick={() => setCategory(option.id)}
              count={option.count}
            >
              {option.label}
            </Pill>
          ))}
        </div>

        <div className={styles.listHead}>
          <div className={styles.listHeadText}>
            <h3 className={styles.listTitle}>{active ? active.label : 'All resources'}</h3>
            {active && <p className={styles.listBlurb}>{active.blurb}</p>}
          </div>
          <p className={styles.count} aria-live="polite">
            {plural(visible.length, 'resource', 'resources')}
          </p>
        </div>

        {visible.length > 0 ? (
          <ul className={rows.list}>
            {visible.map(resource => (
              <ResourceRow key={resource.url} resource={resource} showCategory={category === 'all'} />
            ))}
          </ul>
        ) : (
          <EmptyState
            className={styles.emptyPanel}
            icon={<IconSearch size={16} />}
            title={`No resources match “${trimmed}”${active ? ` in ${active.label}` : ''}`}
            action={
              <>
                <Button variant="secondary" onClick={clearSearch}>
                  Clear search
                </Button>
                {elsewhere > 0 && (
                  <Button variant="ghost" onClick={() => setCategory('all')}>
                    Search all categories
                  </Button>
                )}
              </>
            }
          >
            {elsewhere > 0
              ? `${plural(elsewhere, 'resource matches', 'resources match')} in other categories.`
              : 'Search looks at titles and descriptions. Try a shorter or more general term.'}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
