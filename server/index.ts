import express from "express";
import { createServer } from "http";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// In-memory store for signed IPAs (cleaned up after 30 min)
const signedFiles = new Map<string, { ipaPath: string; name: string; expires: number }>();

// Cleanup expired files every 5 minutes
setInterval(async () => {
  const now = Date.now();
  for (const [id, entry] of signedFiles.entries()) {
    if (entry.expires < now) {
      await fs.unlink(entry.ipaPath).catch(() => {});
      signedFiles.delete(id);
    }
  }
}, 5 * 60 * 1000);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}`),
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });
const app = express();
const server = createServer(app);
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  let zsign = false;
  try { await execAsync("which zsign"); zsign = true; } catch { zsign = false; }
  res.json({ ok: true, zsign });
});

// ── Sign IPA ──────────────────────────────────────────────────────────────────
app.post(
  "/api/sign",
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "provision", maxCount: 1 },
    { name: "ipa", maxCount: 1 },
  ]),
  async (req, res) => {
    const tmpFiles: string[] = [];
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      if (!files?.certificate?.[0] || !files?.provision?.[0] || !files?.ipa?.[0]) {
        res.status(400).json({ error: "Missing files. Need: certificate, provision, ipa" });
        return;
      }

      const certPath = files.certificate[0].path;
      const provPath = files.provision[0].path;
      const ipaPath = files.ipa[0].path;
      tmpFiles.push(certPath, provPath, ipaPath);

      const { certPassword = "", bundleId = "", appName = "" } = req.body as Record<string, string>;

      // Save signed IPA to a persistent temp location (not deleted immediately)
      const id = crypto.randomUUID();
      const signedDir = path.join(os.tmpdir(), "signed-ipas");
      await fs.mkdir(signedDir, { recursive: true });
      const outputPath = path.join(signedDir, `${id}.ipa`);

      let cmd = `zsign -k "${certPath}" -m "${provPath}" -o "${outputPath}"`;
      if (certPassword) cmd += ` -p "${certPassword.replace(/"/g, '\\"')}"`;
      if (bundleId) cmd += ` -b "${bundleId}"`;
      if (appName) cmd += ` -n "${appName}"`;
      cmd += ` "${ipaPath}"`;

      try {
        await execAsync(cmd, { timeout: 5 * 60 * 1000 });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await cleanup(tmpFiles);
        if (msg.includes("command not found")) {
          res.status(500).json({ error: "zsign not installed on server." });
        } else if (msg.includes("password") || msg.includes("passphrase")) {
          res.status(400).json({ error: "Wrong certificate password." });
        } else if (msg.includes("provision")) {
          res.status(400).json({ error: "Provisioning profile error. Check it matches your certificate." });
        } else {
          res.status(500).json({ error: `Signing failed: ${msg}` });
        }
        return;
      }

      await cleanup(tmpFiles);

      const originalName = files.ipa[0].originalname.replace(/\.ipa$/i, "");
      const appDisplayName = appName || originalName;

      // Store for 30 minutes
      signedFiles.set(id, {
        ipaPath: outputPath,
        name: originalName,
        expires: Date.now() + 30 * 60 * 1000,
      });

      // Return download + install URLs
      const host = `${req.protocol}://${req.get("host")}`;
      res.json({
        id,
        downloadUrl: `/api/download/${id}`,
        installUrl: `itms-services://?action=download-manifest&url=${encodeURIComponent(`${host}/api/manifest/${id}?name=${encodeURIComponent(appDisplayName)}&bundle=${encodeURIComponent(bundleId || "com.unsigned.app")}`)}`,
        fileName: `${originalName}-signed.ipa`,
      });
    } catch (e: unknown) {
      await cleanup(tmpFiles);
      if (!res.headersSent) res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  }
);

// ── Download signed IPA ───────────────────────────────────────────────────────
app.get("/api/download/:id", async (req, res) => {
  const entry = signedFiles.get(req.params.id);
  if (!entry) { res.status(404).json({ error: "File not found or expired (30 min limit)" }); return; }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${entry.name}-signed.ipa"`);
  res.sendFile(entry.ipaPath);
});

// ── OTA Install manifest ──────────────────────────────────────────────────────
app.get("/api/manifest/:id", async (req, res) => {
  const entry = signedFiles.get(req.params.id);
  if (!entry) { res.status(404).send("Manifest not found or expired"); return; }

  const host = `${req.protocol}://${req.get("host")}`;
  const ipaUrl = `${host}/api/download/${req.params.id}`;
  const appName = (req.query.name as string) || entry.name;
  const bundleId = (req.query.bundle as string) || "com.unsigned.app";

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${ipaUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${bundleId}</string>
        <key>bundle-version</key>
        <string>1.0</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${appName}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

  res.setHeader("Content-Type", "application/xml");
  res.send(manifest);
});

// ── Static ────────────────────────────────────────────────────────────────────
const staticPath = path.resolve(__dirname, "public");
app.use(express.static(staticPath));
app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

async function cleanup(files: string[]) {
  await Promise.allSettled(files.map((f) => fs.unlink(f).catch(() => {})));
}
