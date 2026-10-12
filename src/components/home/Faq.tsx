import { IconChevronDown } from '../icons';
import styles from './home.module.css';

const QUESTIONS: Array<[question: string, answer: string]> = [
  [
    'Is Orion free?',
    'Yes. Browsing, tracking, programs and bounties are free. Signing in only stores your tracker, notes and skills so they follow you across devices.',
  ],
  [
    'Where does the data come from?',
    'Issues, repositories, pull requests and bounties are live GitHub searches, cached for a few minutes. Google Summer of Code dates and organizations come from Google’s official program data.',
  ],
  [
    'Does Orion write to my GitHub account?',
    'No. Orion reads public GitHub data only. It never opens issues, comments or pushes code on your behalf.',
  ],
  [
    'How are issues matched to me?',
    'Add your languages, tools and interests in Preferences, or import them from a resume. Every list is then ranked by how well an issue’s repository, labels and text fit your skills.',
  ],
  [
    'Which programs are tracked?',
    'Countdowns cover GSoC, GSSoC, Hacktoberfest, Outreachy, LFX Mentorship, MLH Fellowship, Social Winter of Code and 24 Pull Requests. Dates come from the programs themselves wherever they publish them (GSoC, LFX, Outreachy, MLH, Social Winter of Code and GSSoC); a year that isn’t announced yet repeats last year’s dates, marked expected. Hacktoberfest and 24 Pull Requests run on the same days every year. A directory of 25+ more programs, from Season of KDE to Summer of Bitcoin, refreshes from a community-maintained list.',
  ],
  [
    'Does Orion hold bounty money?',
    'Never. Bounties are paid by maintainers on their own platforms. Orion finds open, unclaimed bounties and links you straight to them.',
  ],
];

/** Plain disclosure widgets in a dashed grid; no script needed. */
export default function Faq() {
  return (
    <div className={styles.faq}>
      {QUESTIONS.map(([question, answer]) => (
        <details key={question} className={styles.faqItem}>
          <summary className={styles.faqQuestion}>
            {question}
            <IconChevronDown size={14} className={styles.faqChevron} />
          </summary>
          <p className={styles.faqAnswer}>{answer}</p>
        </details>
      ))}
    </div>
  );
}
