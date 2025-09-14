
"use client";

import { useEffect, useState, useRef } from "react";
import { flightBookingAssistant, type FlightBookingInput } from "@/ai/flows/flight-booking-assistant";
import { analyzeFlightResults } from "@/ai/flows/analyze-flight-results";
import { visualFlightSearch } from "@/ai/flows/visual-flight-search";
import { type VisualFlightSearchInput, type VisualFlightSearchOutput } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Bot, Loader2, User, ExternalLink, Ticket, Search, TestTube2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Terminal } from 'lucide-react';
import { type Flight } from "@/types";
import FlightCard from "./flight-card";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isVisualSearch?: boolean;
  visualSearchResult?: {
    redirectUrl: string;
    htmlContent: string;
    flights: Flight[];
    cheapestPrice: number | null;
  };
  analyzedFlights?: Flight[];
  error?: string;
}

const MAX_TRANSACTIONS = 5;

const logScraperTransaction = (url: string, markdownContent: string, cheapestPrice: number | null) => {
    try {
        const newTransaction = { url, markdownContent, cheapestPrice, timestamp: new Date().toISOString() };
        const existing = localStorage.getItem("scraper_transactions");
        let transactions = existing ? JSON.parse(existing) : [];
        transactions.unshift(newTransaction); 
        if (transactions.length > MAX_TRANSACTIONS) {
            transactions = transactions.slice(0, MAX_TRANSACTIONS);
        }
        localStorage.setItem("scraper_transactions", JSON.stringify(transactions));
    } catch (error) {
        console.error("Failed to log scraper transaction to localStorage", error);
    }
}

const logGroqTransaction = (conversationHistory: string) => {
    try {
        const newTransaction = { id: new Date().toISOString(), conversationHistory, timestamp: new Date().toISOString() };
        const existing = localStorage.getItem("groq_transactions");
        let transactions = existing ? JSON.parse(existing) : [];
        transactions.unshift(newTransaction);
        if (transactions.length > MAX_TRANSACTIONS) {
            transactions = transactions.slice(0, MAX_TRANSACTIONS);
        }
        localStorage.setItem("groq_transactions", JSON.stringify(transactions));
    } catch (e) {
        console.error("Failed to log groq transaction", e);
    }
}


const saveLatestSearch = (details: VisualFlightSearchInput) => {
    try {
        localStorage.setItem('latest_flight_search', JSON.stringify(details));
    } catch(e) {
        console.error("Failed to save latest search to localStorage", e);
    }
}

