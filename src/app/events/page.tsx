import { getAllEvents, getEventsByStatus } from '@/lib/events';
import { EventStatus } from '@/types';
import EventCard from '@/components/EventCard';
import styles from './page.module.css';

export const metadata = {
  title: 'Contribution Events | ContributeHub',
  description: 'Discover open source contribution events like GSoC, GSSoC, Hacktoberfest and more.',
};

export default function EventsPage() {
  const allEvents = getAllEvents();
  const activeEvents = getEventsByStatus('active');
  const upcomingEvents = getEventsByStatus('upcoming');
  const endedEvents = getEventsByStatus('ended');

  return (
    <div className={`${styles.page} page-glow dot-grid`}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.label}>EVENTS</span>
            <h1>Contribution Events</h1>
            <p>
              Discover open source programs and events to boost your contributions.
              Join GSoC, GSSoC, Hacktoberfest and more!
            </p>
          </div>
        </header>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.activeIndicator}>●</span>
              Active Now
            </h2>
            <div className={styles.grid}>
              {activeEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📅 Upcoming</h2>
            <div className={styles.grid}>
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Past Events */}
        {endedEvents.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>✅ Past Events</h2>
            <div className={styles.grid}>
              {endedEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* No Events Fallback */}
        {allEvents.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            <h3>No events available</h3>
            <p>Check back soon for upcoming contribution events!</p>
          </div>
        )}
      </div>
    </div>
  );
}
