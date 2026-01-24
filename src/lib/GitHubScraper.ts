import * as cheerio from 'cheerio';

export interface TrendingDeveloper {
  rank: number;
  username: string;
  name: string;
  url: string;
  avatar: string;
  popularRepo?: {
    name: string;
    description: string;
    url: string;
  };
}

export const scrapeTrendingDevelopers = async (): Promise<TrendingDeveloper[]> => {
  try {
    const response = await fetch('https://github.com/trending/developers', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      console.error('Failed to fetch GitHub trending page');
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const developers: TrendingDeveloper[] = [];

    $('.Box-row').each((index, element) => {
      const $element = $(element);
      
      // Extract Username and Name
      const $title = $element.find('h1.h3 a');
      const href = $title.attr('href') || '';
      const username = href.replace('/', '').trim();
      const name = $title.text().trim();
      
      // Extract Avatar
      const avatar = $element.find('img.avatar').attr('src') || '';
      
      // Extract Popular Repo
      const $repo = $element.find('h1.h4 a');
      const repoName = $repo.text().trim();
      const repoUrl = $repo.attr('href') || '';
      const repoDesc = $element.find('.f6.color-fg-muted.mt-1').text().trim();

      developers.push({
        rank: index + 1,
        username,
        name,
        url: `https://github.com${href}`,
        avatar,
        popularRepo: {
          name: repoName,
          description: repoDesc,
          url: `https://github.com${repoUrl}`
        }
      });
    });

    return developers;
  } catch (error) {
    console.error('Error scraping trending developers:', error);
    return [];
  }
};
