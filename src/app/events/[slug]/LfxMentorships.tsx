import { foundationCounts, getLfxProjects, LFX_SITE, projectsForTerm } from '@/lib/lfx';
import MentorshipRow from '@/components/MentorshipRow';
import { Notice } from '@/components/ui/primitives';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

const SHOWN = 10;

/** Live mentorships for one LFX term, straight from LFX's project index. */
export default async function LfxMentorships({ year, cohort }: { year: number; cohort?: string }) {
  const projects = await getLfxProjects();
  if (projects.length === 0) {
    return <Notice tone="warning">LFX Mentorship couldn&rsquo;t be reached. Browse the projects on mentorship.lfx.linuxfoundation.org.</Notice>;
  }

  const inTerm = projectsForTerm(projects, year, cohort);
  if (inTerm.length === 0) {
    return (
      <p className={styles.sectionCaption}>
        LFX hasn&rsquo;t published projects for this term yet. {projects.length.toLocaleString('en-US')} mentorships are open in
        other terms on{' '}
        <a href={LFX_SITE} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
          mentorship.lfx.linuxfoundation.org
        </a>
        .
      </p>
    );
  }

  const top = foundationCounts(inTerm).slice(0, 4);
  return (
    <>
      <p className={styles.sectionCaption}>
        {inTerm.length.toLocaleString('en-US')} mentorships this term
        {top.length > 0 && <>, led by {top.map(([name, count]) => `${name.replace(/\s*\([^)]*\)/, '')} (${count})`).join(', ')}</>}. Live
        from LFX.
      </p>
      <ul className={rows.list}>
        {inTerm.slice(0, SHOWN).map(project => (
          <MentorshipRow key={project.id} project={project} />
        ))}
      </ul>
    </>
  );
}
