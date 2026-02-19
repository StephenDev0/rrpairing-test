import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("rawPlist", rawPlist);
  }, [rawPlist]);

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
      
      await invoke("start_pairing", { plistBytes: Array.from(plistBytes || []) });
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
            <CardTitle className="text-sm font-medium">Pairing Plist</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="flex-grow relative">
              <Label htmlFor="plist-input" className="sr-only">Raw Plist Content</Label>
              <Textarea
                id="plist-input"
                placeholder="Paste your .plist content here..."
                className="h-full resize-none font-mono text-xs bg-muted/30"
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
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setRawPlist("")}
                disabled={!rawPlist}
              >
                <Trash2 className="w-4 h-4" />
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
