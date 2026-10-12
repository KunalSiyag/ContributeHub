// Resume Parsing Utilities
// Hybrid approach: Fast rule-based extraction + optional AI enhancement

export interface ResumeAnalysisResult {
  skills: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  technologies: string[];
  confidence: number; // 0-100, how confident we are in the extraction
  source: 'fast' | 'ai' | 'hybrid';
}

// Comprehensive skill patterns for fast extraction
const PROGRAMMING_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Golang', 'Rust', 'Java', 'Ruby', 
  'PHP', 'C\\+\\+', 'C#', 'Swift', 'Kotlin', 'Scala', 'Dart', 'Elixir', 
  'Haskell', 'Clojure', 'R', 'MATLAB', 'Julia', 'Perl', 'Lua', 'Shell', 
  'Bash', 'PowerShell', 'SQL', 'HTML', 'CSS', 'SASS', 'SCSS', 'Solidity'
];

const FRAMEWORKS_LIBRARIES = [
  'React', 'React\\.js', 'ReactJS', 'Vue', 'Vue\\.js', 'VueJS', 'Angular', 
  'Next\\.js', 'NextJS', 'Nuxt', 'Svelte', 'SvelteKit', 'Remix',
  'Node\\.js', 'NodeJS', 'Express', 'Express\\.js', 'Fastify', 'NestJS', 'Koa',
  'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Rails', 'Ruby on Rails',
  'Laravel', 'Symfony', 'ASP\\.NET', '.NET Core', 'Gin', 'Echo', 'Fiber',
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
  'jQuery', 'Bootstrap', 'Tailwind', 'TailwindCSS', 'Material UI', 'Chakra UI',
  'Redux', 'MobX', 'Zustand', 'Recoil', 'GraphQL', 'Apollo', 'tRPC',
  'Prisma', 'Drizzle', 'Sequelize', 'TypeORM', 'Mongoose'
];

const DEVOPS_TOOLS = [
  'Docker', 'Kubernetes', 'K8s', 'Helm', 'Terraform', 'Ansible', 'Puppet', 'Chef',
  'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud', 'Azure', 'DigitalOcean',
  'Vercel', 'Netlify', 'Heroku', 'Railway', 'Fly\\.io',
  'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI',
  'Nginx', 'Apache', 'Caddy', 'HAProxy',
  'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Sentry',
  'Linux', 'Ubuntu', 'CentOS', 'Debian', 'RHEL'
];

const DATABASES = [
  'PostgreSQL', 'Postgres', 'MySQL', 'MariaDB', 'SQLite', 'Oracle', 'SQL Server',
  'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'CouchDB',
  'Neo4j', 'InfluxDB', 'TimescaleDB', 'Supabase', 'Firebase', 'PlanetScale',
  'Firestore', 'Fauna', 'CockroachDB'
];

// Keys match INTEREST_AREAS in lib/matching.ts.
const INTEREST_KEYWORDS: Record<string, string[]> = {
  web: ['web development', 'frontend', 'full stack', 'fullstack', 'web app', 'website', 'user interface', 'design system'],
  backend: ['backend', 'api', 'rest', 'graphql', 'microservice', 'server'],
  mobile: ['mobile', 'android', 'ios', 'react native', 'flutter'],
  ml: ['machine learning', 'deep learning', 'neural network', 'artificial intelligence', 'nlp', 'computer vision', 'llm'],
  devops: ['devops', 'ci/cd', 'infrastructure', 'cloud', 'sre', 'site reliability', 'kubernetes'],
  data: ['data engineering', 'data pipeline', 'etl', 'data warehouse', 'analytics', 'database'],
  security: ['security', 'cybersecurity', 'infosec', 'penetration testing', 'ethical hacking'],
  docs: ['documentation', 'technical writing', 'docs'],
  tooling: ['cli', 'command line', 'developer tools', 'testing', 'test automation'],
  games: ['game development', 'game engine', 'unity', 'unreal', 'graphics'],
  web3: ['blockchain', 'web3', 'smart contract', 'solidity', 'ethereum', 'defi'],
};

const EXPERIENCE_INDICATORS = {
  beginner: [
    /\b(0-1|1)\s*years?\s*(of)?\s*experience/i,
    /\bjunior\b/i,
    /\bentry\s*level\b/i,
    /\bfreshers?\b/i,
    /\bintern\b/i,
    /\bstudent\b/i,
    /\blearning\b/i,
    /\bnew\s*grad(uate)?\b/i,
  ],
  intermediate: [
    /\b(2|3|4|5)\s*\+?\s*years?\s*(of)?\s*experience/i,
    /\bmid[\s-]?level\b/i,
    /\bsoftware\s*engineer\b/i,
    /\bdeveloper\b/i,
  ],
  advanced: [
    /\b(5|6|7|8|9|10|\d{2})\s*\+?\s*years?\s*(of)?\s*experience/i,
    /\bsenior\b/i,
    /\bstaff\b/i,
    /\bprincipal\b/i,
    /\blead\b/i,
    /\barchitect\b/i,
    /\bmanager\b/i,
    /\bdirector\b/i,
    /\bhead\s*of\b/i,
  ],
};

/**
 * Fast rule-based skill extraction from resume text
 * Completes in <100ms for most resumes
 */
// Names that are also everyday words; only match them with exact casing.
const CASE_SENSITIVE = new Set([
  'Go', 'R', 'Swift', 'Rust', 'Ruby', 'Dart', 'Lua', 'Julia', 'Shell', 'Spring', 'Echo', 'Gin', 'Fiber',
  'Chef', 'Puppet', 'Express', 'Apache', 'Oracle', 'Remix', 'Recoil', 'Apollo', 'Helm', 'Caddy', 'Railway',
]);

