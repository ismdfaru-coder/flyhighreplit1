
"use client";

import { useEffect, useState, useMemo } from 'react';
import { visualFlightSearch } from '@/ai/flows/visual-flight-search';
import { type Flight, type VisualFlightSearchInput, type ClassicFlightSearchOutput } from '@/types';
import FlightCard from '@/components/flight-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface FlightResultsViewProps {
    query: string;
    layout?: 'list' | 'grid';
}

const MAX_TRANSACTIONS = 5;

const logClassicSearchTransaction = (url: string, markdownContent: string, cheapestPrice: number | null) => {
    try {
        const newTransaction = { url, markdownContent, cheapestPrice, timestamp: new Date().toISOString() };
        const existing = localStorage.getItem("classic_scraper_transactions");
        let transactions = existing ? JSON.parse(existing) : [];
        transactions.unshift(newTransaction);
        if (transactions.length > MAX_TRANSACTIONS) {
            transactions = transactions.slice(0, MAX_TRANSACTIONS);
        }
        localStorage.setItem("classic_scraper_transactions", JSON.stringify(transactions));
    } catch (error) {
        console.error("Failed to log classic search transaction to localStorage", error);
    }
}

// Helper to parse the classic form query into structured data
function parseClassicQuery(query: string): VisualFlightSearchInput {
    const defaultReturn = {
        origin: 'Glasgow',
        destination: 'Chennai',
        dates: 'anytime',
        passengers: 1,
        flightClass: 'economy'
    };

    const parts = query.toLowerCase().split(' ');
    
    let to = defaultReturn.destination;
    const toIndex = parts.indexOf('to');
    if (toIndex !== -1 && parts[toIndex + 1]) {
        to = parts[toIndex + 1];
    }

    let from = defaultReturn.origin;
    const fromIndex = parts.indexOf('from');
    if (fromIndex !== -1 && parts[fromIndex + 1]) {
        from = parts[fromIndex + 1];
    }

    let dates = defaultReturn.dates;
    const datesFromIndex = parts.indexOf('from', fromIndex + 1); // search for second "from" for dates
    const datesOnIndex = parts.indexOf('on');

    if (datesFromIndex !== -1 && parts[datesFromIndex + 1]) {
        const datePart = parts.slice(datesFromIndex + 1).join(' ');
        dates = datePart.split(' for ')[0];
    } else if (datesOnIndex !== -1 && parts[datesOnIndex + 1]) {
        const datePart = parts.slice(datesOnIndex + 1).join(' ');
        dates = datePart.split(' for ')[0];
    }

    let passengers = defaultReturn.passengers;
    const forIndex = parts.indexOf('for');
    if (forIndex !== -1 && parts[forIndex + 1]) {
        passengers = parseInt(parts[forIndex + 1], 10) || 1;
    }

    return {
        origin: from.charAt(0).toUpperCase() + from.slice(1),
        destination: to.charAt(0).toUpperCase() + to.slice(1),
        dates: dates,
        passengers: passengers,
        flightClass: 'economy'
    };
}


