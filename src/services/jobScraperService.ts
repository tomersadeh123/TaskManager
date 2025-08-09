import Job from '../models/Job';
import User from '../models/User';
import { emailJobReport } from './emailservice';
import {logger} from "@/lib/logger";
import { LinkedInCredentialsService } from './linkedinCredentialsService';
import { LinkedInScraperService } from './linkedinScraperService';

interface JobData {
  title: string;
  company: string;
  location: string;
  postingDate: string;
  postingDays: number;
  source: 'LinkedIn' | 'Drushim.il';
  url: string;
  description: string;
  searchKeyword: string;
  scrapedAt: Date;
  // LinkedIn enhancement fields
  linkedInEnhanced?: boolean;
  matchScore?: number;
}

interface SearchConfig {
  linkedin: string[];
  drushim: Array<{ position: string; experience: string }>;
}

export class JobScraperService {
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  

  /**
   * Get a random user agent to avoid detection
   */
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }


  /**
   * Enhanced HTTP request with retry logic and error handling
   */
  private async makeRequest(url: string, options: {
    headers?: Record<string, string>;
    maxRetries?: number;
    retryDelay?: number;
  } = {}): Promise<string | null> {
    const { maxRetries = 3, retryDelay = 2000 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        
        const headers = {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,he;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
          ...options.headers
        };

        logger.info(`🌐 Request attempt ${attempt}/${maxRetries}: ${url}`);
        
        const response = await fetch(url, {
          headers,
          method: 'GET',
        });

        if (response.ok) {
          const html = await response.text();
          logger.info(`✅ Request successful: ${response.status} - ${html.length} chars`);
          return html;
        } else if (response.status === 429) {
          // Rate limited - wait longer
          logger.warn(`🚫 Rate limited (429), waiting longer before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        } else if (response.status >= 500) {
          // Server error - retry
          logger.warn(`🚫 Server error (${response.status}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          logger.warn(`❌ Request failed: ${response.status} ${response.statusText}`);
          return null;
        }

      } catch (error) {
        logger.warn(`❌ Request error (attempt ${attempt}/${maxRetries}): ${error instanceof Error ? error.message : String(error)}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
      }
    }
    
    logger.error(`💥 All ${maxRetries} attempts failed for: ${url}`);
    return null;
  }

  async scrapeJobsForUser(userId: string, searchConfig: SearchConfig): Promise<{ success: boolean; jobCount: number; error?: string }> {
    try {
      console.log('🚀 Starting lightweight job scraping...');
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has LinkedIn credentials and enhance search config
      const hasLinkedInCredentials = await LinkedInCredentialsService.hasLinkedInCredentials(userId);
      const enhancedSearchConfig = { ...searchConfig };

      if (hasLinkedInCredentials) {
        logger.info(`🔗 User has LinkedIn credentials, enhancing search with profile data`);
        const linkedinProfile = await LinkedInCredentialsService.getLinkedInProfile(userId);
        
        if (linkedinProfile && user.linkedinJobPreferences) {
          // Enhance search keywords with user preferences
          if (user.linkedinJobPreferences.keywords && user.linkedinJobPreferences.keywords.length > 0) {
            enhancedSearchConfig.linkedin = [
              ...enhancedSearchConfig.linkedin,
              ...user.linkedinJobPreferences.keywords.map((keyword: string) => `${keyword} ${linkedinProfile.location || 'Israel'}`)
            ];
            
            // Also enhance Drushim searches
            const additionalDrushimSearches = user.linkedinJobPreferences.keywords.map((keyword: string) => ({
              position: keyword,
              experience: this.mapExperienceLevelToYears(user.linkedinJobPreferences.experienceLevel || 'mid')
            }));
            enhancedSearchConfig.drushim = [...enhancedSearchConfig.drushim, ...additionalDrushimSearches];
          }

          // Add location-based searches if specified
          if (user.linkedinJobPreferences.locations && user.linkedinJobPreferences.locations.length > 0) {
            const locationSearches = user.linkedinJobPreferences.locations.flatMap((location: string) =>
              enhancedSearchConfig.linkedin.map(keyword => `${keyword} ${location}`)
            );
            enhancedSearchConfig.linkedin = [...enhancedSearchConfig.linkedin, ...locationSearches];
          }
        }
      }

      const allJobs: JobData[] = [];

      // Scrape Drushim jobs using HTTP requests
      const drushimJobs = await this.scrapeDrushimJobs(enhancedSearchConfig.drushim);
      allJobs.push(...drushimJobs);

      // Scrape LinkedIn jobs - use authenticated method if credentials available, otherwise fallback
      let linkedinJobs: JobData[] = [];
      if (hasLinkedInCredentials) {
        logger.info('🔐 Using authenticated LinkedIn scraping with user credentials');
        const authenticatedScraper = new LinkedInScraperService();
        const authJobs = await authenticatedScraper.scrapeAuthenticatedLinkedInJobs(userId, enhancedSearchConfig.linkedin);
        linkedinJobs = authJobs.map(job => ({ ...job, source: 'LinkedIn' as const }));
      } else {
        logger.info('🌐 Using public LinkedIn scraping (fallback)');
        linkedinJobs = await this.scrapeLinkedInJobs(enhancedSearchConfig.linkedin);
      }
      allJobs.push(...linkedinJobs);

      // Remove duplicates and sort jobs (same logic as original)
      const uniqueJobs = this.removeDuplicates(allJobs);
      
      // Apply LinkedIn-based filtering if user has preferences
      let filteredJobs = uniqueJobs;
      if (hasLinkedInCredentials && user.linkedinJobPreferences) {
        filteredJobs = this.filterJobsByPreferences(uniqueJobs, userId, user.linkedinJobPreferences);
        logger.info(`🎯 Filtered jobs based on LinkedIn preferences: ${uniqueJobs.length} → ${filteredJobs.length}`);
      }
      
      // Add LinkedIn insights
      const enhancedJobs = await this.addLinkedInInsights(filteredJobs, userId);
      
      // Sort jobs (prioritize LinkedIn-enhanced jobs)
      const sortedJobs = this.sortByDateAndSource(enhancedJobs);

      // Process and save jobs to database
      const newJobs = await this.saveJobsToDatabase(sortedJobs, userId);

      // Send email notification if new jobs found
      if (newJobs.length > 0) {
        await emailJobReport(user.email, user.userName, newJobs);
      }

      return {
        success: true,
        jobCount: newJobs.length
      };

    } catch (error) {
      console.error('Job scraping failed:', error);
      return {
        success: false,
        jobCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async scrapeLinkedInJobs(keywords: string[]): Promise<JobData[]> {
    logger.info('🔗 Scraping LinkedIn jobs...');
    const jobs: JobData[] = [];

    // Load cheerio dynamically
    const cheerio = await import('cheerio');

    for (const keyword of keywords) {
      try {
        logger.info(`🔍 LinkedIn search: "${keyword}"`);

        // LinkedIn requires login for job search, so we'll use a basic approach
        // This is a simplified version that gets public job listings
        const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Israel&geoId=101620260&f_TPR=r604800&position=1&pageNum=0`;
        
        const html = await this.makeRequest(searchUrl);
        if (!html) {
          logger.warn(`❌ Failed to fetch LinkedIn page for "${keyword}"`);
          continue;
        }
        const $ = cheerio.load(html);

        // LinkedIn job card selectors
        const jobCards = $('.base-card');
        
        if (jobCards.length > 0) {
          logger.info(`✅ Found ${jobCards.length} LinkedIn jobs`);

          jobCards.slice(0, 10).each((i, element) => {
            try {
              const jobCard = $(element);
              const cardText = jobCard.text();

              // Check if job should be skipped (already applied, viewed, etc.)
              const jobStatus = this.checkLinkedInJobStatus(jobCard);
              if (jobStatus.skip) {
                logger.info(`⏭️ Skipping: ${jobStatus.reason}`);
                return; // continue in cheerio each
              }

              // Parse job data using the same logic as original
              const jobData = this.parseLinkedInJobData(cardText);
              
              if (jobData && jobData.title && jobData.company) {
                // Extract URL and finalize job data
                const fullJobData: JobData = {
                  title: jobData.title,
                  company: jobData.company,
                  location: jobData.location || 'Israel',
                  postingDate: jobData.postingDate || 'Unknown',
                  postingDays: jobData.postingDays || 999,
                  source: 'LinkedIn' as const,
                  url: this.getLinkedInJobUrl(jobCard),
                  description: this.cleanDescription(cardText),
                  searchKeyword: keyword,
                  scrapedAt: new Date()
                };

                jobs.push(fullJobData);
                logger.info(`✅ LinkedIn: ${fullJobData.title} at ${fullJobData.company} (${fullJobData.postingDate})`);
              }

            } catch (error) {
              logger.warn(`❌ Error extracting LinkedIn job ${i}: ${error}`);
            }
          });
        }

        // Rate limiting is now handled by makeRequest method

      } catch (error) {
        logger.warn(`❌ LinkedIn error for "${keyword}": ${error}`);
      }
    }

    logger.warn(`📊 LinkedIn total: ${jobs.length} jobs`);
    return jobs;
  }

  private async scrapeDrushimJobs(searchParams: Array<{ position: string; experience: string }>): Promise<JobData[]> {
    console.log('🇮🇱 Scraping Drushim jobs with HTTP requests...');
    const jobs: JobData[] = [];

    // Load cheerio dynamically
    const cheerio = await import('cheerio');

    for (const searchParam of searchParams) {
      try {
        const keyword = searchParam.position;
        const experience = searchParam.experience;
        
        console.log(`🔍 Drushim search: "${keyword}" (${experience} years experience)`);

        const searchUrl = `https://www.drushim.co.il/jobs/search/${encodeURIComponent(keyword)}/?experience=${encodeURIComponent(experience)}&ssaen=1`;
        
        const html = await this.makeRequest(searchUrl);
        if (!html) {
          console.log(`❌ Failed to fetch Drushim page for "${keyword}"`);
          continue;
        }
        const $ = cheerio.load(html);

        // First try to extract from JSON data (like the working scraper)
        const jsonJobs = this.extractDrushimJsonData(html);
        if (jsonJobs.length > 0) {
          console.log(`✅ Found ${jsonJobs.length} Drushim jobs from JSON data`);
          
          for (const jsonJob of jsonJobs.slice(0, 15)) {
            const jobData = this.parseDrushimJsonJob(jsonJob, `${keyword} (${experience} years)`);
            if (jobData && jobData.title && jobData.company) {
              jobs.push(jobData);
              logger.info(`✅ JSON: ${jobData.title} at ${jobData.company} (${jobData.postingDate})`);
            }
          }
        } else {
          // Fallback to HTML extraction
          logger.warn('⚠️ JSON extraction failed, trying HTML selectors...');
          
          const jobSelectors = [
            '.JobItem',
            '.job-item', 
            '.search-results .item',
            '.job-card',
            '.position-card',
            'article[class*="job"]',
            'div[class*="job"]',
            '.result-item'
          ];

          let jobCards: ReturnType<typeof $> | null = null;
          for (const selector of jobSelectors) {
            jobCards = $(selector);
            if (jobCards.length > 0) {
              logger.info(`✅ Found ${jobCards.length} Drushim jobs using selector: ${selector}`);
              break;
            }
          }

          if (jobCards && jobCards.length > 0) {
            const keywordJobs = this.extractDrushimJobsFromHTML($, jobCards, `${keyword} (${experience} years)`);
            jobs.push(...keywordJobs);
          } else {
            console.log(`⚠️ No job cards found for "${keyword}"`);
          }
        }

        // Rate limiting is now handled by makeRequest method

      } catch (error) {
        console.log(`❌ Drushim error for "${searchParam.position}": ${error}`);
      }
    }

    console.log(`📊 Drushim total: ${jobs.length} jobs`);
    return jobs;
  }

  private extractDrushimJsonData(html: string): unknown[] {
    try {
      // Extract job data from Drushim's __NUXT__ object or window data
      const nuxtMatch = html.match(/<script[^>]*>window\.__NUXT__\s*=\s*([\s\S]+?)<\/script>/);
      if (nuxtMatch) {
        let jsonStr = nuxtMatch[1];
        
        // Clean up the JSON string - remove trailing semicolons and JavaScript code
        jsonStr = jsonStr.replace(/;[\s\S]*$/, '');
        jsonStr = jsonStr.trim();
        
        // Handle case where it's wrapped in a function call like "(function(){...})"
        if (jsonStr.startsWith('(function') || jsonStr.startsWith('function')) {
          logger.warn('⚠️ Drushim returned JavaScript code instead of JSON, falling back to HTML parsing');
          return [];
        }
        
        const nuxtData = JSON.parse(jsonStr);
        
        if (nuxtData && nuxtData.data && nuxtData.data[0]) {
          const data = nuxtData.data[0];
          
          // Look for job arrays in the data structure
          const findJobs = (obj: unknown): unknown[] => {
            if (Array.isArray(obj)) {
              // Check if this looks like a jobs array
              const firstItem = obj[0];
              if (firstItem && (firstItem.JobContent || firstItem.Name || firstItem.Company)) {
                return obj;
              }
            }
            
            if (typeof obj === 'object' && obj !== null) {
              const objectRecord = obj as Record<string, unknown>;
              for (const key in objectRecord) {
                const result = findJobs(objectRecord[key]);
                if (result.length > 0) return result;
              }
            }
            
            return [];
          };
          
          const jobs = findJobs(data);
          return jobs;
        }
      }
      
      // Alternative: Look for other JSON data patterns
      const dataMatches = html.match(/"JobContent":\s*{[^}]+}/g);
      if (dataMatches) {
        return dataMatches.map(match => {
          try {
            return JSON.parse(`{${match}}`);
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn('⚠️ Drushim JSON parsing failed - website may have changed structure or returned JavaScript');
      } else {
        logger.error('❌ Error extracting Drushim JSON data:', error as Error);
      }
    }
    
    return [];
  }

  private parseDrushimJsonJob(jobJson: unknown, keyword: string): JobData | null {
    try {
      let title = '';
      let company = '';
      let location = 'Israel';
      let postingDate = 'Unknown';
      let postingDays = 999;
      let description = '';
      let url = '';

      // Type guard and extract data based on Drushim JSON structure
      const job = jobJson as Record<string, unknown>;
      
      if (job['JobContent']) {
        const jobContent = job['JobContent'] as Record<string, unknown>;
        title = (jobContent['Name'] as string) || '';
        company = ((jobContent['Company'] as Record<string, unknown>)?.['CompanyDisplayName'] as string) || '';
        location = ((jobContent['Addresses'] as string[])?.[0]) || 'Israel';
        description = (jobContent['Description'] as string) || '';
        url = `https://www.drushim.co.il/job/${(jobContent['Id'] as string) || ''}`;
        
        // Extract posting date info
        if (jobContent['PublishDate']) {
          const publishDate = new Date(jobContent['PublishDate'] as string);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - publishDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          postingDays = diffDays;
          postingDate = diffDays === 0 ? 'היום' :
                       diffDays === 1 ? 'אתמול' :
                       `${diffDays} ימים`;
        }
      } else {
        // Alternative structure
        title = (job['Name'] as string) || (job['title'] as string) || '';
        company = ((job['Company'] as Record<string, unknown>)?.['CompanyDisplayName'] as string) || (job['company'] as string) || '';
        location = (job['location'] as string) || 'Israel';
        description = (job['Description'] as string) || (job['description'] as string) || '';
        url = (job['url'] as string) || `https://www.drushim.co.il/jobs/search/${encodeURIComponent(title)}`;
      }

      if (title && company) {
        return {
          title: title.trim(),
          company: company.trim(),
          location: location.trim(),
          postingDate: postingDate.trim(),
          postingDays,
          source: 'Drushim.il' as const,
          url,
          description: description.trim(),
          searchKeyword: keyword,
          scrapedAt: new Date()
        };
      }

    } catch (error) {
      console.log('Error parsing Drushim JSON job:', error);
    }
    
    return null;
  }

  private extractDrushimJobsFromHTML($: unknown, jobCards: unknown, keyword: string): JobData[] {
    const jobs: JobData[] = [];

    (jobCards as { slice: (start: number, end: number) => { each: (fn: (i: number, element: unknown) => void) => void } }).slice(0, 15).each((i: number, element: unknown) => {
      try {
        const jobCard = ($ as (element: unknown) => { 
          text: () => string; 
          find: (selector: string) => { length: number; attr: (name: string) => string | undefined; first: () => unknown }; 
        })(element);
        const cardText = jobCard.text();

        // Use the same parsing logic as the working scraper
        const jobData = this.parseDrushimJobData(cardText, keyword);
        
        // Extract URL from the job card
        if (jobData) {
          let url = 'https://www.drushim.co.il';
          
          // Try to find URL
          const linkElement = jobCard.find('a[href*="/job/"], a[href*="/jobs/"]').first() as { length: number; attr: (name: string) => string | undefined };
          if (linkElement.length) {
            const href = linkElement.attr('href');
            if (href) {
              url = href.startsWith('http') ? href : `https://www.drushim.co.il${href}`;
            }
          }
          
          jobData.url = url;
          
          if (jobData.title && jobData.company) {
            jobs.push(jobData);
            console.log(`✅ HTML: ${jobData.title} at ${jobData.company} (${jobData.postingDate})`);
          }
        }

      } catch (error) {
        console.log(`❌ Error extracting Drushim job ${i}:`, error);
      }
    });

    return jobs;
  }

  private parseDrushimJobData(cardText: string, keyword: string): JobData | null {
    try {
      const lines = cardText.split('\n').filter(line => line.trim().length > 0);

      let title = '';
      let company = '';
      let location = 'Israel';
      let postingDate = 'Unknown';
      let postingDays = 999;

      // Extract posting date using Hebrew patterns
      for (const line of lines) {
        const dateInfo = this.extractPostingDate(line) || this.extractHebrewDate(line);
        if (dateInfo) {
          postingDate = dateInfo.text;
          postingDays = dateInfo.days;
          break;
        }
      }

      // Extract title and company - filter out noise
      const cleanLines = lines.filter(line => 
        line.trim().length > 2 &&
        !line.includes('with verification') &&
        !line.includes('Apply') &&
        !line.includes('Save') &&
        !line.includes('ago') &&
        !line.includes('שעות') &&
        !line.includes('ימים') &&
        !line.includes('אתמול') &&
        !line.includes('היום')
      );

      if (cleanLines.length > 0) {
        title = cleanLines[0].trim();
      }

      // Look for company name in subsequent lines
      for (let i = 1; i < cleanLines.length && i < 4; i++) {
        const line = cleanLines[i].trim();
        if (line !== title && line.length > 1 && line.length < 50 &&
            !line.includes('שכר') && !line.includes('משרה') && 
            !line.includes('אזור') && !line.includes('ניסיון')) {
          company = line;
          break;
        }
      }

      // Look for location
      for (const line of cleanLines) {
        if (line.includes('תל אביב') || line.includes('Tel Aviv')) {
          location = 'תל אביב';
          break;
        } else if (line.includes('ירושלים') || line.includes('Jerusalem')) {
          location = 'ירושלים';
          break;
        } else if (line.includes('חיפה') || line.includes('Haifa')) {
          location = 'חיפה';
          break;
        }
      }

      if (title && company) {
        return {
          title: title.trim(),
          company: company.trim(),
          location: location.trim(),
          postingDate: postingDate.trim(),
          postingDays,
          source: 'Drushim.il' as const,
          url: 'https://www.drushim.co.il',
          description: '',
          searchKeyword: keyword,
          scrapedAt: new Date()
        };
      }

    } catch (error) {
      console.log('Error parsing Drushim job data:', error);
    }
    
    return null;
  }

  private extractHebrewDate(text: string): { text: string; days: number } | null {
    // Hebrew date patterns
    const hebrewPatterns = [
      { pattern: /(\d+)\s*(יום|ימים)\s*/, multiplier: 1 },
      { pattern: /(\d+)\s*(שעה|שעות)\s*/, multiplier: 0 },
      { pattern: /(\d+)\s*(שבוע|שבועות)\s*/, multiplier: 7 },
      { pattern: /(אתמול)/, multiplier: 1, fixedDays: 1 },
      { pattern: /(היום)/, multiplier: 0, fixedDays: 0 }
    ];

    for (const { pattern, multiplier, fixedDays } of hebrewPatterns) {
      const match = text.match(pattern);
      if (match) {
        const fullText = match[0];
        const days = fixedDays !== undefined ? fixedDays : 
                    (match[1] ? parseInt(match[1]) * multiplier : 0);

        return { text: fullText.trim(), days };
      }
    }

    return null;
  }

  private extractPostingDate(text: string): { text: string; days: number } | null {
    const patterns = [
      { pattern: /(\d+)\s+(day|days)\s+ago/i, multiplier: 1 },
      { pattern: /(\d+)\s+(hour|hours)\s+ago/i, multiplier: 0 },
      { pattern: /(\d+)\s+(week|weeks)\s+ago/i, multiplier: 7 },
      { pattern: /(\d+)\s+(month|months)\s+ago/i, multiplier: 30 },
      { pattern: /(yesterday)/i, fixedDays: 1 },
      { pattern: /(today)/i, fixedDays: 0 },
      { pattern: /(just\s+now|moments?\s+ago)/i, fixedDays: 0 }
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

  private calculatePostingDays(postingDate: string): number {
    const text = postingDate.toLowerCase();
    
    if (text.includes('היום') || text.includes('today') || text.includes('now')) return 0;
    if (text.includes('אתמול') || text.includes('yesterday')) return 1;
    
    const dayMatch = text.match(/(\d+).*?(day|יום|ימים)/);
    if (dayMatch) return parseInt(dayMatch[1]);
    
    const hourMatch = text.match(/(\d+).*?(hour|שעה|שעות)/);
    if (hourMatch) return 0;
    
    const weekMatch = text.match(/(\d+).*?(week|שבוע|שבועות)/);
    if (weekMatch) return parseInt(weekMatch[1]) * 7;
    
    return 999;
  }

  private async saveJobsToDatabase(jobs: JobData[], userId: string): Promise<JobData[]> {
    const newJobs: JobData[] = [];

    for (const jobData of jobs) {
      try {
        // Check if job already exists for this user
        const existingJob = await Job.findOne({
          title: jobData.title,
          company: jobData.company,
          user: userId
        });

        if (!existingJob) {
          await Job.create({
            ...jobData,
            user: userId
          });
          newJobs.push(jobData);
        }
      } catch (error) {
        console.error('Error saving job:', error);
      }
    }

    console.log(`💾 Saved ${newJobs.length} new jobs to database`);
    return newJobs;
  }

  // ========== MISSING METHODS FROM ORIGINAL ==========
  
  private checkLinkedInJobStatus(jobCard: unknown): { skip: boolean; reason: string } {
    try {
      // Look for footer indicators that show job status
      const footerElement = (jobCard as { find: (selector: string) => { length: number; text: () => string } }).find('.job-card-container__footer-item.job-card-container__footer-job-state.t-bold');
      
      if (footerElement.length > 0) {
        const footerText = footerElement.text().toLowerCase().trim();
        
        if (footerText.includes('applied') || footerText.includes('viewed') || footerText.includes('saved')) {
          return { skip: true, reason: `Already ${footerText}` };
        }
      }
      
      return { skip: false, reason: 'New job' };
      
    } catch {
      return { skip: false, reason: 'Status unknown' };
    }
  }

  private parseLinkedInJobData(cardText: string): Partial<JobData> | null {
    try {
      const lines = cardText.split('\n').filter(line => line.trim().length > 0);

      let title = '';
      let company = '';
      let location = 'Israel';
      let postingDate = 'Unknown';
      let postingDays = 999;

      // Extract posting date
      for (const line of lines) {
        const dateInfo = this.extractPostingDate(line);
        if (dateInfo) {
          postingDate = dateInfo.text;
          postingDays = dateInfo.days;
          break;
        }
      }

      // Extract title and company - filter out noise
      const cleanLines = lines.filter(line => 
        !line.includes('with verification') &&
        !line.includes('Apply') &&
        !line.includes('Save') &&
        !line.includes('ago') &&
        line.trim().length > 2
      );

      if (cleanLines.length > 0) {
        title = cleanLines[0].trim().replace(/\s+with verification\s*$/i, '');
      }

      // Look for company name in subsequent lines
      for (let i = 1; i < cleanLines.length && i < 5; i++) {
        const line = cleanLines[i].trim();
        if (line !== title && line.length > 1 && line.length < 60 &&
            !line.includes('Israel') && !line.includes('Tel Aviv')) {
          company = line.replace(/\s+with verification\s*$/i, '');
          break;
        }
      }

      // Extract location
      for (const line of lines) {
        if ((line.includes('Israel') || line.includes('Tel Aviv')) && line.length < 100) {
          location = line.trim();
          break;
        }
      }

      return title && company ? { title, company, location, postingDate, postingDays } : null;

    } catch {
      return null;
    }
  }

  private getLinkedInJobUrl(jobCard: unknown): string {
    try {
      const linkElement = (jobCard as { find: (selector: string) => { length: number; attr: (name: string) => string | undefined } }).find('a[href*="/jobs/view/"]');
      if (linkElement.length > 0) {
        const href = linkElement.attr('href');
        if (href) {
          return href.startsWith('http') ? href : `https://linkedin.com${href}`;
        }
      }
    } catch {
      // URL extraction failed
    }
    return 'https://linkedin.com/jobs';
  }

  // Utility methods for job deduplication and sorting (from original)
  removeDuplicates(jobs: JobData[]): JobData[] {
    const seen = new Map();
    const unique: JobData[] = [];

    for (const job of jobs) {
      // Create key based on title and company, ignoring source
      const key = `${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}-${job.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(job);
      } else {
        console.log(`⚠️ Removing duplicate: ${job.title} at ${job.company} (from ${job.source})`);
      }
    }

    return unique;
  }

  sortByDateAndSource(jobs: JobData[]): JobData[] {
    console.log('📅 Sorting jobs by date (newest first) and source...');

    return jobs.sort((a, b) => {
      // Sort by posting date first (newest first)
      if (a.postingDays !== b.postingDays) {
        return a.postingDays - b.postingDays;
      }
      // If same date, prioritize LinkedIn (better job descriptions usually)
      if (a.source !== b.source) {
        return a.source === 'LinkedIn' ? -1 : 1;
      }
      return 0;
    });
  }

  cleanDescription(description: string): string {
    if (typeof description !== 'string') return '';
    
    // Clean up description for better display
    return description
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[""]/g, '"') // Normalize quote marks
      .trim()
      .slice(0, 1000); // Limit length for readability
  }

  /**
   * Map LinkedIn experience level to years for Drushim searches
   */
  private mapExperienceLevelToYears(level: string): string {
    const mapping: Record<string, string> = {
      'entry': '0-2',
      'associate': '2-4', 
      'mid': '3-7',
      'senior': '5-10',
      'director': '8-15',
      'executive': '10+'
    };
    return mapping[level] || '2-5';
  }

  /**
   * Enhanced job filtering based on user LinkedIn preferences
   */
  private filterJobsByPreferences(jobs: JobData[], userId: string, preferences?: {
    experienceLevel?: string;
    jobTypes?: string[];
    remoteWork?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    companySize?: string[];
  }): JobData[] {
    if (!preferences) return jobs;

    return jobs.filter(job => {
      // Filter by remote work preference
      if (preferences.remoteWork !== undefined) {
        const isRemote = job.title.toLowerCase().includes('remote') || 
                        job.description.toLowerCase().includes('remote') ||
                        job.location.toLowerCase().includes('remote');
        if (preferences.remoteWork && !isRemote) return false;
        if (!preferences.remoteWork && isRemote) return false;
      }

      // Filter by job types (full-time, part-time, etc.)
      if (preferences.jobTypes && preferences.jobTypes.length > 0) {
        const jobTypeMatch = preferences.jobTypes.some(type => {
          const typeKeywords = {
            'full-time': ['full-time', 'full time', 'פול-טיים', 'משרה מלאה'],
            'part-time': ['part-time', 'part time', 'חלקית', 'משרה חלקית'],
            'contract': ['contract', 'contractor', 'קבלן', 'חוזה'],
            'temporary': ['temporary', 'temp', 'זמני'],
            'internship': ['intern', 'internship', 'סטאז\'', 'התמחות']
          };
          
          const keywords = typeKeywords[type as keyof typeof typeKeywords] || [type];
          return keywords.some(keyword => 
            job.title.toLowerCase().includes(keyword) || 
            job.description.toLowerCase().includes(keyword)
          );
        });
        
        if (!jobTypeMatch) return false;
      }

      return true;
    });
  }

  /**
   * Add LinkedIn insights to job data
   */
  private async addLinkedInInsights(jobs: JobData[], userId: string): Promise<JobData[]> {
    const hasLinkedInCredentials = await LinkedInCredentialsService.hasLinkedInCredentials(userId);
    
    if (!hasLinkedInCredentials) {
      return jobs;
    }

    // Add LinkedIn-specific metadata to jobs
    return jobs.map(job => ({
      ...job,
      // Add a flag to indicate this job was enhanced with LinkedIn data
      linkedInEnhanced: true,
      // Add matching score based on user profile (placeholder - would require more complex matching)
      matchScore: this.calculateJobMatchScore(job)
    }));
  }

  /**
   * Calculate job matching score based on user profile
   * (Simplified version - in production this would be more sophisticated)
   */
  private calculateJobMatchScore(job: JobData): number {
    // Base score
    let score = 50;
    
    // Boost score for recent postings
    if (job.postingDays <= 1) score += 20;
    else if (job.postingDays <= 7) score += 10;
    
    // Boost score for specific sources
    if (job.source === 'LinkedIn') score += 15;
    
    // Boost score for detailed descriptions
    if (job.description.length > 500) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Fallback search strategy when primary methods fail
   */
  private async fallbackJobSearch(searchConfig: SearchConfig): Promise<JobData[]> {
    logger.info('🔄 Executing fallback job search strategy...');
    const fallbackJobs: JobData[] = [];

    // Future enhancement: could add more job sites
    // const fallbackSources = [
    //   { name: 'AllJobs.co.il', url: 'https://www.alljobs.co.il' },
    //   { name: 'JobMaster.co.il', url: 'https://www.jobmaster.co.il' },
    //   { name: 'Jobs.co.il', url: 'https://www.jobs.co.il' }
    // ];

    // For each LinkedIn keyword, try simpler searches
    for (const keyword of searchConfig.linkedin.slice(0, 3)) { // Limit fallback searches
      try {
        logger.info(`🔍 Fallback search for: "${keyword}"`);
        
        // Try simplified keyword searches
        const simplifiedKeywords = this.extractCoreKeywords(keyword);
        
        for (const simpleKeyword of simplifiedKeywords) {
          // Try Drushim with simplified keyword
          const drushimJobs = await this.scrapeDrushimJobs([{
            position: simpleKeyword,
            experience: '0-5'
          }]);
          
          if (drushimJobs.length > 0) {
            fallbackJobs.push(...drushimJobs.slice(0, 5)); // Limit results
            logger.info(`✅ Fallback found ${drushimJobs.length} jobs for "${simpleKeyword}"`);
          }
          
          // Don't overwhelm with too many requests
          if (fallbackJobs.length >= 20) break;
        }
        
        if (fallbackJobs.length >= 20) break;
      } catch (error) {
        logger.warn(`❌ Fallback search failed for "${keyword}": ${error}`);
      }
    }

    return fallbackJobs;
  }

  /**
   * Extract core keywords from complex search terms
   */
  private extractCoreKeywords(searchTerm: string): string[] {
    // Remove location and common words
    const cleanTerm = searchTerm
      .replace(/\b(Israel|Tel Aviv|Jerusalem|Haifa|remote|מרוחק)\b/gi, '')
      .replace(/\b(engineer|developer|manager|analyst|consultant)\b/gi, '$&') // Keep these
      .trim();

    const words = cleanTerm.split(/\s+/).filter(word => 
      word.length > 2 && 
      !['and', 'or', 'the', 'with', 'for'].includes(word.toLowerCase())
    );

    // Return original term and first meaningful word
    return [cleanTerm, words[0]].filter(Boolean).slice(0, 2);
  }

  /**
   * Enhanced scraping with recovery and fallback
   */
  async scrapeWithFallback(userId: string, searchConfig: SearchConfig): Promise<{ success: boolean; jobCount: number; error?: string; usedFallback?: boolean }> {
    try {

      // Try primary scraping method first
      const primaryResult = await this.scrapeJobsForUser(userId, searchConfig);
      
      if (primaryResult.success && primaryResult.jobCount > 0) {
        return primaryResult;
      }

      // If primary method failed or found no jobs, try fallback
      logger.warn('🔄 Primary scraping yielded no results, trying fallback methods...');
      
      const fallbackJobs = await this.fallbackJobSearch(searchConfig);
      
      if (fallbackJobs.length > 0) {
        // Process fallback jobs
        const uniqueJobs = this.removeDuplicates(fallbackJobs);
        const sortedJobs = this.sortByDateAndSource(uniqueJobs);
        const newJobs = await this.saveJobsToDatabase(sortedJobs, userId);

        // Send email notification
        if (newJobs.length > 0) {
          const user = await User.findById(userId);
          if (user) {
            await emailJobReport(user.email, user.userName, newJobs);
          }
        }

        return {
          success: true,
          jobCount: newJobs.length,
          usedFallback: true
        };
      }

      return {
        success: false,
        jobCount: 0,
        error: 'No jobs found with primary or fallback methods'
      };

    } catch (error) {
      logger.error(`Fallback scraping failed: ${error}`);
      return {
        success: false,
        jobCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Default search configuration
export const defaultSearchConfig: SearchConfig = {
  linkedin: [
    'solution engineer Israel',
    'technical consultant Israel',
    'product manager Israel'
  ],
  drushim: [
    { position: 'Product Manager', experience: '0-2' },
    { position: 'Solution Engineer', experience: '0-2' },
    { position: 'Technical Consultant', experience: '0-2' },
  ]
};