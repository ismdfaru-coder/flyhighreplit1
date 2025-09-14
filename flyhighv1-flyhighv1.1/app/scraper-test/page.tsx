
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube2, History, Bot, Search, Trash2, Loader2, ScrollText, BadgeDollarSign, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Transaction {
    url: string;
    timestamp: string;
    markdownContent?: string;
    cheapestPrice?: number | null;
}

export default function ScraperTestPage() {
    const [aiTransactions, setAiTransactions] = useState<Transaction[]>([]);
    const [classicTransactions, setClassicTransactions] = useState<Transaction[]>([]);
    
    const [selectedAiTransaction, setSelectedAiTransaction] = useState<Transaction | null>(null);
    const [selectedClassicTransaction, setSelectedClassicTransaction] = useState<Transaction | null>(null);
    
    const [loading, setLoading] = useState(false);
    
    const activeTransaction = selectedAiTransaction || selectedClassicTransaction;

    const curlCommand = useMemo(() => {
        if (!activeTransaction?.url) return "Select a transaction to see the cURL command.";

        const url = activeTransaction.url;
        // NOTE: The API key is intentionally a placeholder for display.
        // The actual key is used on the server from environment variables.
        const apiKeyPlaceholder = "YOUR_SCRAPERAPI_KEY"; 
        const proxyString = `scraperapi.output_format=markdown.screenshot=true:${apiKeyPlaceholder}@proxy-server.scraperapi.com:8001`;

        return `curl -x "${proxyString}" -k "${url}"`;
    }, [activeTransaction]);

    const loadTransactions = () => {
        try {
            const storedAi = localStorage.getItem("scraper_transactions");
            if (storedAi) setAiTransactions(JSON.parse(storedAi));

            const storedClassic = localStorage.getItem("classic_scraper_transactions");
            if (storedClassic) setClassicTransactions(JSON.parse(storedClassic));
        } catch (error)
 {
            console.error("Failed to load transactions from localStorage", error);
        }
    };
    
    useEffect(() => {
        loadTransactions();
    }, []);
    
    const clearLog = (logKey: "scraper_transactions" | "classic_scraper_transactions") => {
        localStorage.removeItem(logKey);
        if (logKey === "scraper_transactions") {
            setAiTransactions([]);
            setSelectedAiTransaction(null);
        } else {
            setClassicTransactions([]);
            setSelectedClassicTransaction(null);
        }
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 pt-24">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TestTube2 className="h-6 w-6 text-primary" />
                        <CardTitle>ScraperAPI Inspector</CardTitle>
                    </div>
                    <CardDescription>
                       This page displays the raw markdown output from the ScraperAPI for transactions from the AI Chat and Classic Search pages. It also shows the extracted cheapest price.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* AI Chat Transactions */}
                        <div className="space-y-4 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="h-5 w-5"/>AI Chat Transactions</h2>
                                <Button variant="outline" size="sm" onClick={() => clearLog("scraper_transactions")}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-transaction-select" className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                    Transaction Log ({aiTransactions.length} entries)
                                </Label>
                                <Select onValueChange={(val) => {setSelectedAiTransaction(aiTransactions.find(t => t.url === val) || null); setSelectedClassicTransaction(null);}} value={selectedAiTransaction?.url || ''}>
                                    <SelectTrigger id="ai-transaction-select"><SelectValue placeholder="Select a transaction from AI Chat" /></SelectTrigger>
                                    <SelectContent>
                                        {aiTransactions.map((t, i) => (
                                            <SelectItem key={i} value={t.url}>{i + 1}: {new Date(t.timestamp).toLocaleString()} - {t.url.substring(0, 80)}...</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* Classic Search Transactions */}
                        <div className="space-y-4 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold flex items-center gap-2"><Search className="h-5 w-5"/>Classic Search Transactions</h2>
                                <Button variant="outline" size="sm" onClick={() => clearLog("classic_scraper_transactions")}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classic-transaction-select" className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                    Transaction Log ({classicTransactions.length} entries)
                                </Label>
                                <Select onValueChange={(val) => {setSelectedClassicTransaction(classicTransactions.find(t => t.url === val) || null); setSelectedAiTransaction(null);}} value={selectedClassicTransaction?.url || ''}>
                                    <SelectTrigger id="classic-transaction-select"><SelectValue placeholder="Select a transaction from Classic Search" /></SelectTrigger>
                                    <SelectContent>
                                        {classicTransactions.map((t, i) => (
                                            <SelectItem key={i} value={t.url}>{i + 1}: {new Date(t.timestamp).toLocaleString()} - {t.url.substring(0, 80)}...</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    
                    {activeTransaction ? (
                        <div className="space-y-6">
                            <Separator />
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="url-output">Input URL (Sent to ScraperAPI)</Label>
                                     <Button asChild variant="outline" size="sm">
                                        <a href={activeTransaction.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Open in new tab</a>
                                    </Button>
                                </div>
                                <Input id="url-output" readOnly value={activeTransaction.url} />
                            </div>

                             <div className="space-y-2">
                                <Label htmlFor="curl-output">cURL Request (for debugging)</Label>
                                <pre id="curl-output" className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all">{curlCommand}</pre>
                            </div>
                             
                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><ScrollText className="h-5 w-5"/>ScraperAPI Response (Markdown)</h3>
                                {loading ? (
                                    <div className="flex items-center justify-center h-48 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /><p className="ml-2">Loading response...</p></div>
                                ) : (
                                    <Textarea id="api-response-output" readOnly value={activeTransaction.markdownContent || "No content available for this transaction."} placeholder="API response will be displayed here." className="h-96 font-mono" />
                                )}
                            </div>
                            
                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><BadgeDollarSign className="h-5 w-5"/>Extracted Cheapest Price</h3>
                                <div className="p-4 border rounded-md min-h-[100px] flex items-center justify-center bg-muted/50">
                                    {activeTransaction.cheapestPrice !== null && activeTransaction.cheapestPrice !== undefined ? (
                                        <p className="text-3xl font-bold">£{activeTransaction.cheapestPrice}</p>
                                    ) : (
                                        <p className="text-muted-foreground">Could not extract price from this transaction.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Please select a transaction from either log to inspect its details.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