export default function FlightResultsView({ query, layout = 'list' }: FlightResultsViewProps) {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sort, setSort] = useState('best');
    const [activeTab, setActiveTab] = useState('best');
    const [parsedDetails, setParsedDetails] = useState<VisualFlightSearchInput | null>(null);
    const [cheapestPrice, setCheapestPrice] = useState<number | null>(null);

    useEffect(() => {
        if (!query) {
            setLoading(false);
            return;
        }

        const fetchQueryAndFlights = async () => {
            setLoading(true);
            setError(null);
            setFlights([]);
            setCheapestPrice(null);

            try {
                const searchInput = parseClassicQuery(query);
                setParsedDetails(searchInput);

                const searchResult = await visualFlightSearch(searchInput);
                
                if (searchResult.redirectUrl && searchResult.htmlContent) {
                    logClassicSearchTransaction(searchResult.redirectUrl, searchResult.htmlContent, searchResult.cheapestPrice);
                }

                if (searchResult.cheapestPrice !== null) {
                    setCheapestPrice(searchResult.cheapestPrice);
                    // For now, we only get the price, so we create a placeholder flight card
                    const placeholderFlight: Flight = {
                        id: 'placeholder-0',
                        price: searchResult.cheapestPrice,
                        provider: 'Google Flights',
                        from: { time: 'N/A', code: searchInput.origin.substring(0, 3).toUpperCase() },
                        to: { time: 'N/A', code: searchInput.destination.substring(0, 3).toUpperCase() },
                        duration: 'Details on provider site',
                        stops: 0,
                        legs: [{
                            airline: 'Multiple Airlines',
                            airlineLogoUrl: `https://picsum.photos/40/40?random=2`,
                            departureTime: searchInput.origin,
                            arrivalTime: searchInput.destination,
                            duration: 'Details on provider site',
                            stops: 'Unknown',
                        }]
                    };
                    setFlights([placeholderFlight]);
                } else {
                    setError("Could not find any flights for the given query. The scraper may have been blocked or no flights are available. Please try a different search.");
                }

            } catch (err) {
                console.error(err);
                if (err instanceof Error) {
                   if (err.message.includes('429')) {
                     setError("You've exceeded the daily limit for the API model. Please check your plan and billing details, then try again later.");
                   } else {
                     setError(`Failed to fetch flights: ${err.message}`);
                   }
                } else {
                   setError('An unknown error occurred while fetching flights.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchQueryAndFlights();
    }, [query]);
    
     const sortedFlights = useMemo(() => {
        // Since we only have one price, sorting is not very effective.
        // We will return the flights as is, but this can be expanded later.
        return flights;
    }, [flights, activeTab]);

    const bestFlight = useMemo(() => {
        return flights.length > 0 ? flights[0] : null
    }, [flights]);

    const cheapestFlight = useMemo(() => flights.length > 0 ? flights[0] : null, [flights]);
    
    const fastestFlight = useMemo(() => {
        return flights.length > 0 ? flights[0] : null;
    }, [flights]);


    if (loading) {
        return (
             <div className="space-y-4 p-4">
                 <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-9 w-40" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-9 w-32" />
                </div>
                 <Skeleton className="h-12 w-full mb-4" />
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
            </div>
        );
    }
    
    if (error) {
        return <Alert variant="destructive" className="m-8 max-w-2xl mx-auto"><Terminal className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    if (!query) {
         return <div className="text-center py-20">Please go back and enter a search query.</div>
    }
    
    const containerClasses = layout === 'grid' ? "p-0" : "container mx-auto max-w-7xl px-4 py-8";

    return (
        <div className={containerClasses}>
            {layout === 'grid' && (
                <div className="flex items-center justify-between mb-4">
                     <div>
                        <h2 className="text-xl font-bold">{parsedDetails?.origin} to {parsedDetails?.destination}</h2>
                        <p className="text-sm text-muted-foreground">{flights.length > 0 ? 'Cheapest price found' : 'No results'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline"><Bell className="mr-2 h-4 w-4" /> Get Price Alerts</Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Sort by: {sort.charAt(0).toUpperCase() + sort.slice(1)}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                                    <DropdownMenuRadioItem value="best">Best</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="cheapest">Cheapest</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="fastest">Fastest</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            )}
             {layout === 'grid' ? (
                 <div className="space-y-4">
                    <Tabs defaultValue="best" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="best" disabled={!bestFlight}>
                                Best <span className="font-normal text-muted-foreground ml-2">£{bestFlight?.price || 'N/A'}</span>
                            </TabsTrigger>
                             <TabsTrigger value="cheapest" disabled={!cheapestFlight}>
                                Cheapest <span className="font-normal text-muted-foreground ml-2">£{cheapestFlight?.price || 'N/A'}</span>
                            </TabsTrigger>
                             <TabsTrigger value="fastest" disabled={!fastestFlight}>
                                Fastest <span className="font-normal text-muted-foreground ml-2">£{fastestFlight?.price || 'N/A'}</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {sortedFlights.map(flight => <FlightCard key={flight.id} flight={flight} layout="grid" />)}
                 </div>
            ) : (
                 <div className={cn(
                    "overflow-y-auto",
                    "space-y-4"
                )}>
                    {sortedFlights.length > 0 ? (
                        sortedFlights.map(flight => <FlightCard key={flight.id} flight={flight} layout={layout} />)
                    ) : (
                        <p>No flights found for your query.</p>
                    )}
                </div>
            )}
        </div>
    );
}
