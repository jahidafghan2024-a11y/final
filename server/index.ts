import express from "express";
import { createServer } from "http";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, _file, cb) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, id);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const app = express();
const server = createServer(app);

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  let zsign = false;
  try {
    await execAsync("which zsign");
    zsign = true;
  } catch {
    zsign = false;
  }
  res.json({ ok: true, zsign });
});

// ── IPA Signing ───────────────────────────────────────────────────────────────
app.post(
  "/api/sign",
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "provision", maxCount: 1 },
    { name: "ipa", maxCount: 1 },
  ]),
  async (req, res) => {
    const tmpFiles: string[] = [];
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sign-"));

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
      const outputPath = path.join(tmpDir, "signed.ipa");

      let cmd = `zsign -k "${certPath}" -m "${provPath}" -o "${outputPath}"`;
      if (certPassword) cmd += ` -p "${certPassword.replace(/"/g, '\\"')}"`;
      if (bundleId) cmd += ` -b "${bundleId}"`;
      if (appName) cmd += ` -n "${appName}"`;
      cmd += ` "${ipaPath}"`;

      try {
        await execAsync(cmd, { timeout: 5 * 60 * 1000 });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("command not found") || msg.includes("not found")) {
          res.status(500).json({ error: "zsign not installed on server. See README." });
        } else if (msg.includes("password") || msg.includes("passphrase")) {
          res.status(400).json({ error: "Wrong certificate password." });
        } else if (msg.includes("provision")) {
          res.status(400).json({ error: "Provisioning profile error. Check it matches your certificate." });
        } else {
          res.status(500).json({ error: `Signing failed: ${msg}` });
        }
        return;
      }

      const originalName = files.ipa[0].originalname.replace(/\.ipa$/i, "");
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${originalName}-signed.ipa"`);

      res.sendFile(outputPath, async (err) => {
        if (err && !res.headersSent) res.status(500).json({ error: "Failed to send file" });
        await cleanup(tmpFiles, tmpDir);
      });
    } catch (e: unknown) {
      await cleanup(tmpFiles, tmpDir);
      if (!res.headersSent) {
        res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
  }
);

async function cleanup(files: string[], dir: string) {
  await Promise.allSettled(files.map((f) => fs.unlink(f).catch(() => {})));
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

// ── Static files ──────────────────────────────────────────────────────────────
const staticPath = path.resolve(__dirname, "public");
app.use(express.static(staticPath));
app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
