
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube2, History, Bot, Search, Trash2, Image as ImageIcon, Loader2, FileText, ScanText, AlertCircle, Download, ExternalLink, Server } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { testThordataPng } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface Transaction {
    url: string;
    timestamp: string;
    htmlContent?: string;
}

const flightKeywords = ['price', 'stop', 'stops', 'duration', 'airline', 'flight', 'depart', 'arrive', 'am', 'pm'];

function containsFlightDetails(text: string): boolean {
    if (!text) return false;
    const lowercasedText = text.toLowerCase();
    const foundKeywords = flightKeywords.filter(keyword => lowercasedText.includes(keyword));
    return foundKeywords.length >= 2;
}

export default function ThordataTestPage() {
    const [aiTransactions, setAiTransactions] = useState<Transaction[]>([]);
    const [classicTransactions, setClassicTransactions] = useState<Transaction[]>([]);
    
    const [selectedAiTransaction, setSelectedAiTransaction] = useState<Transaction | null>(null);
    const [selectedClassicTransaction, setSelectedClassicTransaction] = useState<Transaction | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [pngResult, setPngResult] = useState<{imageUrl?: string, error?: string} | null>(null);
    const [apiResponse, setApiResponse] = useState<string>("");
    
    const [loadingOcr, setLoadingOcr] = useState(false);
    const [ocrResult, setOcrResult] = useState<string>("");
    const [ocrError, setOcrError] = useState<string | null>(null);

    const activeTransaction = selectedAiTransaction || selectedClassicTransaction;

    const dynamicPythonScript = useMemo(() => {
        const url = activeTransaction?.url;
        const urlString = url ? `"${url}"` : '"SELECT_A_TRANSACTION_TO_SEE_URL"';

        return `import requests
import os

# Best practice: load API key from environment variables
# You can set this in your shell: export THORDATA_API_KEY="your_key_here"
api_key = os.getenv("THORDATA_API_KEY", "YOUR_THORDATA_API_KEY")

url = "https://universalapi.thordata.com/request"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/x-www-form-urlencoded",
}

data = {
    "url": ${urlString},
    "type": "png",
    "js_render": "True",
    "header": "False",
}

response = requests.post(url, headers=headers, data=data)

# Check if response is actually an image
content_type = response.headers.get("Content-Type", "")

if "image" in content_type.lower():
    with open("thordata.png", "wb") as f:
        f.write(response.content)
    print("✅ Image saved as thordata.png")
else:
    print("⚠️ Got non-image response:")
    print(response.text)`;
    }, [activeTransaction]);

    const loadTransactions = () => {
        try {
            const storedAi = localStorage.getItem("thordata_transactions");
            if (storedAi) setAiTransactions(JSON.parse(storedAi));

            const storedClassic = localStorage.getItem("classic_thordata_transactions");
            if (storedClassic) setClassicTransactions(JSON.parse(storedClassic));
        } catch (error) {
            console.error("Failed to load transactions from localStorage", error);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);
    
    const clearLog = (logKey: "thordata_transactions" | "classic_thordata_transactions") => {
        localStorage.removeItem(logKey);
        if (logKey === "thordata_transactions") {
            setAiTransactions([]);
            setSelectedAiTransaction(null);
        } else {
            setClassicTransactions([]);
            setSelectedClassicTransaction(null);
        }
        setPngResult(null);
        setApiResponse("");
        setOcrResult("");
        setOcrError(null);
    }
    
    const handleOcrExtraction = useCallback(async (imageUrl: string) => {
        setLoadingOcr(true);
        setOcrResult("");
        setOcrError(null);
        try {
            const Tesseract = await import('tesseract.js').then(mod => mod.default);
            const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');

            if (text && containsFlightDetails(text)) {
                 setOcrResult(text);
            } else if (text) {
                setOcrError(`Image received, but it does not appear to contain valid flight details. OCR found: "${text.substring(0, 150)}..."`);
            } else {
                setOcrError("OCR process ran, but no recognizable text was detected in the image.");
            }
        } catch (error) {
            console.error("OCR extraction failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setOcrError(`Failed to extract text. (Details: ${errorMessage})`);
        } finally {
            setLoadingOcr(false);
        }
    }, []);

    const handleGeneratePng = useCallback(async (url: string | undefined) => {
        if (!url) {
            setLoading(false);
            setPngResult(null);
            setApiResponse("");
            setOcrResult("");
            setOcrError(null);
            return;
        };
        setLoading(true);
        setPngResult(null);
        setApiResponse("");
        setOcrResult("");
        setOcrError(null);
        
        const result = await testThordataPng(url);
        
        if (result.imageUrl) {
            setApiResponse(result.imageUrl);
        } else if (result.error) {
            setApiResponse(result.error);
        }

        setPngResult(result);
        setLoading(false);

        if (result?.imageUrl && result.imageUrl.startsWith("data:image/png;base64,")) {
            handleOcrExtraction(result.imageUrl);
        }
    }, [handleOcrExtraction]);
    
    useEffect(() => {
        if (activeTransaction?.url) {
            handleGeneratePng(activeTransaction.url);
        }
    }, [activeTransaction, handleGeneratePng]);

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 pt-24">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TestTube2 className="h-6 w-6 text-primary" />
                        <CardTitle>Thordata API Inspector</CardTitle>
                    </div>
                    <CardDescription>
                       This page displays the raw HTML output and PNG render from the Thordata API for transactions initiated by the AI Chat and Classic Search pages. It also extracts text from the PNG using OCR.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="h-5 w-5"/>AI Chat Transactions</h2>
                                <Button variant="outline" size="sm" onClick={() => clearLog("thordata_transactions")}>
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
                        
                        <div className="space-y-4 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold flex items-center gap-2"><Search className="h-5 w-5"/>Classic Search Transactions</h2>
                                <Button variant="outline" size="sm" onClick={() => clearLog("classic_thordata_transactions")}>
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
                    
                    {activeTransaction && (
                        <div className="space-y-6">
                            <Separator />
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="url-output">Input URL (Sent to Thordata API)</Label>
                                     <Button asChild variant="outline" size="sm">
                                        <a href={activeTransaction.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Open in new tab</a>
                                    </Button>
                                </div>
                                <Input id="url-output" readOnly value={activeTransaction.url} />
                            </div>

                             <div className="space-y-2">
                                <Label htmlFor="python-output">Python Request (for debugging)</Label>
                                <pre id="python-output" className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all">{dynamicPythonScript}</pre>
                            </div>
                             
                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="api-response-output">Thordata API Response</Label>
                                <Textarea id="api-response-output" readOnly value={loading ? "Loading API response..." : apiResponse} className="h-32" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2"><ImageIcon className="h-5 w-5"/>Rendered Image</h3>
                                    {pngResult?.imageUrl && pngResult.imageUrl.startsWith("data:image/png;base64,") && (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={pngResult.imageUrl} download="thordata.png"><Download className="h-4 w-4 mr-2" />Download PNG</a>
                                        </Button>
                                    )}
                                </div>
                                <div className="p-4 border rounded-md min-h-[200px] flex items-center justify-center bg-muted/50">
                                    {loading ? (
                                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" /><p>Requesting PNG from Thordata API...</p></div>
                                    ) : pngResult?.imageUrl && pngResult.imageUrl.startsWith("data:image/png;base64,") ? (
                                        <Image src={pngResult.imageUrl} alt="Rendered output from Thordata API" width={800} height={600} className="object-contain" />
                                    ) : pngResult?.error ? (
                                         <Alert variant="destructive" className="max-w-xl"><AlertCircle className="h-4 w-4" /><AlertTitle>API Error</AlertTitle><AlertDescription>{pngResult.error}</AlertDescription></Alert>
                                    ) : (
                                         <p className="text-muted-foreground">Select a transaction to see the PNG render.</p>
                                    )}
                                </div>
                            </div>

                            <Separator />
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><ScanText className="h-5 w-5"/>Extracted Text (OCR)</h3>
                                {loadingOcr ? (
                                    <div className="flex items-center justify-center h-48 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /><p className="ml-2">PNG received. Extracting text...</p></div>
                                ) : (ocrError || ocrResult) ? (
                                     <>
                                        {ocrError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>OCR Error</AlertTitle><AlertDescription>{ocrError}</AlertDescription></Alert>)}
                                        <Textarea readOnly value={ocrResult} placeholder={"No text extracted."} className="h-96" />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-48 border rounded-md text-muted-foreground">
                                        <p>Waiting for valid image to begin text extraction...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

    
