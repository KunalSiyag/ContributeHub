import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEventBySlug, getAllEvents, getEventTimeInfo, getOrganizationsForEvent } from '@/lib/events';
import OrganizationCard from '@/components/OrganizationCard';
import styles from './page.module.css';

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const events = getAllEvents();
  return events.map(event => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  
  if (!event) {
    return { title: 'Event Not Found' };
  }
  
  return {
    title: `${event.name} | ContributeHub`,
    description: event.description,
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const timeInfo = getEventTimeInfo(event);
  const startDate = new Date(event.contributionStart).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const endDate = new Date(event.contributionEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`${styles.page} page-glow dot-grid`}>
      <div className={styles.container}>
        {/* Back Link */}
        <Link href="/events" className={styles.backLink}>
          ← Back to Events
        </Link>

        {/* Header */}
        <header className={styles.header}>
          <div 
            className={styles.logo}
            style={{ backgroundColor: event.color }}
          >
            {event.shortName.charAt(0)}
          </div>
          <div className={styles.headerContent}>
            <div className={styles.statusRow}>
              <span className={`${styles.status} ${styles[`status${event.status?.charAt(0).toUpperCase()}${event.status?.slice(1)}`]}`}>
                {event.status === 'active' ? '🔥 Active Now' : event.status === 'upcoming' ? '📅 Upcoming' : '✅ Ended'}
              </span>
              <span className={styles.timeInfo}>{timeInfo}</span>
            </div>
            <h1>{event.name}</h1>
            <p className={styles.organizer}>Organized by <strong>{event.organizer}</strong></p>
          </div>
        </header>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Left Column - Details */}
          <main className={styles.main}>
            <section className={styles.section}>
              <h2>About</h2>
              <div className={styles.description}>
                {event.longDescription?.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                )) || <p>{event.description}</p>}
              </div>
            </section>

            {/* Timeline */}
            <section className={styles.section}>
              <h2>Timeline</h2>
              <div className={styles.timeline}>
                {event.registrationStart && (
                  <div className={styles.timelineItem}>
                    <span className={styles.timelineIcon}>📝</span>
                    <div className={styles.timelineContent}>
                      <strong>Registration Opens</strong>
                      <span>{new Date(event.registrationStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}
                <div className={styles.timelineItem}>
                  <span className={styles.timelineIcon}>🚀</span>
                  <div className={styles.timelineContent}>
                    <strong>Contribution Period Starts</strong>
                    <span>{startDate}</span>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineIcon}>🏁</span>
                  <div className={styles.timelineContent}>
                    <strong>Contribution Period Ends</strong>
                    <span>{endDate}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Organizations */}
            {(() => {
              const orgs = getOrganizationsForEvent(event.labels[0] || event.slug);
              return orgs.length > 0 ? (
                <section className={styles.section}>
                  <h2>🏢 Featured Organizations</h2>
                  <p className={styles.orgsDescription}>
                    These projects have participated in {event.shortName}. Start contributing now!
                  </p>
                  <div className={styles.orgsGrid}>
                    {orgs.map(org => (
                      <OrganizationCard key={org.slug} org={org} />
                    ))}
                  </div>
                </section>
              ) : null;
            })()}
          </main>

          {/* Right Column - Sidebar */}
          <aside className={styles.sidebar}>
            {/* Quick Info Card */}
            <div className={styles.infoCard}>
              <h3>Quick Info</h3>
              <dl className={styles.infoList}>
                <dt>Type</dt>
                <dd className={styles.capitalize}>{event.type}</dd>
                
                <dt>Format</dt>
                <dd>{event.isRemote ? '🌍 Remote' : '📍 In-person'}</dd>
                
                <dt>Compensation</dt>
                <dd>{event.isPaid ? '💰 Paid stipend' : '🎁 Swag/Certificates'}</dd>
                
                {event.participatingOrgs && (
                  <>
                    <dt>Organizations</dt>
                    <dd>{event.participatingOrgs}+ participating</dd>
                  </>
                )}
                
                {event.totalContributors && (
                  <>
                    <dt>Contributors</dt>
                    <dd>{event.totalContributors.toLocaleString()}+ total</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Labels */}
            <div className={styles.labelsCard}>
              <h3>Tags</h3>
              <div className={styles.labels}>
                {event.labels.map(label => (
                  <span key={label} className={styles.label}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a 
              href={event.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.ctaButton}
            >
              Visit Official Website →
            </a>

            {/* Find Projects */}
            <Link href="/discover" className={styles.secondaryButton}>
              Find Projects to Contribute
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
