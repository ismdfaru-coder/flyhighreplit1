
'use server';
/**
 * @fileOverview A flow to perform a visual search on Google Flights.
 * It takes a flight query, gets the HTML of the results page, and uses vision AI
 * to extract flight information.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { scrapeUrlAsMarkdown, extractCheapestPrice } from '@/services/scraper-service';
import { FlightSchema, Flight, VisualFlightSearchInput, VisualFlightSearchOutput, VisualFlightSearchInputSchema, VisualFlightSearchOutputSchema } from '@/types';
import { format, parse, isValid, addDays, nextSunday, setYear } from 'date-fns';


export async function visualFlightSearch(input: VisualFlightSearchInput): Promise<VisualFlightSearchOutput> {
  return visualFlightSearchFlow(input);
}

// Helper function to safely parse and format dates
const formatDate = (dateString: string | undefined): string | null => {
    if (!dateString) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to the beginning of the day for accurate comparison
    const currentYear = now.getFullYear();
    // Normalize the date string
    const cleanedDateString = dateString
        .trim()
        .toLowerCase()
        .replace(/(\d+)(st|nd|rd|th)/, '$1'); // Remove suffixes like 'st', 'nd', etc.

    // Handle specific keywords
    if (cleanedDateString === 'anytime') return format(now, 'yyyy-MM-dd');
    if (cleanedDateString === 'today') return format(now, 'yyyy-MM-dd');
    if (cleanedDateString === 'tomorrow') return format(addDays(now, 1), 'yyyy-MM-dd');
    if (cleanedDateString === 'next week') {
        const nextSundayDate = nextSunday(now);
        return format(nextSundayDate, 'yyyy-MM-dd');
    }
    
    // Handle 'a week in [Month]'
    const weekInMonthMatch = cleanedDateString.match(/a week in (\w+)/);
    if (weekInMonthMatch) {
        const month = weekInMonthMatch[1];
        // Create a date object for the first day of the matched month in the current year
        const monthDate = parse(month, 'MMMM', new Date());
        if (isValid(monthDate)) {
             return format(monthDate, 'yyyy-MM-dd');
        }
    }
    
    // Attempt to parse various date formats
    const formatsToTry = [
        'yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'MM-dd-yyyy', 'dd-MM-yyyy',
        'MMMM d, yyyy', 'MMM d, yyyy', 'd MMMM yyyy', 'd MMM yyyy',
        'yyyy/MM/dd', 'MMMM d', 'MMM d', 'M/d', 'd MMM',
    ];

    let parsedDate: Date | null = null;

    for (const fmt of formatsToTry) {
        try {
            const date = parse(cleanedDateString, fmt, new Date());
            if (isValid(date)) {
                parsedDate = date;
                break;
            }
        } catch(e) {
            // Ignore parsing errors and try the next format
        }
    }

    if (!parsedDate) {
        // Last resort, try the native Date constructor
        try {
            const generalParsedDate = new Date(cleanedDateString);
            if (isValid(generalParsedDate)) {
                parsedDate = generalParsedDate;
            }
        } catch (e) { /* ignore */ }
    }

    // If a date was parsed, check if a year was missing and default it
    if (parsedDate) {
        const yearWasSpecified = /\d{4}|'\d{2}/.test(cleanedDateString);
        if (!yearWasSpecified) {
             // If year was not specified, and the parsed date is in the past, set it to next year
            let updatedDate = setYear(parsedDate, currentYear);
            if (updatedDate < now) {
                updatedDate = setYear(parsedDate, currentYear + 1);
            }
            parsedDate = updatedDate;
        }
        return format(parsedDate, 'yyyy-MM-dd');
    }

    // If all parsing fails, return null
    return null;
};


const visualFlightSearchFlow = ai.defineFlow(
  {
    name: 'visualFlightSearchFlow',
    inputSchema: VisualFlightSearchInputSchema,
    outputSchema: VisualFlightSearchOutputSchema,
  },
  async (input) => {
    const { origin, destination, dates, passengers, flightClass } = input;
    
    // 1. Construct the Google Flights URL
    const dateParts = dates ? dates.split(' to ') : [];
    
    const departureDateStr = dateParts.length > 0 ? dateParts[0].trim() : dates;
    const returnDateStr = dateParts.length > 1 ? dateParts[1].trim() : undefined;

    const departureDate = formatDate(departureDateStr);
    const returnDate = returnDateStr ? formatDate(returnDateStr) : undefined;

    if (!departureDate) {
        throw new Error("Invalid or missing departure date.");
    }

    const queryParts = ['Flights', 'to', destination, 'from', origin, 'on', departureDate];
    if (returnDate) {
      queryParts.push('through', returnDate);
    }
    if (flightClass && flightClass.toLowerCase() !== 'economy') {
      queryParts.push(flightClass.toLowerCase());
    }
    if (passengers) {
        const p = passengers > 1 ? `${passengers} adults` : `${passengers} adult`
        queryParts.push(p);
    }

    const query = queryParts.join(' ');
    const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query).replace(/%20/g, '+')}&hl=en-gb&gl=gb&currency=GBP`;

    // 2. Scrape the URL for markdown content
    const markdownContent = await scrapeUrlAsMarkdown(url);

    // 3. Extract the cheapest price
    const cheapestPrice = extractCheapestPrice(markdownContent);
    
    // Create a dummy flight object with the price
    let extractedFlights: Flight[] = [];
    if (cheapestPrice !== null) {
      const dummyFlight: Flight = {
        id: 'flight-0',
        price: cheapestPrice,
        provider: 'Google Flights',
        legs: [{
          airline: 'Various',
          airlineLogoUrl: `https://picsum.photos/40/40?random=1`,
          departureTime: 'N/A',
          arrivalTime: 'N/A',
          duration: 'N/A',
          stops: 'N/A',
        }],
      };
      extractedFlights.push(dummyFlight);
    }
    
    // 4. Return the results
    return {
      flights: extractedFlights,
      redirectUrl: url,
      htmlContent: markdownContent, // Store markdown here instead of HTML
      cheapestPrice: cheapestPrice,
    };
  }
);
