import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, CheckCircle2, Download, Eye, EyeOff,
  FileKey, Info, Loader2, Package, Shield, XCircle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "idle" | "uploading" | "signing" | "done" | "error";
interface FileState { file: File | null; name: string }

function DropZone({
  label, accept, icon: Icon, gradient, state, onFile, hint,
}: {
  label: string; accept: string; icon: React.ElementType;
  gradient: string; state: FileState; onFile: (f: File) => void; hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = useCallback((f: File) => onFile(f), [onFile]);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 group
        ${dragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/50 hover:border-primary/50 hover:bg-card/80"}
        ${state.file ? "border-green-500/50 bg-green-500/5" : ""}`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      <div className="flex items-center gap-4 p-4">
        <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          {state.file && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{state.name}</span>
            </div>
          )}
        </div>
        {!state.file && (
          <svg className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )}
      </div>
    </div>
  );
}

const empty: FileState = { file: null, name: "" };
const setF = (set: (s: FileState) => void) => (f: File) => set({ file: f, name: f.name });

export default function Signer() {
  const [, navigate] = useLocation();
  const [cert, setCert] = useState<FileState>(empty);
  const [prov, setProv] = useState<FileState>(empty);
  const [ipa, setIpa] = useState<FileState>(empty);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [bundleId, setBundleId] = useState("");
  const [appName, setAppName] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [progress, setProgress] = useState(0);

  const canSign = !!(cert.file && prov.file && ipa.file);

  const reset = () => {
    setCert(empty); setProv(empty); setIpa(empty);
    setPassword(""); setBundleId(""); setAppName("");
    setStep("idle"); setError(""); setDownloadUrl(""); setProgress(0);
  };

  const sign = async () => {
    if (!canSign) return;
    setStep("uploading"); setProgress(15); setError("");
    try {
      const form = new FormData();
      form.append("certificate", cert.file!);
      form.append("provision", prov.file!);
      form.append("ipa", ipa.file!);
      if (password) form.append("certPassword", password);
      if (bundleId) form.append("bundleId", bundleId);
      if (appName) form.append("appName", appName);

      setStep("signing"); setProgress(45);
      const res = await fetch("/api/sign", { method: "POST", body: form });
      setProgress(90);

      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Signing failed" }));
        throw new Error(j.error || "Signing failed");
      }

      const blob = await res.blob();
      setDownloadUrl(URL.createObjectURL(blob));
      setProgress(100); setStep("done");
    } catch (e: unknown) {
      setStep("error");
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-card transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">IPA Signer</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Sign with your own certificate</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* Info banner */}
        <Card className="bg-blue-500/10 border-blue-500/30 p-4 flex gap-3">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/90 leading-relaxed">
            Files are processed on the server and never stored. Temp files are deleted immediately after signing.
          </p>
        </Card>

        {/* Idle / Error state */}
        {(step === "idle" || step === "error") && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Step 1 — Upload Files</p>

            <DropZone label="Developer Certificate (.p12)" accept=".p12,.pfx"
              icon={FileKey} gradient="from-blue-500 to-blue-700"
              state={cert} onFile={setF(setCert)} hint="Your .p12 or .pfx file" />

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Certificate Password</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="Leave blank if none"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-card/50 border-border/50" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DropZone label="Provisioning Profile (.mobileprovision)" accept=".mobileprovision"
              icon={Shield} gradient="from-purple-500 to-purple-700"
              state={prov} onFile={setF(setProv)} hint="Your .mobileprovision file" />

            <DropZone label="IPA File" accept=".ipa"
              icon={Package} gradient="from-pink-500 to-pink-700"
              state={ipa} onFile={setF(setIpa)} hint="The .ipa file to sign" />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 pt-2">Step 2 — Optional Overrides</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Bundle ID Override</Label>
                <Input placeholder="com.example.app" value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)} className="bg-card/50 border-border/50 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">App Name Override</Label>
                <Input placeholder="MyApp" value={appName}
                  onChange={(e) => setAppName(e.target.value)} className="bg-card/50 border-border/50 text-sm" />
              </div>
            </div>

            {step === "error" && (
              <Card className="bg-red-500/10 border-red-500/30 p-4 flex gap-3">
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Signing Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{error}</p>
                </div>
              </Card>
            )}

            <Button size="lg" onClick={sign} disabled={!canSign}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
              <Zap className="mr-2 h-5 w-5" />
              {canSign ? "Sign IPA" : "Upload all 3 files to continue"}
            </Button>
          </div>
        )}

        {/* Progress */}
        {(step === "uploading" || step === "signing") && (
          <Card className="bg-card/50 border-border/50 p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold">{step === "uploading" ? "Uploading files…" : "Signing IPA…"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "uploading" ? "Sending your files securely" : "Running zsign — this takes a moment"}
              </p>
            </div>
            <div className="w-full bg-border/50 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </Card>
        )}

        {/* Done */}
        {step === "done" && (
          <Card className="bg-card/50 border-green-500/30 p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">IPA Signed!</p>
              <p className="text-sm text-muted-foreground mt-1">Your app was signed successfully.</p>
            </div>
            <div className="space-y-3">
              <a href={downloadUrl} download="signed.ipa" className="block">
                <Button size="lg" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 font-semibold">
                  <Download className="mr-2 h-5 w-5" /> Download Signed IPA
                </Button>
              </a>
              <Button variant="outline" size="lg" onClick={reset} className="w-full border-border/50">
                Sign Another IPA
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
