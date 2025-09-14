import { config } from 'dotenv';
config();

import '@/ai/flows/generate-travel-itineraries.ts';
import '@/ai/flows/flight-booking-assistant.ts';
import '@/ai/flows/visual-flight-search.ts';
import '@/ai/flows/classic-flight-search.ts';
import '@/ai/flows/analyze-flight-results.ts';
