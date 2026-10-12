// Curated learning resources and guided paths for /resources.
// Every external link below was opened and checked on RESOURCES_REVIEWED.
// When you add or edit an entry, check the link and keep descriptions under
// 140 characters: say what the resource is, not how great it is.

export type ResourceCategory =
  | 'getting-started'
  | 'git-github'
  | 'finding-projects'
  | 'prs-code-review'
  | 'licensing'
  | 'programs'
  | 'communities'
  | 'perks'
  | 'career';

export type ResourceType = 'guide' | 'interactive' | 'tool' | 'book' | 'docs' | 'community';

export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Resource {
  title: string;
  url: string;
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  level: ResourceLevel;
  tags: string[];
  featured?: boolean;
}

/** Date the external links were last checked (YYYY-MM-DD). */
export const RESOURCES_REVIEWED = '2026-10-11';

export const RESOURCE_CATEGORIES: Array<{ id: ResourceCategory; label: string; blurb: string }> = [
  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'How contributing works, and a safe place to open your first pull request.',
  },
  {
    id: 'git-github',
    label: 'Git and GitHub',
    blurb: 'Branching, rebasing and undoing mistakes: the mechanics behind every contribution.',
  },
  {
    id: 'finding-projects',
    label: 'Finding projects',
    blurb: 'Where to find beginner-friendly issues, and how to tell whether a project is active.',
  },
  {
    id: 'prs-code-review',
    label: 'Pull requests',
    blurb: 'Opening pull requests that are easy to review, and responding to review feedback.',
  },
  {
    id: 'licensing',
    label: 'Licensing',
    blurb: 'What a license lets you do with code, in plain language.',
  },
  {
    id: 'programs',
    label: 'Programs and bounties',
    blurb: 'Official guides for mentorship programs, and the platforms behind paid bounties.',
  },
  {
    id: 'communities',
    label: 'Communities',
    blurb: 'Places to ask questions, find mentors and meet other contributors.',
  },
  {
    id: 'perks',
    label: 'Perks',
    blurb: 'Free tools, licenses and credits that companies offer students and open source projects.',
  },
  {
    id: 'career',
    label: 'Career',
    blurb: 'Show your open source work on your profile and plan what to learn next.',
  },
];