function findMatch(source: string, pattern: string): string | null {
  const flags = CASE_SENSITIVE.has(pattern) ? 'g' : 'gi';
  const match = source.match(new RegExp(`(?<![\\w.+#-])${pattern}(?![\\w+#])`, flags));
  return match ? match[0] : null;
}

export function extractSkillsFast(resumeText: string): ResumeAnalysisResult {
  const text = resumeText.toLowerCase();
  const originalText = resumeText;
  
  // Extract programming languages
  const skills = new Set<string>();
  for (const lang of PROGRAMMING_LANGUAGES) {
    const match = findMatch(originalText, lang);
    if (match) skills.add(normalizeSkill(match));
  }
  
  // Extract frameworks/libraries
  const technologies = new Set<string>();
  for (const fw of FRAMEWORKS_LIBRARIES) {
    const match = findMatch(originalText, fw);
    if (match) technologies.add(normalizeSkill(match));
  }
  
  // Extract DevOps tools
  for (const tool of DEVOPS_TOOLS) {
    const match = findMatch(originalText, tool);
    if (match) technologies.add(normalizeSkill(match));
  }
  
  // Extract databases
  for (const db of DATABASES) {
    const match = findMatch(originalText, db);
    if (match) technologies.add(normalizeSkill(match));
  }
  
  // Extract interests based on keywords
  const interests = new Set<string>();
  for (const [interest, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        interests.add(interest);
        break;
      }
    }
  }
  
  // Determine experience level
  let experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  let expScore = 0;
  
  for (const pattern of EXPERIENCE_INDICATORS.advanced) {
    if (pattern.test(originalText)) {
      expScore = Math.max(expScore, 3);
    }
  }
  for (const pattern of EXPERIENCE_INDICATORS.intermediate) {
    if (pattern.test(originalText)) {
      expScore = Math.max(expScore, 2);
    }
  }
  for (const pattern of EXPERIENCE_INDICATORS.beginner) {
    if (pattern.test(originalText)) {
      expScore = Math.max(expScore, 1);
    }
  }
  
  if (expScore >= 3) experienceLevel = 'advanced';
  else if (expScore >= 2) experienceLevel = 'intermediate';
  else experienceLevel = 'beginner';
  
  // Calculate confidence based on how much we found
  const totalFound = skills.size + technologies.size + interests.size;
  const confidence = Math.min(100, Math.round((totalFound / 15) * 100));
  
  return {
    skills: Array.from(skills),
    technologies: Array.from(technologies),
    interests: Array.from(interests),
    experienceLevel,
    confidence,
    source: 'fast',
  };
}

/**
 * Normalize skill names for consistency
 */
function normalizeSkill(skill: string): string {
  const normalizations: Record<string, string> = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'golang': 'Go',
    'go': 'Go',
    'rust': 'Rust',
    'java': 'Java',
    'ruby': 'Ruby',
    'php': 'PHP',
    'c++': 'C++',
    'c#': 'C#',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'react': 'React',
    'react.js': 'React',
    'reactjs': 'React',
    'vue': 'Vue',
    'vue.js': 'Vue',
    'vuejs': 'Vue',
    'angular': 'Angular',
    'next.js': 'Next.js',
    'nextjs': 'Next.js',
    'node.js': 'Node.js',
    'nodejs': 'Node.js',
    'express': 'Express',
    'express.js': 'Express',
    'django': 'Django',
    'flask': 'Flask',
    'fastapi': 'FastAPI',
    'spring': 'Spring',
    'spring boot': 'Spring Boot',
    'rails': 'Rails',
    'ruby on rails': 'Rails',
    'laravel': 'Laravel',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'aws': 'AWS',
    'amazon web services': 'AWS',
    'gcp': 'GCP',
    'google cloud': 'GCP',
    'azure': 'Azure',
    'postgresql': 'PostgreSQL',
    'postgres': 'PostgreSQL',
    'mysql': 'MySQL',
    'mongodb': 'MongoDB',
    'redis': 'Redis',
    'tensorflow': 'TensorFlow',
    'pytorch': 'PyTorch',
    'tailwind': 'Tailwind CSS',
    'tailwindcss': 'Tailwind CSS',
    'graphql': 'GraphQL',
    'prisma': 'Prisma',
    'supabase': 'Supabase',
    'firebase': 'Firebase',
  };
  
  return normalizations[skill.toLowerCase()] || skill;
}

/**
 * Merge results from fast extraction and AI enhancement
 */
export function mergeAnalysisResults(
  fastResult: ResumeAnalysisResult,
  aiResult: Partial<ResumeAnalysisResult> | null
): ResumeAnalysisResult {
  if (!aiResult) return fastResult;
  const merge = (a: string[], b?: string[]) => Array.from(new Set([...a, ...(b ?? [])]));
  const aiFound = (aiResult.skills?.length ?? 0) + (aiResult.technologies?.length ?? 0) > 0;

  return {
    skills: merge(fastResult.skills, aiResult.skills),
    technologies: merge(fastResult.technologies, aiResult.technologies),
    interests: merge(fastResult.interests, aiResult.interests),
    experienceLevel: aiResult.experienceLevel || fastResult.experienceLevel,
    confidence: aiFound ? Math.min(100, fastResult.confidence + 15) : fastResult.confidence,
    source: aiFound ? 'hybrid' : 'fast',
  };
}
