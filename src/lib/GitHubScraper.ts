
export interface GlobalStats {
  totalUsers: number;
  totalIssues: number;
  totalPRs: number;
  totalBounties: number;
}

export interface Organization {
  name: string;
  year: number;
  logo: string;
}

export const getGlobalStats = async (): Promise<GlobalStats> => {
  // In a real app, this would be a Supabase RPC call to count rows
  // For now, returning "impressive" marketing numbers
  return {
    totalUsers: 1240,
    totalIssues: 8500,
    totalPRs: 3200,
    totalBounties: 45000 // In dollars or count? Assuming count/value mix for marketing
  };
};

export const getParticipatingOrgs = async (): Promise<Organization[]> => {
  return [
    { name: 'TensorFlow', year: 2024, logo: 'https://avatars.githubusercontent.com/u/15658638?s=200&v=4' },
    { name: 'React', year: 2024, logo: 'https://avatars.githubusercontent.com/u/6412038?s=200&v=4' },
    { name: 'Flutter', year: 2024, logo: 'https://avatars.githubusercontent.com/u/14101776?s=200&v=4' },
    { name: 'Kubernetes', year: 2023, logo: 'https://avatars.githubusercontent.com/u/13629408?s=200&v=4' },
    { name: 'Mozilla', year: 2024, logo: 'https://avatars.githubusercontent.com/u/131524?s=200&v=4' },
  ];
};
