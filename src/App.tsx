import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Trash2, Play } from "lucide-react";
import "./App.css";

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [rawPlist, setRawPlist] = useState(() => {
    return localStorage.getItem("rawPlist") || "";
  });
  const [addr, setAddr] = useState(() => {
    return localStorage.getItem("pairingAddr") || "10.7.0.1:49152";
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("rawPlist", rawPlist);
  }, [rawPlist]);

  useEffect(() => {
    localStorage.setItem("pairingAddr", addr);
  }, [addr]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<string>("log", (event) => {
        setLogs((prev) => [...prev, event.payload]);
      });
    };

    setupListener().catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  async function startPairing() {
    setStatus("Pairing in progress...");
    try {
      let plistBytes = null;
      if (rawPlist.trim()) {
        plistBytes = new TextEncoder().encode(rawPlist);
      }
      
      await invoke("start_pairing", { addr, plistBytes: Array.from(plistBytes || []) });
      setStatus("Pairing successful");
    } catch (err) {
      console.error("Pairing error:", err);
      setStatus(`Error: ${err}`);
    }
  }

  function clearLogs() {
    setLogs([]);
    setStatus("");
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] gap-4 overflow-hidden">
      <header className="flex items-center gap-2">
        <Terminal className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">rrpairing test</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="space-y-2">
              <Label htmlFor="addr-input" className="text-xs">Device IP Address</Label>
              <Input
                id="addr-input"
                placeholder="10.7.0.1:49152"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            
            <div className="flex-grow flex flex-col gap-2 min-h-0">
              <Label htmlFor="plist-input" className="text-xs">Pairing Plist Content</Label>
              <Textarea
                id="plist-input"
                placeholder="Paste your .plist content here..."
                className="flex-grow resize-none font-mono text-xs"
                value={rawPlist}
                onChange={(e) => setRawPlist(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={startPairing} 
                className="flex-grow"
                disabled={status === "Pairing in progress..."}
              >
                {status === "Pairing in progress..." ? (
                  "Pairing..."
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Pairing
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden bg-black border-zinc-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-400">Terminal Output</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-zinc-500"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear
            </Button>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0 border-t border-zinc-800">
            <ScrollArea className="h-full w-full p-4 terminal-scroll">
              <div ref={scrollRef}>
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <span className="text-primary/50 shrink-0 select-none">{">"}</span>
                    <span className="text-zinc-300 text-xs leading-relaxed break-all">{log}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 mt-20 italic text-sm">
                    Waiting for output...
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default App;

