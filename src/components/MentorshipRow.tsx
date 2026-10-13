import type { LfxProject } from '@/lib/lfx';
import { formatNumber } from '@/lib/utils';
import { Avatar, Tag } from './ui/primitives';
import { ButtonAnchor } from './ui/Button';
import { IconArrowUpRight, IconUsers } from './icons';
import styles from './rows.module.css';

/** One LFX mentorship: the foundation, the skills it asks for and how contested it is. */
export default function MentorshipRow({ project }: { project: LfxProject }) {
  return (
    <li className={`${styles.row} ${styles.withLead}`} data-spotlight="wash">
      <Avatar src={project.logo} name={project.name} size={36} square className={project.logo ? styles.logoTile : undefined} />
      <div className={styles.main}>
        <div className={styles.context}>
          <span>{project.foundation || 'Linux Foundation'}</span>
        </div>
        <a href={project.url} target="_blank" rel="noopener noreferrer" className={`${styles.title} ${styles.stretch}`}>
          {project.name}
        </a>
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <IconUsers size={13} /> {formatNumber(project.applications)} {project.applications === 1 ? 'application' : 'applications'}
          </span>
          {project.terms[0] && <span className={styles.metaItem}>{project.terms[0].name}</span>}
        </div>
        {(project.accepting || project.skills.length > 0) && (
          <div className={styles.tags}>
            {project.accepting && <Tag tone="accent">Accepting applications</Tag>}
            {project.skills.slice(0, 4).map(skill => (
              <Tag key={skill} tone="muted">
                {skill}
              </Tag>
            ))}
          </div>
        )}
      </div>
      <div className={styles.aside}>
        <ButtonAnchor href={project.url} variant="secondary" size="sm">
          {project.accepting ? 'Apply on LFX' : 'View on LFX'}
          <IconArrowUpRight size={13} />
        </ButtonAnchor>
      </div>
    </li>
  );
}