export const RESOURCES: Resource[] = [
  // Getting started
  {
    title: 'How to Contribute to Open Source',
    url: 'https://opensource.guide/how-to-contribute/',
    description:
      'GitHub’s Open Source Guide: choosing a project, opening issues and pull requests, and what happens after you submit.',
    category: 'getting-started',
    type: 'guide',
    level: 'beginner',
    tags: ['first-pr', 'essentials'],
    featured: true,
  },
  {
    title: 'Contributing to a project',
    url: 'https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project',
    description: 'GitHub Docs walkthrough of the fork, clone, branch, commit and pull request workflow.',
    category: 'getting-started',
    type: 'docs',
    level: 'beginner',
    tags: ['github', 'fork', 'first-pr'],
  },
  {
    title: 'First Contributions',
    url: 'https://github.com/firstcontributions/first-contributions',
    description:
      'Practice repository with step-by-step instructions for forking, committing and opening your first pull request.',
    category: 'getting-started',
    type: 'interactive',
    level: 'beginner',
    tags: ['first-pr', 'practice', 'git'],
    featured: true,
  },
  {
    title: 'First Timers Only',
    url: 'https://www.firsttimersonly.com/',
    description:
      'Explains first-timers-only issues and points to projects that keep simple tasks open for people new to open source.',
    category: 'getting-started',
    type: 'guide',
    level: 'beginner',
    tags: ['first-pr', 'issues'],
  },

  // Git and GitHub
  {
    title: 'Learn Git Branching',
    url: 'https://learngitbranching.js.org/',
    description: 'Visual, level-based exercises for commits, branches, rebase and cherry-pick that run in your browser.',
    category: 'git-github',
    type: 'interactive',
    level: 'beginner',
    tags: ['git', 'branching', 'rebase'],
    featured: true,
  },
  {
    title: 'Pro Git',
    url: 'https://git-scm.com/book/en/v2',
    description: 'The free Git book by Scott Chacon and Ben Straub, from your first commit to Git internals.',
    category: 'git-github',
    type: 'book',
    level: 'intermediate',
    tags: ['git', 'reference'],
  },
  {
    title: 'Dangit, Git!?!',
    url: 'https://dangitgit.com/',
    description:
      'Short recipes for undoing common Git mistakes: committing to the wrong branch, fixing messages, recovering lost work.',
    category: 'git-github',
    type: 'guide',
    level: 'beginner',
    tags: ['git', 'troubleshooting'],
  },
  {
    title: 'GitHub Skills',
    url: 'https://learn.github.com/skills',
    description:
      'Free GitHub courses that run inside a repository in your account, from your first pull request to GitHub Actions.',
    category: 'git-github',
    type: 'interactive',
    level: 'beginner',
    tags: ['github', 'actions'],
  },
  {
    title: 'Conventional Commits',
    url: 'https://www.conventionalcommits.org/',
    description: 'A commit message format (feat:, fix:, docs:) that many projects require and use to generate changelogs.',
    category: 'git-github',
    type: 'docs',
    level: 'intermediate',
    tags: ['commits', 'standards'],
  },
  {
    title: 'Keep a Changelog',
    url: 'https://keepachangelog.com/',
    description: 'Conventions for a readable CHANGELOG: what to record, how to group changes and how to mark releases.',
    category: 'git-github',
    type: 'docs',
    level: 'intermediate',
    tags: ['changelog', 'standards'],
  },

  // Finding projects
  {
    title: 'Good First Issue',
    url: 'https://goodfirstissue.dev/',
    description: 'Open issues labelled “good first issue” from established projects, filterable by language.',
    category: 'finding-projects',
    type: 'tool',
    level: 'beginner',
    tags: ['issues', 'discovery'],
  },
  {
    title: 'Up For Grabs',
    url: 'https://up-for-grabs.net/',
    description: 'Directory of projects that label small tasks for new contributors, with a link to each project’s label.',
    category: 'finding-projects',
    type: 'tool',
    level: 'beginner',
    tags: ['issues', 'discovery'],
  },
  {
    title: 'Awesome for Beginners',
    url: 'https://github.com/MunGell/awesome-for-beginners',
    description:
      'Community-maintained list of beginner-friendly projects grouped by language, each with its starter-issue label.',
    category: 'finding-projects',
    type: 'guide',
    level: 'beginner',
    tags: ['list', 'issues'],
  },
  {
    title: 'CodeTriage',
    url: 'https://www.codetriage.com/',
    description: 'Subscribe to a repository and get one open issue by email each day to read, reproduce or triage.',
    category: 'finding-projects',
    type: 'tool',
    level: 'beginner',
    tags: ['issues', 'habit'],
  },
  {
    title: 'A checklist before you contribute',
    url: 'https://opensource.guide/how-to-contribute/#a-checklist-before-you-contribute',
    description:
      'Signals that a project is active and welcoming: recent commits, responsive maintainers, merged pull requests.',
    category: 'finding-projects',
    type: 'guide',
    level: 'beginner',
    tags: ['evaluation', 'project-health'],
  },
  {
    title: 'CNCF Contributors',
    url: 'https://contribute.cncf.io/',
    description: 'How to start contributing to Kubernetes and other CNCF projects, with guides for new contributors.',
    category: 'finding-projects',
    type: 'docs',
    level: 'intermediate',
    tags: ['cncf', 'cloud-native'],
  },

  // Pull requests and review
  {
    title: 'Creating a pull request from a fork',
    url: 'https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork',
    description: 'GitHub Docs steps for proposing changes from your fork to the upstream repository.',
    category: 'prs-code-review',
    type: 'docs',
    level: 'beginner',
    tags: ['pr', 'github', 'fork'],
  },
  {
    title: 'Google’s code review guide',
    url: 'https://google.github.io/eng-practices/review/',
    description:
      'Google’s engineering practices for reviewers and change authors: small changes, clear descriptions, handling comments.',
    category: 'prs-code-review',
    type: 'guide',
    level: 'intermediate',
    tags: ['review', 'quality'],
    featured: true,
  },
  {
    title: 'Conventional Comments',
    url: 'https://conventionalcomments.org/',
    description: 'Labels for review comments (suggestion, issue, nitpick, praise) that make feedback easier to act on.',
    category: 'prs-code-review',
    type: 'docs',
    level: 'intermediate',
    tags: ['review', 'communication'],
  },
  {
    title: 'All Contributors specification',
    url: 'https://allcontributors.org/en/reference/specification/',
    description: 'A specification for crediting every kind of contribution in a README, including docs, design and triage.',
    category: 'prs-code-review',
    type: 'docs',
    level: 'beginner',
    tags: ['recognition', 'community'],
  },

  // Licensing
  {
    title: 'Choose a License',
    url: 'https://choosealicense.com/',
    description: 'GitHub’s plain-language comparison of MIT, Apache 2.0, GPL and other common open source licenses.',
    category: 'licensing',
    type: 'guide',
    level: 'beginner',
    tags: ['license', 'legal'],
    featured: true,
  },
  {
    title: 'TLDRLegal',
    url: 'https://www.tldrlegal.com/',
    description: 'Plain-English summaries of software licenses: what each one says you can, cannot and must do.',
    category: 'licensing',
    type: 'tool',
    level: 'beginner',
    tags: ['license', 'reference'],
  },
  {
    title: 'Open Source Initiative FAQ',
    url: 'https://opensource.org/faq',
    description: 'Answers from the Open Source Initiative on what counts as open source and how approved licenses work.',
    category: 'licensing',
    type: 'docs',
    level: 'intermediate',
    tags: ['license', 'legal'],
  },
  {
    title: 'SPDX License List',
    url: 'https://spdx.org/licenses/',
    description: 'Standard short identifiers such as MIT and Apache-2.0, used in package manifests and license headers.',
    category: 'licensing',
    type: 'docs',
    level: 'intermediate',
    tags: ['license', 'reference'],
  },

  // Programs and bounties
  {
    title: 'Google Summer of Code contributor guide',
    url: 'https://google.github.io/gsocguides/student/',
    description: 'Official guide to GSoC: choosing an organization, talking to mentors and writing a proposal.',
    category: 'programs',
    type: 'docs',
    level: 'intermediate',
    tags: ['gsoc', 'mentorship'],
    featured: true,
  },
  {
    title: 'Outreachy applicant guide',
    url: 'https://www.outreachy.org/docs/applicant/',
    description: 'How to apply to Outreachy’s remote internships, from the initial application to the contribution period.',
    category: 'programs',
    type: 'docs',
    level: 'intermediate',
    tags: ['outreachy', 'internship'],
  },
  {
    title: 'LFX Mentorship',
    url: 'https://docs.linuxfoundation.org/lfx/mentorship',
    description: 'Linux Foundation mentorships across CNCF and other foundation projects: schedule, stipends and how to apply.',
    category: 'programs',
    type: 'docs',
    level: 'intermediate',
    tags: ['lfx', 'cncf', 'mentorship'],
  },
  {
    title: 'MLH Fellowship',
    url: 'https://fellowship.mlh.com/',
    description: 'A remote, 12-week program from Major League Hacking where fellows work on open source projects with mentors.',
    category: 'programs',
    type: 'docs',
    level: 'intermediate',
    tags: ['mlh', 'fellowship'],
  },
  {
    title: 'Hacktoberfest',
    url: 'https://hacktoberfest.com/',
    description: 'Annual October event for open source contributors, held online and at in-person events around the world.',
    category: 'programs',
    type: 'community',
    level: 'beginner',
    tags: ['event', 'october'],
  },
  {
    title: 'Algora',
    url: 'https://algora.io/',
    description: 'Open source bounty and hiring platform. Companies attach rewards to GitHub issues and pay out through Algora.',
    category: 'programs',
    type: 'tool',
    level: 'intermediate',
    tags: ['bounties'],
  },
  {
    title: 'Opire',
    url: 'https://opire.dev/',
    description: 'Bounty platform where anyone can put a reward on a public GitHub issue for developers to solve.',
    category: 'programs',
    type: 'tool',
    level: 'intermediate',
    tags: ['bounties'],
  },
  {
    title: 'GitHub Sponsors',
    url: 'https://docs.github.com/en/sponsors',
    description: 'GitHub Docs on sponsoring maintainers, receiving sponsorships and managing payouts.',
    category: 'programs',
    type: 'docs',
    level: 'intermediate',
    tags: ['sponsors', 'funding'],
  },

  // Communities
  {
    title: 'CNCF Slack',
    url: 'https://slack.cncf.io/',
    description: 'Invite to the CNCF Slack workspace, where Kubernetes, Prometheus and other cloud native projects have channels.',
    category: 'communities',
    type: 'community',
    level: 'intermediate',
    tags: ['slack', 'cncf'],
  },
  {
    title: 'Python Discord',
    url: 'https://www.pythondiscord.com/',
    description: 'Large Python community with help channels, events such as code jams, and open source projects of its own.',
    category: 'communities',
    type: 'community',
    level: 'beginner',
    tags: ['discord', 'python'],
  },
  {
    title: 'GitHub Community discussions',
    url: 'https://github.com/orgs/community/discussions',
    description: 'GitHub’s official forum for questions about GitHub itself, from pull requests to Actions.',
    category: 'communities',
    type: 'community',
    level: 'beginner',
    tags: ['github', 'forum'],
  },
  {
    title: 'DEV: #opensource',
    url: 'https://dev.to/t/opensource',
    description: 'Posts tagged #opensource on DEV: contributor write-ups, maintainer advice and program announcements.',
    category: 'communities',
    type: 'community',
    level: 'beginner',
    tags: ['blogging', 'learning'],
  },

  // Career
  {
    title: 'roadmap.sh',
    url: 'https://roadmap.sh/',
    description: 'Community-maintained learning roadmaps for frontend, backend, DevOps and other developer roles.',
    category: 'career',
    type: 'guide',
    level: 'beginner',
    tags: ['learning-path', 'skills'],
    featured: true,
  },
  {
    title: 'Managing your profile README',
    url: 'https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme',
    description: 'GitHub Docs on adding a README to your profile, the first thing visitors see on your GitHub page.',
    category: 'career',
    type: 'docs',
    level: 'beginner',
    tags: ['profile'],
  },
  {
    title: 'Pinning items to your profile',
    url: 'https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile',
    description: 'GitHub Docs on pinning the repositories and gists you want people to see first on your profile.',
    category: 'career',
    type: 'docs',
    level: 'beginner',
    tags: ['profile', 'portfolio'],
  },
  // Perks (links checked 2026-10-11)
  {
    title: 'GitHub Student Developer Pack',
    url: 'https://education.github.com/pack',
    description: 'Free developer tools and services from GitHub partners for verified students.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['students'],
  },
  {
    title: 'GitHub Copilot Pro for students and maintainers',
    url: 'https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro',
    description: 'GitHub Docs on free Copilot Pro access for verified students, teachers and maintainers of popular open source projects.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['students', 'maintainers'],
  },
  {
    title: 'JetBrains Student Pack',
    url: 'https://www.jetbrains.com/academy/student-pack/',
    description: 'Free JetBrains IDE licenses for students and teachers.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['students'],
  },
  {
    title: 'JetBrains Open Source Support',
    url: 'https://www.jetbrains.com/community/opensource/',
    description: 'Free JetBrains IDE licenses for core contributors of non-commercial open source projects.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Azure for Students',
    url: 'https://azure.microsoft.com/en-us/free/students',
    description: 'Free Azure credits and services for students, without a credit card.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['students'],
  },
  {
    title: 'Figma for Education',
    url: 'https://www.figma.com/education/',
    description: 'The Figma Education plan for students and educators, free of charge.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['students'],
  },
  {
    title: 'GitHub Sponsors',
    url: 'https://github.com/sponsors',
    description: 'Get paid for your open source work through recurring and one-time sponsorships on GitHub.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Open Collective for open source',
    url: 'https://opencollective.com/opensource',
    description: 'Fiscal hosting and transparent budgets so open source projects can raise and spend money.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Vercel Open Source Program',
    url: 'https://vercel.com/open-source-program',
    description: 'Hosting credits and support from Vercel for open source projects.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Netlify open source plan',
    url: 'https://www.netlify.com/legal/open-source-policy/',
    description: 'Netlify’s policy for qualifying open source projects to host on an upgraded plan for free.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'DigitalOcean credits for open source',
    url: 'https://www.digitalocean.com/open-source/credits-for-projects',
    description: 'Infrastructure credits from DigitalOcean for open source projects.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Docker-Sponsored Open Source',
    url: 'https://www.docker.com/community/open-source/application/',
    description: 'Docker Hub benefits for open source projects, such as lifted pull limits and a sponsored badge.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Sentry for open source',
    url: 'https://sentry.io/for/open-source/',
    description: 'Sponsored Sentry error monitoring for open source projects.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: '1Password for Open Source',
    url: 'https://github.com/1Password/for-open-source',
    description: 'Free 1Password team accounts for open source project teams; apply through this repository.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Algolia DocSearch',
    url: 'https://docsearch.algolia.com/',
    description: 'Free search for open source documentation sites, run by Algolia.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'Read the Docs',
    url: 'https://about.readthedocs.com/pricing/',
    description: 'Free documentation hosting for open source projects on the Community plan.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
  {
    title: 'BrowserStack for open source',
    url: 'https://www.browserstack.com/open-source',
    description: 'Free cross-browser and device testing for open source projects.',
    category: 'perks',
    type: 'tool',
    level: 'beginner',
    tags: ['maintainers'],
  },
];

export function getFeaturedResources(): Resource[] {
  return RESOURCES.filter(r => r.featured);
}

/* ------------------------------------------------------------------ */
/* Guided paths                                                        */
/* ------------------------------------------------------------------ */

export interface ResourcePathStep {
  title: string;
  description: string;
  /** Internal route ("/bounties") or external URL. */
  href?: string;
}

export interface ResourcePath {
  id: string;
  title: string;
  summary: string;
  steps: ResourcePathStep[];
}

export const RESOURCE_PATHS: ResourcePath[] = [
  {
    id: 'first-contribution',
    title: 'First contribution',
    summary: 'From never having opened a pull request to your first merge.',
    steps: [
      {
        title: 'Learn the Git workflow',
        description: 'Branch, commit, rebase and push in a visual sandbox before you touch a real project.',
        href: 'https://learngitbranching.js.org/',
      },
      {
        title: 'Open a practice pull request',
        description: 'First Contributions is a repository built for this. Nothing breaks if you get it wrong.',
        href: 'https://github.com/firstcontributions/first-contributions',
      },
      {
        title: 'Pick one small issue',
        description: 'Filter Discover by your language and choose something you can finish in a day or two.',
        href: '/discover?tab=issues',
      },
      {
        title: 'Read CONTRIBUTING.md',
        description: 'Setup steps, code style and how maintainers want to be asked. Read it before you comment.',
      },
      {
        title: 'Open a focused pull request',
        description: 'Link the issue, say what changed and how you tested it. Small pull requests get reviewed sooner.',
        href: 'https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork',
      },
    ],
  },
  {
    id: 'paid-bounties',
    title: 'Paid bounties',
    summary: 'Rewarded issues suit contributors who already have merged work to point to.',
    steps: [
      {
        title: 'Build a track record',
        description: 'Maintainers assign paid work more readily to people whose merged pull requests they can see.',
      },
      {
        title: 'Find an unclaimed bounty',
        description: 'Filter by language and keep “Unclaimed only” on so you skip work someone already holds.',
        href: '/bounties',
      },
      {
        title: 'Read the payout terms',
        description: 'Algora, Opire and GitHub Sponsors each handle claims and payment differently. Check before you start.',
      },
      {
        title: 'Claim before you code',
        description: 'Comment on the issue and wait to be assigned, so you never duplicate someone else’s work.',
      },
      {
        title: 'Track it to the merge',
        description: 'Save the issue to your tracker and move it from Working to PR open to Merged.',
        href: '/issues',
      },
    ],
  },
  {
    id: 'mentorship-programs',
    title: 'Mentorship programs',
    summary: 'GSoC, Outreachy and LFX favour applicants who have already worked with a project.',
    steps: [
      {
        title: 'Check the deadlines',
        description: 'Programs lists application windows for GSoC, Outreachy, LFX and others in one place.',
        href: '/events',
      },
      {
        title: 'Shortlist two or three organizations',
        description: 'Choose by how well their project ideas fit what you already know, not by name.',
        href: '/discover?tab=organizations',
      },
      {
        title: 'Contribute early',
        description: 'Fix a few starter issues in your target organization so mentors already know your work.',
      },
      {
        title: 'Read the official guide',
        description: 'The GSoC contributor guide covers talking to mentors, expectations and timelines.',
        href: 'https://google.github.io/gsocguides/student/',
      },
      {
        title: 'Write a specific proposal',
        description: 'Name real files, milestones and risks. Generic proposals are easy to spot.',
        href: 'https://google.github.io/gsocguides/student/writing-a-proposal',
      },
    ],
  },
];
