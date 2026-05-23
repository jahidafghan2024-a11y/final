import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, CheckCircle2, Download, Eye, EyeOff,
  FileKey, Info, Loader2, Package, Shield, XCircle,
  Zap, Smartphone, Lock, AlertCircle, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "idle" | "signing" | "done" | "error";

interface FileState { file: File | null; name: string; size: string }
const empty: FileState = { file: null, name: "", size: "" };

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DropZone({
  label, accept, icon: Icon, gradient, state, onFile, onClear, hint, required,
}: {
  label: string; accept: string; icon: React.ElementType;
  gradient: string; state: FileState; onFile: (f: File) => void;
  onClear: () => void; hint: string; required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = useCallback((f: File) => onFile(f), [onFile]);

  if (state.file) {
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-4 flex items-center gap-4">
        <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> {label}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{state.name}</p>
          <p className="text-xs text-muted-foreground/60">{state.size}</p>
        </div>
        <button onClick={onClear} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 group
        ${drag ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/50 hover:border-primary/50 hover:bg-card/60"}`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      <div className="flex items-center gap-4 p-4">
        <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${gradient} opacity-70 group-hover:opacity-100 transition-opacity`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <div className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-colors">
          Browse
        </div>
      </div>
    </div>
  );
}

interface SignResult {
  id: string;
  downloadUrl: string;
  installUrl: string;
  fileName: string;
}

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
  const [result, setResult] = useState<SignResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const setFile = (setter: (s: FileState) => void) => (f: File) =>
    setter({ file: f, name: f.name, size: formatSize(f.size) });
  const clearFile = (setter: (s: FileState) => void) => () => setter(empty);

  // Validation
  const missing: string[] = [];
  if (!cert.file) missing.push("Certificate (.p12)");
  if (!prov.file) missing.push("Provisioning Profile");
  if (!ipa.file) missing.push("IPA File");
  const canSign = missing.length === 0;

  const reset = () => {
    setCert(empty); setProv(empty); setIpa(empty);
    setPassword(""); setBundleId(""); setAppName("");
    setStep("idle"); setError(""); setResult(null); setProgress(0);
  };

  const sign = async () => {
    if (!canSign) return;
    setStep("signing"); setProgress(10);
    setProgressLabel("Uploading files…");
    setError("");

    try {
      const form = new FormData();
      form.append("certificate", cert.file!);
      form.append("provision", prov.file!);
      form.append("ipa", ipa.file!);
      if (password) form.append("certPassword", password);
      if (bundleId) form.append("bundleId", bundleId);
      if (appName) form.append("appName", appName);

      // Fake progress
      const tick = setInterval(() => {
        setProgress((p) => {
          if (p < 40) { setProgressLabel("Uploading files…"); return p + 3; }
          if (p < 80) { setProgressLabel("Signing IPA with zsign…"); return p + 1.5; }
          setProgressLabel("Finalising…"); return p + 0.5;
        });
      }, 400);

      const res = await fetch("/api/sign", { method: "POST", body: form });
      clearInterval(tick);
      setProgress(95);
      setProgressLabel("Almost done…");

      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Signing failed" }));
        throw new Error(j.error || "Signing failed");
      }

      const data: SignResult = await res.json();
      setProgress(100);
      setResult(data);
      setStep("done");
    } catch (e: unknown) {
      setStep("error");
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    }
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-card transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">IPA Signer</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Sign & install iOS apps</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* Info */}
        <Card className="bg-blue-500/8 border-blue-500/25 p-4 flex gap-3">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/90 leading-relaxed">
            Files are processed securely and deleted immediately after signing. Signed IPAs are available for 30 minutes for download or install.
          </p>
        </Card>

        {/* ── IDLE / ERROR ───────────────────────────────────── */}
        {(step === "idle" || step === "error") && (
          <div className="space-y-4">

            {/* Step 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Upload Files</p>
              </div>

              <DropZone label="Developer Certificate" accept=".p12,.pfx"
                icon={FileKey} gradient="from-blue-500 to-blue-700"
                state={cert} onFile={setFile(setCert)} onClear={clearFile(setCert)}
                hint="Your .p12 or .pfx file" required />

              {/* Password — only shown when cert uploaded */}
              {cert.file && (
                <div className="pl-2 border-l-2 border-blue-500/30 ml-5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">Certificate Password</Label>
                    <span className="text-xs text-muted-foreground/50">(if your .p12 has one)</span>
                  </div>
                  <div className="relative">
                    <Input type={showPw ? "text" : "password"}
                      placeholder="Leave blank if none"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 bg-card/50 border-border/50 text-sm h-9" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <DropZone label="Provisioning Profile" accept=".mobileprovision"
                icon={Shield} gradient="from-purple-500 to-purple-700"
                state={prov} onFile={setFile(setProv)} onClear={clearFile(setProv)}
                hint="Your .mobileprovision file" required />

              <DropZone label="IPA File" accept=".ipa"
                icon={Package} gradient="from-pink-500 to-rose-600"
                state={ipa} onFile={setFile(setIpa)} onClear={clearFile(setIpa)}
                hint="The .ipa file to sign" required />
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 h-5 rounded-full bg-muted/40 text-muted-foreground text-xs flex items-center justify-center font-bold">2</div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Optional Overrides</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bundle ID Override</Label>
                  <Input placeholder="com.example.app" value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                    className="bg-card/50 border-border/50 text-sm h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">App Name Override</Label>
                  <Input placeholder="MyApp" value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="bg-card/50 border-border/50 text-sm h-9" />
                </div>
              </div>
            </div>

            {/* Missing files warning */}
            {!canSign && (cert.file || prov.file || ipa.file) && (
              <Card className="bg-amber-500/8 border-amber-500/25 p-3 flex gap-3">
                <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">Still needed:</p>
                  <ul className="mt-1 space-y-0.5">
                    {missing.map((m) => (
                      <li key={m} className="text-xs text-amber-300/70">• {m}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* Error */}
            {step === "error" && (
              <Card className="bg-red-500/8 border-red-500/25 p-4 flex gap-3">
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Signing Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{error}</p>
                </div>
              </Card>
            )}

            {/* Sign button */}
            <Button size="lg" onClick={sign} disabled={!canSign}
              className={`w-full font-semibold transition-all duration-200 border-0
                ${canSign
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                  : "bg-muted/30 text-muted-foreground cursor-not-allowed"}`}>
              <Zap className="mr-2 h-5 w-5" />
              {canSign ? "Sign IPA" : `Upload ${missing.length} more file${missing.length > 1 ? "s" : ""} to sign`}
            </Button>
          </div>
        )}

        {/* ── SIGNING ───────────────────────────────────────── */}
        {step === "signing" && (
          <Card className="bg-card/50 border-border/40 p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary/50 border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full border-2 border-purple-500/20 border-t-purple-500/60 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                <Zap className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold">{progressLabel}</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait — do not close this page</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-full bg-border/40 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
            </div>
          </Card>
        )}

        {/* ── DONE ─────────────────────────────────────────── */}
        {step === "done" && result && (
          <div className="space-y-4">
            <Card className="bg-card/50 border-green-500/30 p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/10">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-green-400">IPA Signed!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your app is ready. Links expire in <span className="text-amber-400 font-medium">30 minutes</span>.
                </p>
              </div>
            </Card>

            {/* Install on iPhone — most important */}
            {isIOS ? (
              <a href={result.installUrl} className="block">
                <Button size="lg" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 font-semibold shadow-lg shadow-green-500/25">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Install on This iPhone
                </Button>
              </a>
            ) : (
              <Card className="bg-green-500/8 border-green-500/25 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Install on iPhone</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Open this page on your iPhone in <strong>Safari</strong>, then tap the Install button. The link expires in 30 min.
                    </p>
                  </div>
                </div>
                <a href={result.installUrl} className="block">
                  <Button variant="outline" size="sm" className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Open Install Link (Safari on iPhone only)
                  </Button>
                </a>
              </Card>
            )}

            {/* Download */}
            <a href={result.downloadUrl} download={result.fileName} className="block">
              <Button size="lg" variant="outline"
                className="w-full border-border/50 font-semibold hover:bg-card">
                <Download className="mr-2 h-5 w-5" />
                Download Signed IPA
              </Button>
            </a>

            {/* How to install manually */}
            <Card className="bg-card/30 border-border/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">📋 Install manually (if OTA doesn't work):</p>
              <ol className="text-xs text-muted-foreground/80 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Download the signed IPA to your Mac/PC</li>
                <li>Install <strong>AltStore</strong> or <strong>Sideloadly</strong> on your computer</li>
                <li>Connect iPhone via USB and sideload the IPA</li>
              </ol>
            </Card>

            <Button variant="ghost" onClick={reset} className="w-full text-muted-foreground hover:text-foreground">
              Sign Another IPA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
