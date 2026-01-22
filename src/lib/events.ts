import { ContributionEvent, EventStatus } from '@/types';

// Helper to compute event status from dates
export function getEventStatus(event: ContributionEvent): EventStatus {
  const now = new Date();
  const start = new Date(event.contributionStart);
  const end = new Date(event.contributionEnd);
  
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

// Helper to get days until/since event
export function getEventTimeInfo(event: ContributionEvent): string {
  const now = new Date();
  const start = new Date(event.contributionStart);
  const end = new Date(event.contributionEnd);
  const status = getEventStatus(event);
  
  if (status === 'upcoming') {
    const days = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`;
  }
  
  if (status === 'active') {
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days === 1 ? 'Ends tomorrow' : `${days} days left`;
  }
  
  return 'Ended';
}

// Static event data - GSOC, GSSOC, Hacktoberfest
export const CONTRIBUTION_EVENTS: ContributionEvent[] = [
  {
    id: 'gsoc-2025',
    slug: 'gsoc-2025',
    name: 'Google Summer of Code 2025',
    shortName: 'GSoC',
    description: 'A global, online mentoring program focused on introducing new contributors to open source software development.',
    longDescription: `Google Summer of Code is a global, online program focused on bringing new contributors into open source software development. GSoC contributors work with an open source organization on a 12+ week programming project under the guidance of mentors.

**Benefits:**
- Work on real-world open source projects
- Receive mentorship from experienced developers
- Earn a stipend for your work
- Build your portfolio and network`,
    website: 'https://summerofcode.withgoogle.com',
    logo: '/events/gsoc.png',
    color: '#4285F4',
    registrationStart: '2025-03-18',
    registrationEnd: '2025-04-02',
    contributionStart: '2025-05-27',
    contributionEnd: '2025-08-25',
    organizer: 'Google',
    type: 'program',
    isPaid: true,
    isRemote: true,
    participatingOrgs: 200,
    totalContributors: 1200,
    labels: ['gsoc', 'paid', 'mentorship'],
  },
  {
    id: 'gssoc-2025',
    slug: 'gssoc-2025',
    name: 'GirlScript Summer of Code 2025',
    shortName: 'GSSoC',
    description: 'An open-source program by GirlScript Foundation to help beginners contribute to open source and gain experience.',
    longDescription: `GirlScript Summer of Code is a 3-month long open source program by GirlScript Foundation. It provides an excellent opportunity for students and beginners to contribute to various open source projects.

**Benefits:**
- Beginner-friendly projects
- Mentorship and guidance
- Certificates and swag
- Build your GitHub profile`,
    website: 'https://gssoc.girlscript.tech',
    logo: '/events/gssoc.png',
    color: '#FF6B35',
    registrationStart: '2025-02-15',
    registrationEnd: '2025-03-10',
    contributionStart: '2025-03-10',
    contributionEnd: '2025-05-31',
    organizer: 'GirlScript Foundation',
    type: 'program',
    isPaid: false,
    isRemote: true,
    participatingOrgs: 150,
    totalContributors: 5000,
    labels: ['gssoc', 'beginner-friendly', 'swag'],
  },
  {
    id: 'hacktoberfest-2025',
    slug: 'hacktoberfest-2025',
    name: 'Hacktoberfest 2025',
    shortName: 'Hacktoberfest',
    description: 'A month-long celebration of open source software. Complete 4 quality pull requests to earn a limited edition T-shirt or plant a tree.',
    longDescription: `Hacktoberfest is a month-long celebration of open source projects, their maintainers, and the entire community of contributors. Each October, open source maintainers give new contributors extra attention as they guide developers through their first pull requests.

**How it works:**
1. Register on the Hacktoberfest website
2. Make 4 quality pull requests to participating repositories
3. Get your pull requests accepted/merged
4. Earn a limited edition T-shirt or plant a tree!

**Tips:**
- Look for repositories with the "hacktoberfest" topic
- Focus on quality over quantity
- Read contribution guidelines carefully`,
    website: 'https://hacktoberfest.com',
    logo: '/events/hacktoberfest.png',
    color: '#9C4668',
    registrationStart: '2025-09-26',
    registrationEnd: '2025-10-31',
    contributionStart: '2025-10-01',
    contributionEnd: '2025-10-31',
    organizer: 'DigitalOcean',
    type: 'fest',
    isPaid: false,
    isRemote: true,
    totalContributors: 150000,
    labels: ['hacktoberfest', 'beginner-friendly', 'swag'],
  },
  {
    id: 'mlh-fellowship-2025',
    slug: 'mlh-fellowship-2025',
    name: 'MLH Fellowship 2025',
    shortName: 'MLH',
    description: 'A 12-week internship alternative for software engineers. Contribute to open source projects used by millions.',
    longDescription: `The MLH Fellowship is a remote internship alternative for aspiring software engineers. Fellows contribute to real-world open source projects and get mentorship from experienced developers.`,
    website: 'https://fellowship.mlh.io',
    logo: '/events/mlh.png',
    color: '#E73427',
    registrationStart: '2025-01-15',
    registrationEnd: '2025-02-28',
    contributionStart: '2025-06-02',
    contributionEnd: '2025-08-22',
    organizer: 'Major League Hacking',
    type: 'program',
    isPaid: true,
    isRemote: true,
    participatingOrgs: 50,
    totalContributors: 500,
    labels: ['mlh', 'paid', 'mentorship', 'fellowship'],
  },
  {
    id: 'outreachy-2025',
    slug: 'outreachy-2025',
    name: 'Outreachy 2025',
    shortName: 'Outreachy',
    description: 'Paid internships in open source for people subject to systemic bias and underrepresented in tech.',
    longDescription: `Outreachy provides internships in open source and open science. Interns work remotely with mentors from FOSS communities. Outreachy explicitly invites women, trans, and non-binary people to apply.`,
    website: 'https://www.outreachy.org',
    logo: '/events/outreachy.png',
    color: '#7B4A9E',
    registrationStart: '2025-01-15',
    registrationEnd: '2025-02-04',
    contributionStart: '2025-05-26',
    contributionEnd: '2025-08-25',
    organizer: 'Software Freedom Conservancy',
    type: 'program',
    isPaid: true,
    isRemote: true,
    participatingOrgs: 40,
    totalContributors: 100,
    labels: ['outreachy', 'paid', 'diversity', 'mentorship'],
  },
  {
    id: 'lfx-mentorship-2025',
    slug: 'lfx-mentorship-2025',
    name: 'LFX Mentorship 2025',
    shortName: 'LFX',
    description: 'Linux Foundation mentorship program for aspiring open source developers to work on projects under CNCF, LF Networking, and more.',
    longDescription: `LFX Mentorship provides a structured remote learning program for aspiring developers. Mentees work on Linux Foundation hosted projects including CNCF, LF Networking, LF AI, and more.`,
    website: 'https://lfx.linuxfoundation.org/tools/mentorship',
    logo: '/events/lfx.png',
    color: '#003366',
    registrationStart: '2025-03-01',
    registrationEnd: '2025-03-15',
    contributionStart: '2025-06-01',
    contributionEnd: '2025-08-31',
    organizer: 'Linux Foundation',
    type: 'program',
    isPaid: true,
    isRemote: true,
    participatingOrgs: 60,
    totalContributors: 300,
    labels: ['lfx', 'linux', 'cncf', 'paid', 'mentorship'],
  },
  {
    id: 'season-of-docs-2025',
    slug: 'season-of-docs-2025',
    name: 'Season of Docs 2025',
    shortName: 'SoD',
    description: "Google's program supporting open source projects to improve their documentation with the help of technical writers.",
    longDescription: `Season of Docs provides technical writers opportunities to gain experience in open source by working with organizations to improve their documentation.`,
    website: 'https://developers.google.com/season-of-docs',
    logo: '/events/sod.png',
    color: '#4285F4',
    registrationStart: '2025-02-01',
    registrationEnd: '2025-03-15',
    contributionStart: '2025-04-14',
    contributionEnd: '2025-11-22',
    organizer: 'Google',
    type: 'program',
    isPaid: true,
    isRemote: true,
    participatingOrgs: 50,
    totalContributors: 150,
    labels: ['docs', 'technical-writing', 'paid'],
  },
];

// Get all events with computed status
export function getAllEvents(): ContributionEvent[] {
  return CONTRIBUTION_EVENTS.map(event => ({
    ...event,
    status: getEventStatus(event),
  }));
}

// Get event by slug
export function getEventBySlug(slug: string): ContributionEvent | undefined {
  const event = CONTRIBUTION_EVENTS.find(e => e.slug === slug);
  if (event) {
    return { ...event, status: getEventStatus(event) };
  }
  return undefined;
}

// Get events by status
export function getEventsByStatus(status: EventStatus): ContributionEvent[] {
  return getAllEvents().filter(event => event.status === status);
}

// Get active or upcoming events
export function getActiveOrUpcomingEvents(): ContributionEvent[] {
  return getAllEvents().filter(event => event.status !== 'ended');
}

// Featured organizations for events
export interface EventOrganization {
  name: string;
  slug: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  eventLabel: string;
  participationYears?: number[]; // Years the org participated in GSSoC/events
}

export const GSSOC_ORGANIZATIONS: EventOrganization[] = [
  {
    name: 'LinkFree',
    slug: 'EddieHubCommunity/LinkFree',
    description: 'Connect to your audience with a single link. Share your content and social media.',
    stars: 5200,
    forks: 4100,
    language: 'TypeScript',
    topics: ['react', 'nextjs', 'hacktoberfest', 'gssoc'],
    eventLabel: 'gssoc',
    participationYears: [2022, 2023, 2024],
  },
  {
    name: 'Rocket.Chat',
    slug: 'RocketChat/Rocket.Chat',
    description: 'The communications platform that puts data protection first.',
    stars: 42000,
    forks: 10000,
    language: 'TypeScript',
    topics: ['nodejs', 'react', 'meteor', 'gssoc'],
    eventLabel: 'gssoc',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'OpenMRS',
    slug: 'openmrs/openmrs-core',
    description: 'OpenMRS is a patient-based medical record system focusing on giving providers a free customizable EMR.',
    stars: 1400,
    forks: 1200,
    language: 'Java',
    topics: ['healthcare', 'emr', 'gssoc', 'gsoc'],
    eventLabel: 'gssoc',
    participationYears: [2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Graphite',
    slug: 'graphite-project/graphite-web',
    description: 'A highly scalable real-time graphing system.',
    stars: 5900,
    forks: 1300,
    language: 'Python',
    topics: ['monitoring', 'metrics', 'graphing', 'gssoc'],
    eventLabel: 'gssoc',
    participationYears: [2023, 2024],
  },
  {
    name: 'FreeCodeCamp',
    slug: 'freeCodeCamp/freeCodeCamp',
    description: 'Open-source codebase and curriculum for learning to code.',
    stars: 410000,
    forks: 39000,
    language: 'TypeScript',
    topics: ['education', 'nodejs', 'react', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
  },
  {
    name: 'Discourse',
    slug: 'discourse/discourse',
    description: 'A platform for community discussion. Free, open, simple.',
    stars: 43000,
    forks: 8500,
    language: 'Ruby',
    topics: ['ruby', 'rails', 'gsoc'],
    eventLabel: 'gsoc',
  },
  {
    name: 'Apache Kafka',
    slug: 'apache/kafka',
    description: 'Apache Kafka is an open-source distributed event streaming platform.',
    stars: 29000,
    forks: 13000,
    language: 'Java',
    topics: ['streaming', 'distributed', 'messaging', 'gsoc'],
    eventLabel: 'gsoc',
  },
  {
    name: 'Kubernetes',
    slug: 'kubernetes/kubernetes',
    description: 'Production-Grade Container Scheduling and Management.',
    stars: 115000,
    forks: 42000,
    language: 'Go',
    topics: ['containers', 'orchestration', 'cloud-native', 'lfx'],
    eventLabel: 'gsoc',
  },
  {
    name: 'TensorFlow',
    slug: 'tensorflow/tensorflow',
    description: 'An Open Source Machine Learning Framework for Everyone.',
    stars: 187000,
    forks: 74000,
    language: 'Python',
    topics: ['machine-learning', 'deep-learning', 'ai', 'gsoc'],
    eventLabel: 'gsoc',
  },
  {
    name: 'Godot Engine',
    slug: 'godotengine/godot',
    description: 'Godot Engine – Multi-platform 2D and 3D game engine.',
    stars: 93000,
    forks: 21000,
    language: 'C++',
    topics: ['game-engine', 'games', '3d', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
  },
  {
    name: 'Supabase',
    slug: 'supabase/supabase',
    description: 'The open source Firebase alternative for building secure and scalable apps.',
    stars: 78000,
    forks: 7500,
    language: 'TypeScript',
    topics: ['database', 'postgres', 'auth', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
  },
  {
    name: 'Next.js',
    slug: 'vercel/next.js',
    description: 'The React Framework for the Web.',
    stars: 132000,
    forks: 28000,
    language: 'JavaScript',
    topics: ['react', 'framework', 'vercel', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
  },
  {
    name: 'Blender',
    slug: 'blender/blender',
    description: 'Official mirror of Blender 3D creation suite.',
    stars: 14000,
    forks: 2300,
    language: 'C',
    topics: ['3d', 'graphics', 'animation', 'gsoc'],
    eventLabel: 'gsoc',
  },
];

// Get organizations by event label
export function getOrganizationsForEvent(eventLabel: string): EventOrganization[] {
  return GSSOC_ORGANIZATIONS.filter(org => org.topics.includes(eventLabel) || org.eventLabel === eventLabel);
}

