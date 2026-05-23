import { useLocation } from "wouter";
import { MessageCircle, Play, Zap, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const socials = [
  {
    name: "Telegram Channel",
    desc: "Join our community",
    url: "https://t.me/jhidios",
    icon: MessageCircle,
    gradient: "from-blue-500 to-cyan-500",
    external: true,
  },
  {
    name: "YouTube",
    desc: "Watch tutorials",
    url: "https://youtube.com/@ios-underground?si=P9-nNU56YLlU-arj",
    icon: Play,
    gradient: "from-red-500 to-pink-500",
    external: true,
  },
  {
    name: "IPA Signer",
    desc: "Sign IPAs with your cert",
    url: "/signer",
    icon: Zap,
    gradient: "from-purple-500 to-indigo-500",
    external: false,
  },
];

const services = [
  { icon: "🔐", name: "IPA Signer", desc: "Sign IPAs with your own p12 — free & private", price: "Free", path: "/signer" },
  { icon: "📱", name: "App Mods", desc: "Premium modified iOS apps", price: "Variable", url: "https://t.me/jhidios" },
  { icon: "💬", name: "Community Help", desc: "Get help from iOS Underground", price: "Free", url: "https://t.me/jhidios" },
];

export default function Home() {
  const [, navigate] = useLocation();

  function go(url: string, external: boolean) {
    if (external) window.open(url, "_blank");
    else navigate(url);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col justify-center items-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-purple-950 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Telegram Mini App
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
            iOS Underground
          </h1>
          <p className="text-lg text-foreground/70 mb-8 leading-relaxed">
            Your gateway to premium iOS modifications, free IPA signing, and exclusive community content.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 font-semibold"
              onClick={() => window.open("https://t.me/jhidios", "_blank")}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Join Telegram
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-purple-500/40 hover:bg-purple-500/10 font-semibold"
              onClick={() => navigate("/signer")}
            >
              <Zap className="mr-2 h-5 w-5" />
              Sign IPA Free
            </Button>
          </div>
        </div>
      </section>

      {/* Connect */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Connect With Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <Card
                  key={s.name}
                  onClick={() => go(s.url, s.external)}
                  className="group relative overflow-hidden bg-card/60 border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r ${s.gradient} transition-opacity duration-300`} />
                  <div className="relative p-6">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${s.gradient} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{s.name}</h3>
                    <p className="text-sm text-foreground/60 mb-4">{s.desc}</p>
                    <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {s.external ? "Visit" : "Open"}
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-card/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {services.map((s) => (
              <Card
                key={s.name}
                onClick={() => s.path ? navigate(s.path) : window.open(s.url!, "_blank")}
                className="bg-card/60 border-border/50 hover:border-primary/40 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10 group"
              >
                <div className="p-6">
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{s.name}</h3>
                  <p className="text-sm text-foreground/60 mb-4">{s.desc}</p>
                  <span className="text-primary font-bold">{s.price}</span>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 font-semibold"
              onClick={() => navigate("/signer")}
            >
              <Zap className="mr-2 h-5 w-5" />
              Try IPA Signer Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border/40">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="font-semibold mb-3">iOS Underground</h4>
            <p className="text-sm text-foreground/50">Premium iOS modifications and free IPA signing for the community.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-1.5 text-sm text-foreground/50">
              <li><a href="https://ios-underground.web.app" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Main Website</a></li>
              <li><button onClick={() => navigate("/signer")} className="hover:text-primary transition-colors">IPA Signer</button></li>
              <li><a href="https://t.me/jhidios" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Telegram</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Community</h4>
            <ul className="space-y-1.5 text-sm text-foreground/50">
              <li><a href="https://youtube.com/@ios-underground" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">YouTube</a></li>
              <li><a href="https://t.me/jhidios" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Telegram Channel</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/30 pt-6 text-center text-sm text-foreground/40">
          © 2026 iOS Underground. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
