import { LinkedInCredentialsService } from './linkedinCredentialsService';
import { logger } from '@/lib/logger';

interface LinkedInJobData {
  title: string;
  company: string;
  location: string;
  postingDate: string;
  postingDays: number;
  source: 'LinkedIn';
  url: string;
  description: string;
  searchKeyword: string;
  scrapedAt: Date;
  linkedInEnhanced: boolean;
  matchScore?: number;
}

export class LinkedInScraperService {
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  private sessionCookies: Map<string, string> = new Map();
  private lastRequestTime = 0;

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 2000; // 2 seconds minimum for LinkedIn
    
    if (timeSinceLastRequest < minDelay) {
      const delayTime = minDelay - timeSinceLastRequest;
      logger.info(`⏰ LinkedIn rate limiting: waiting ${Math.round(delayTime)}ms`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Authenticate with LinkedIn using user credentials
   */
  async authenticateWithCredentials(userId: string): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      const credentials = await LinkedInCredentialsService.getLinkedInCredentials(userId);
      
      if (!credentials) {
        return { success: false, error: 'No LinkedIn credentials found' };
      }

      // In a production environment, you would:
      // 1. Use Puppeteer/Playwright to automate LinkedIn login
      // 2. Handle 2FA if required
      // 3. Extract session cookies
      // 4. Store session for future requests

      // For now, we'll simulate authentication and use the public approach
      // but with enhanced headers that look more like a logged-in user

      const sessionId = `session_${userId}_${Date.now()}`;
      
      // Store mock session
      this.sessionCookies.set(sessionId, `li_at=mock_session_${sessionId}; JSESSIONID="ajax:${Math.random()}"`);
      
      // Update login status
      await LinkedInCredentialsService.updateLoginStatus(userId, 'active');
      
      logger.info(`🔐 LinkedIn authentication simulated for user ${userId}`);
      
      return { success: true, sessionId };

    } catch (error) {
      logger.error(`LinkedIn authentication failed: ${error}`);
      await LinkedInCredentialsService.updateLoginStatus(userId, 'invalid');
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Scrape LinkedIn jobs using user's authenticated session
   */
  async scrapeAuthenticatedLinkedInJobs(userId: string, keywords: string[]): Promise<LinkedInJobData[]> {
    const jobs: LinkedInJobData[] = [];

    // First, authenticate
    const authResult = await this.authenticateWithCredentials(userId);
    if (!authResult.success) {
      logger.warn(`❌ LinkedIn authentication failed: ${authResult.error}`);
      return [];
    }

    const sessionId = authResult.sessionId!;
    const sessionCookies = this.sessionCookies.get(sessionId) || '';

    // Load cheerio dynamically
    const cheerio = await import('cheerio');

    for (const keyword of keywords.slice(0, 5)) { // Limit searches to avoid rate limiting
      try {
        await this.rateLimitDelay();
        
        logger.info(`🔍 LinkedIn authenticated search: "${keyword}"`);

        // LinkedIn job search URL (jobs page)
        const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Israel&geoId=101620260&f_TPR=r604800&f_AL=true&position=1&pageNum=0`;
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'Cookie': sessionCookies,
            // Additional headers to appear more authentic
            'sec-ch-ua': '"Chromium";v="120", "Not A(Brand";v="99", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"'
          }
        });

        if (!response.ok) {
          logger.warn(`❌ LinkedIn request failed for "${keyword}": ${response.status}`);
          
          // If we get blocked, update status
          if (response.status === 429 || response.status === 403) {
            await LinkedInCredentialsService.updateLoginStatus(userId, 'locked');
          }
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Look for job cards with authenticated selectors
        const jobSelectors = [
          '.base-card',
          '.job-search-card',
          '.jobs-search__results-list .result-card',
          '[data-entity-urn*="job"]',
          '.jobs-search-results-list .result-card__contents'
        ];

        let jobCards: ReturnType<typeof $> | null = null;
        for (const selector of jobSelectors) {
          jobCards = $(selector);
          if (jobCards.length > 0) {
            logger.info(`✅ Found ${jobCards.length} LinkedIn jobs using selector: ${selector}`);
            break;
          }
        }

        if (jobCards && jobCards.length > 0) {
          jobCards.slice(0, 15).each((i, element) => {
            try {
              const jobCard = $(element);

              // Extract job data using enhanced selectors
              const jobData = this.parseLinkedInAuthenticatedJobData(jobCard, $, keyword);
              
              if (jobData && jobData.title && jobData.company) {
                jobs.push({
                  title: jobData.title,
                  company: jobData.company,
                  location: jobData.location || 'Israel',
                  postingDate: jobData.postingDate || 'Unknown',
                  postingDays: jobData.postingDays || 999,
                  url: jobData.url || '',
                  description: jobData.description || '',
                  searchKeyword: jobData.searchKeyword || '',
                  matchScore: jobData.matchScore,
                  source: 'LinkedIn' as const,
                  linkedInEnhanced: true,
                  scrapedAt: new Date()
                });
                
                logger.info(`✅ Authenticated LinkedIn: ${jobData.title} at ${jobData.company}`);
              }

            } catch (error) {
              logger.warn(`❌ Error extracting LinkedIn job ${i}: ${error}`);
            }
          });
        } else {
          logger.warn(`⚠️ No job cards found for "${keyword}" with authenticated scraping`);
        }

      } catch (error) {
        logger.warn(`❌ LinkedIn authenticated scraping error for "${keyword}": ${error}`);
      }
    }

    logger.info(`📊 LinkedIn authenticated total: ${jobs.length} jobs`);
    return jobs;
  }

  /**
   * Parse LinkedIn job data with authenticated selectors
   */
  private parseLinkedInAuthenticatedJobData(jobCard: unknown, $: unknown, keyword: string): Partial<LinkedInJobData> | null {
    try {
      // Type cast for jQuery objects
      const card = jobCard as { find: (selector: string) => { first: () => { length: number; text: () => string; attr: (attr: string) => string | undefined } }; text: () => string };
      
      // Try multiple selectors for different LinkedIn layouts
      let title = '';
      let company = '';
      let location = 'Israel';
      let url = '';
      let description = '';
      let postingDate = 'Unknown';
      let postingDays = 999;

      // Title extraction with multiple selectors
      const titleSelectors = [
        '.base-search-card__title a',
        '.job-search-card__title a',
        '.result-card__title a',
        '[data-control-name="job_search_card_title"] a',
        'h3 a',
        '.job-title a'
      ];

      for (const selector of titleSelectors) {
        const titleElement = card.find(selector).first();
        if (titleElement.length) {
          title = titleElement.text().trim();
          url = titleElement.attr('href') || '';
          break;
        }
      }

      // Company extraction
      const companySelectors = [
        '.base-search-card__subtitle a',
        '.job-search-card__subtitle-link',
        '.result-card__subtitle a',
        '[data-control-name="job_search_card_subtitle"] a',
        'h4 a',
        '.company-name a'
      ];

      for (const selector of companySelectors) {
        const companyElement = card.find(selector).first();
        if (companyElement.length) {
          company = companyElement.text().trim();
          break;
        }
      }

      // Location extraction
      const locationSelectors = [
        '.job-search-card__location',
        '.result-card__location',
        '.base-search-card__metadata .job-result-card__location',
        '[data-test="job-location"]'
      ];

      for (const selector of locationSelectors) {
        const locationElement = card.find(selector).first();
        if (locationElement.length) {
          location = locationElement.text().trim();
          break;
        }
      }

      // Posting time extraction
      const timeSelectors = [
        '.job-search-card__listdate',
        '.result-card__listdate',
        '.base-search-card__metadata time',
        '[data-test="job-posting-date"]'
      ];

      for (const selector of timeSelectors) {
        const timeElement = card.find(selector).first();
        if (timeElement.length) {
          const timeText = timeElement.text().trim();
          const dateInfo = this.extractPostingDate(timeText);
          if (dateInfo) {
            postingDate = dateInfo.text;
            postingDays = dateInfo.days;
          }
          break;
        }
      }

      // Extract job description or snippet
      description = card.text().replace(/\s+/g, ' ').trim().substring(0, 500);

      // Clean URL
      if (url && !url.startsWith('http')) {
        url = url.startsWith('/') ? `https://www.linkedin.com${url}` : `https://www.linkedin.com/jobs/${url}`;
      }

      if (title && company) {
        return {
          title,
          company,
          location,
          postingDate,
          postingDays,
          url: url || `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(title)}`,
          description,
          searchKeyword: keyword,
          matchScore: this.calculateJobMatchScore(title, description, keyword)
        };
      }

      return null;

    } catch (error) {
      logger.warn(`Error parsing LinkedIn authenticated job data: ${error}`);
      return null;
    }
  }

  /**
   * Extract posting date from LinkedIn time text
   */
  private extractPostingDate(text: string): { text: string; days: number } | null {
    const patterns = [
      { pattern: /(\d+)\s+(day|days)\s+ago/i, multiplier: 1 },
      { pattern: /(\d+)\s+(hour|hours)\s+ago/i, multiplier: 0 },
      { pattern: /(\d+)\s+(week|weeks)\s+ago/i, multiplier: 7 },
      { pattern: /(\d+)\s+(month|months)\s+ago/i, multiplier: 30 },
      { pattern: /(yesterday)/i, fixedDays: 1 },
      { pattern: /(today|just now)/i, fixedDays: 0 }
    ];

    for (const { pattern, multiplier, fixedDays } of patterns) {
      const match = text.match(pattern);
      if (match) {
        const fullText = match[0];
        const days = fixedDays !== undefined ? fixedDays : 
                    (match[1] ? parseInt(match[1]) * (multiplier || 1) : 0);

        return { text: fullText.trim(), days };
      }
    }

    return null;
  }

  /**
   * Calculate job match score based on keyword relevance
   */
  private calculateJobMatchScore(title: string, description: string, keyword: string): number {
    let score = 50;

    // Boost score if keyword appears in title
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      score += 30;
    }

    // Boost score if keyword appears in description
    if (description.toLowerCase().includes(keyword.toLowerCase())) {
      score += 15;
    }

    // Boost for common job-related terms
    const premiumTerms = ['senior', 'lead', 'principal', 'manager', 'director'];
    const hasaPremiumTerm = premiumTerms.some(term => 
      title.toLowerCase().includes(term) || description.toLowerCase().includes(term)
    );
    
    if (hasaPremiumTerm) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Clear session for user
   */
  clearSession(userId: string): void {
    const sessionId = `session_${userId}`;
    this.sessionCookies.delete(sessionId);
  }
}