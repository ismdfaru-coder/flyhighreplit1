
import * as cheerio from 'cheerio';
import markdownit from 'markdown-it';
import TurndownService from 'turndown';
import https from 'https';

const proxyHost = process.env.PROXY_HOST;
const proxyPort = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : undefined;
const proxyUser = process.env.PROXY_USER;
const proxyPassword = process.env.PROXY_PASSWORD;

async function getHtml(url: string): Promise<string> {
    if (!proxyHost || !proxyPort || !proxyUser || !proxyPassword) {
        throw new Error('Proxy configuration is missing. Please check your environment variables.');
    }

    const agent = new https.HttpsProxyAgent({
        host: proxyHost,
        port: String(proxyPort),
        auth: `${proxyUser}:${proxyPassword}`,
    });

    return new Promise((resolve, reject) => {
        const req = https.get(url, { agent, headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Referer': 'https://www.google.com/'
        } }, (res) => {
            let html = '';
            res.on('data', (chunk) => {
                html += chunk;
            });
            res.on('end', () => {
                resolve(html);
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

export async function scrapeUrlAsMarkdown(url: string): Promise<string> {
    try {
        const html = await getHtml(url);
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        return markdown;
    } catch (error) {
        console.error(`Error scraping URL ${url}:`, error);
        throw new Error(`Failed to scrape URL. Reason: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

export function extractCheapestPrice(markdownContent: string): number | null {
  const priceRegex = /£(\d+(\.\d{1,2})?)/g;
  let cheapestPrice: number | null = null;
  let match;

  while ((match = priceRegex.exec(markdownContent)) !== null) {
    const price = parseFloat(match[1]);
    if (cheapestPrice === null || price < cheapestPrice) {
      cheapestPrice = price;
    }
  }

  return cheapestPrice;
}