export function AIChat({ initialQuery }: { initialQuery?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const processedInitialQuery = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialQuery && !processedInitialQuery.current) {
      handleSendMessage(initialQuery);
      processedInitialQuery.current = true;
    }
  }, [initialQuery]);

  const handleVisualSearch = async (details: VisualFlightSearchInput) => {
    setLoading(true);
    let result: VisualFlightSearchOutput;
    let analysisError = null;
    saveLatestSearch(details);

    try {
      result = await visualFlightSearch(details);
      logScraperTransaction(result.redirectUrl, result.htmlContent, result.cheapestPrice);
    } catch (error) {
       let errorMessage = 'Sorry, I encountered an error during the live flight search.';
       if (error instanceof Error) {
        errorMessage = `Error during live search: ${error.message}`;
        analysisError = error.message;
       }
       console.error(error);
       toast({
        variant: "destructive",
        title: "Live Search Failed",
        description: errorMessage,
       });
       result = { flights: [], redirectUrl: '#', htmlContent: '', cheapestPrice: null };
    }
    
    // Now pass the results to the new analysis flow
    try {
        const analysisResponse = await analyzeFlightResults({
            availableFlights: result.flights,
        });

        const cheapestFlight = result.cheapestPrice;

        let assistantMessage: Message = {
            role: 'assistant',
            content: analysisResponse.analysis,
            isVisualSearch: true,
            visualSearchResult: {
                redirectUrl: result.redirectUrl,
                htmlContent: result.htmlContent,
                flights: result.flights,
                cheapestPrice: result.cheapestPrice,
            },
            analyzedFlights: analysisResponse.analyzedFlights,
        };
        
        if (analysisError || result.cheapestPrice === null) {
           assistantMessage.error = analysisError ?? "Could not extract flight data from the page.";
           assistantMessage.content = `I've performed the live search, but couldn't extract the flight details. This can happen with complex pages. You can check the prices manually using the button below.`
        } else if (cheapestFlight) {
            assistantMessage.content = `I found flights starting from £${cheapestFlight}. Here's a summary of the best options:\n\n` + analysisResponse.analysis;
        }

        setMessages((prev) => [...prev, assistantMessage]);

    } catch (e) {
        console.error("Error during flight analysis:", e);
        let errorMsg = 'Sorry, I encountered an error. Please try again.';
        if (e instanceof Error) {
            if (e.message.includes('429')) {
                errorMsg = "You've exceeded the daily limit for the AI model. Please check your plan and billing details, then try again later.";
            } else if (e.message.includes('503')) {
                errorMsg = "The AI model is currently overloaded. Please wait a moment and try your request again.";
            } else {
                errorMsg = `An error occurred: ${e.message}`;
            }
        }
        toast({ title: "Analysis Error", description: errorMsg, variant: "destructive" });
        setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg, error: String(e) }]);
    } finally {
        setLoading(false);
    }
  };

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || input;
    if (!content.trim()) return;

    let currentMessages = messages;
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    currentMessages = [...messages, userMessage];
    
    if (!messageContent) {
      setInput('');
    }
    setLoading(true);

    try {
      const conversationHistory = currentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      logGroqTransaction(conversationHistory);
      
      let request: FlightBookingInput = {
        conversationHistory: conversationHistory,
      };
      
      const response = await flightBookingAssistant(request);
      
      if (response.isFlightDetailsComplete && response.flightDetails) {
        // First, reply that we're now looking for flights
        const searchingMessage: Message = { role: 'assistant', content: "Great! I have all the details. Now, I'll perform a live search to find the best current prices for you. This might take a moment..." };
        setMessages((prev) => [...prev, searchingMessage]);
        
        // Then, trigger the visual search
        await handleVisualSearch(response.flightDetails as VisualFlightSearchInput);

      } else {
         const assistantMessage: Message = { role: 'assistant', content: response.reply };
         setMessages((prev) => [...prev, assistantMessage]);
      }

    } catch (error) {
      let errorMessageText = 'Sorry, I encountered an error. Please try again.';
      if (error instanceof Error) {
          if (error.message.includes('429')) {
              errorMessageText = "You've exceeded the daily limit for the AI model. Please check your plan and billing details, then try again later.";
          } else if (error.message.includes('503')) {
              errorMessageText = "The AI model is currently overloaded. Please wait a moment and try your request again.";
          } else {
              errorMessageText = `An error occurred: ${error.message}`;
          }
      }
      
      toast({
        variant: "destructive",
        title: "AI Assistant Error",
        description: errorMessageText,
      });

      const errorMessage: Message = { role: 'assistant', content: errorMessageText, error: String(error) };
      setMessages((prev) => [...prev, errorMessage]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const getCheapestPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return 'N/A';
    return `£${price}`;
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4 border rounded-lg mb-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex flex-col items-start gap-3 ${message.role === 'user' ? 'items-end' : ''}`}>
              <div className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end flex-row-reverse' : ''} w-full`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{message.role === 'user' ? <User size={20} /> : <Bot size={20} />}</AvatarFallback>
                </Avatar>
                <div className={`p-3 rounded-lg max-w-[85%] whitespace-pre-wrap ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {message.content}
                </div>
              </div>

              {message.isVisualSearch && message.visualSearchResult && (
                  <div className="w-full pl-12 mt-2 space-y-4">
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-primary" />
                                <CardTitle className="text-xl">Live Price Check Complete</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {!message.error && message.visualSearchResult.cheapestPrice !== null ? (
                             <p>Cheapest Price Found: <span className="font-bold text-lg">{getCheapestPrice(message.visualSearchResult.cheapestPrice)}</span></p>
                           ) : (
                             <div>
                                <Alert variant="destructive">
                                    <Terminal className="h-4 w-4" />
                                    <AlertTitle>Analysis Failed</AlertTitle>
                                    <AlertDescription>
                                        The AI could not determine the price. You can check the price manually.
                                    </AlertDescription>
                                </Alert>
                             </div>
                           )}
                           
                           <div className="flex items-center gap-2">
                                <Button asChild>
                                    <Link href={message.visualSearchResult.redirectUrl} target="_blank">
                                        Book on Google Flights
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                           </div>
                        </CardContent>
                    </Card>
                    
                    {message.analyzedFlights && message.analyzedFlights.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <h4 className="font-semibold text-lg">Recommended Flights</h4>
                            {message.analyzedFlights.map(flight => (
                                <FlightCard key={flight.id} flight={flight} layout="grid" />
                            ))}
                        </div>
                    )}
                  </div>
              )}
            </div>
          ))}
          {loading && (
             <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot size={20} /></AvatarFallback>
                </Avatar>
                <div className="p-3 rounded-lg bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
          placeholder="e.g., I want to fly from SFO to JFK next week"
          disabled={loading}
        />
        <Button onClick={() => handleSendMessage()} disabled={loading}>
          Send
        </Button>
      </div>
    </div>
  );
}
