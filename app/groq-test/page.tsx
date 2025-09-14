
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, History, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const apiCallTemplate = `
curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  }'
`.trim();

interface Transaction {
    id: string;
    conversationHistory: string;
    timestamp: string;
}

export default function GroqTestPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const loadTransactions = () => {
        try {
            const stored = localStorage.getItem("groq_transactions");
            if (stored) {
                const parsed = JSON.parse(stored);
                setTransactions(parsed);
                if (parsed.length > 0 && !selectedTransaction) {
                    setSelectedTransaction(parsed[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load transactions from localStorage", error);
        }
    };

    useEffect(() => {
        loadTransactions();
        
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'groq_transactions') {
                loadTransactions();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };

    }, []);
    
    const clearLog = () => {
        localStorage.removeItem("groq_transactions");
        setTransactions([]);
        setSelectedTransaction(null);
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 pt-24">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bot className="h-6 w-6 text-primary" />
                        <CardTitle>API Inspector</CardTitle>
                    </div>
                    <CardDescription>
                       This page displays a sample cURL command for an API request and the conversation history from the AI Chat.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="h-5 w-5"/>AI Chat Transactions</h2>
                            <Button variant="outline" size="sm" onClick={clearLog}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear Log
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transaction-select" className="flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                Transaction Log ({transactions.length} entries)
                            </Label>
                             <Select onValueChange={(val) => setSelectedTransaction(transactions.find(t => t.id === val) || null)} value={selectedTransaction?.id || ''}>
                                <SelectTrigger id="transaction-select">
                                    <SelectValue placeholder="Select a transaction" />
                                </SelectTrigger>
                                <SelectContent>
                                    {transactions.map((t, i) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {i + 1}: {new Date(t.timestamp).toLocaleString()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="curl-output">cURL Request (for debugging)</Label>
                            <pre id="curl-output" className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all">{apiCallTemplate}</pre>
                        </div>

                        {selectedTransaction && (
                            <div className="space-y-2">
                                <Label htmlFor="payload-output">Conversation History (Payload)</Label>
                                <pre id="payload-output" className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all h-64 overflow-auto">{selectedTransaction.conversationHistory}</pre>
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
