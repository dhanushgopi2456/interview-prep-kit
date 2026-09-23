import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';

interface CrawlResult {
  success: boolean;
  url: string;
  html?: string;
  text?: string;
  title?: string;
  error?: string;
  statusCode?: number;
}

interface PageData {
  url: string;
  title: string;
  text: string;
  links: string[];
}

const USER_AGENT = 'InterviewPrepKit/1.0 (+https://github.com/interview-prep-kit)';
const REQUEST_TIMEOUT = 10000;
const MAX_PAGES = 20;
const MAX_CONTENT_SIZE = 500000;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPrivateAddress(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80::/
    ];
    
    return privateRanges.some(range => range.test(hostname));
  } catch {
    return true;
  }
}

async function fetchWithRetry(url: string, retries = 3): Promise<CrawlResult> {
  if (!isValidUrl(url)) {
    return { success: false, url, error: 'Invalid URL', statusCode: 0 };
  }

  if (isPrivateAddress(url) && process.env.NODE_ENV === 'production') {
    return { success: false, url, error: 'Private addresses not allowed', statusCode: 0 };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { 
          success: false, 
          url, 
          error: `HTTP ${response.status}`, 
          statusCode: response.status 
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return { 
          success: false, 
          url, 
          error: `Unsupported content type: ${contentType}`, 
          statusCode: response.status 
        };
      }

      const html = await response.text();
      if (html.length > MAX_CONTENT_SIZE) {
        return { 
          success: false, 
          url, 
          error: 'Content too large', 
          statusCode: response.status 
        };
      }

      return { success: true, url, html, statusCode: response.status };
    } catch (error) {
      if (attempt === retries) {
        return { 
          success: false, 
          url, 
          error: error instanceof Error ? error.message : 'Fetch failed',
          statusCode: 0 
        };
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  return { success: false, url, error: 'Max retries exceeded', statusCode: 0 };
}

function extractPageData(html: string, baseUrl: string): PageData {
  const $ = cheerio.load(html);
  
  $('script, style, nav, footer, header, aside, noscript, iframe').remove();
  
  const title = $('title').text().trim() || '';
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absolute = new URL(href, baseUrl).href;
        if (isValidUrl(absolute)) {
          links.push(absolute);
        }
      } catch {
      }
    }
  });

  return { url: baseUrl, title, text, links };
}

function scoreLink(url: string, baseUrl: string): number {
  const lower = url.toLowerCase();
  const base = new URL(baseUrl).hostname;
  const target = new URL(url).hostname;
  
  if (target !== base) return -100;
  
  let score = 0;
  
  const hiringKeywords = ['career', 'job', 'hiring', 'recruit', 'join', 'team', 'work', 'talent', 'people', 'culture'];
  const aboutKeywords = ['about', 'company', 'mission', 'values', 'story', 'history', 'team', 'leadership'];
  const techKeywords = ['engineering', 'tech', 'blog', 'technology', 'development', 'open-source'];
  
  hiringKeywords.forEach(kw => { if (lower.includes(kw)) score += 10; });
  aboutKeywords.forEach(kw => { if (lower.includes(kw)) score += 5; });
  techKeywords.forEach(kw => { if (lower.includes(kw)) score += 3; });
  
  if (lower.includes('/career') || lower.includes('/job') || lower.includes('/hiring')) score += 20;
  if (lower.includes('/about')) score += 15;
  if (lower.includes('/blog') || lower.includes('/engineering')) score += 10;
  
  const depth = (url.match(/\//g) || []).length - 2;
  score -= depth * 2;
  
  return score;
}

export async function crawlCompanySite(baseUrl: string): Promise<{
  homepage: PageData | null;
  pages: PageData[];
  hiringPages: PageData[];
  errors: { url: string; error: string }[];
}> {
  const errors: { url: string; error: string }[] = [];
  const visited = new Set<string>();
  const toVisit = [baseUrl];
  const pages: PageData[] = [];
  const hiringPages: PageData[] = [];
  let homepage: PageData | null = null;

  const robotsUrl = new URL('/robots.txt', baseUrl).href;
  const robotsResult = await fetchWithRetry(robotsUrl);
  const robots = robotsResult.success ? robotsParser(robotsUrl, robotsResult.html!) : null;

  while (toVisit.length > 0 && pages.length < MAX_PAGES) {
    const currentUrl = toVisit.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    if (robots && !robots.isAllowed(currentUrl, USER_AGENT)) {
      errors.push({ url: currentUrl, error: 'Disallowed by robots.txt' });
      continue;
    }

    const result = await fetchWithRetry(currentUrl);
    if (!result.success || !result.html) {
      errors.push({ url: currentUrl, error: result.error || 'Unknown error' });
      continue;
    }

    const pageData = extractPageData(result.html, currentUrl);
    pages.push(pageData);

    if (currentUrl === baseUrl || currentUrl === baseUrl + '/') {
      homepage = pageData;
    }

    const scoredLinks = pageData.links
      .filter(l => !visited.has(l))
      .map(l => ({ url: l, score: scoreLink(l, baseUrl) }))
      .filter(l => l.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const link of scoredLinks) {
      toVisit.push(link.url);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  hiringPages.push(...pages.filter(p => scoreLink(p.url, baseUrl) > 15));

  return { homepage, pages, hiringPages, errors };
}

export async function findHiringPages(baseUrl: string, html?: string): Promise<PageData[]> {
  const result = await crawlCompanySite(baseUrl);
  return result.hiringPages;
}

export async function searchPublicDiscussion(companyName: string): Promise<{
  sources: string[];
  summary: string;
}> {
  const searchQueries = [
    `${companyName} interview process`,
    `${companyName} hiring process`,
    `${companyName} interview questions`,
    `site:glassdoor.com ${companyName} interview`,
    `site:reddit.com ${companyName} interview`
  ];

  const sources: string[] = [];
  let summary = '';

  for (const query of searchQueries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
      
      const result = await fetchWithRetry(searchUrl);
      if (result.success && result.html) {
        const $ = cheerio.load(result.html);
        $('.result__url').each((_, el) => {
          const url = $(el).text().trim();
          if (url && isValidUrl(url)) sources.push(url);
        });
        
        $('.result__snippet').each((_, el) => {
          summary += $(el).text().trim() + ' ';
        });
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch {
    }
  }

  return {
    sources: [...new Set(sources)].slice(0, 10),
    summary: summary.slice(0, 3000)
  };
}