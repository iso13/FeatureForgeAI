import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_DIR = 'reports/cucumber';
const ARCHIVE_DIR = join(REPORT_DIR, 'archive');
if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true });

const formats = ['json', 'html', 'xml'];
const metadata: Record<string, any> = {
  timestamp: new Date().toISOString(),
  runId: TIMESTAMP,
  tags: process.env.TAGS || '',
  environment: process.env.ENV || 'local',
  nodeVersion: process.version,
};

try {
  metadata.git = {
    branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
    commit: execSync('git rev-parse HEAD').toString().trim(),
    shortCommit: execSync('git rev-parse --short HEAD').toString().trim(),
  };
} catch (err) {
  metadata.git = { error: 'git not available' };
}

// Archive reports and update "latest"
formats.forEach((ext) => {
  const src = join(REPORT_DIR, `cucumber_report.${ext}`);
  const dest = join(ARCHIVE_DIR, `cucumber_report-${TIMESTAMP}.${ext}`);
  const latest = join(REPORT_DIR, `latest.${ext}`);

  try {
    copyFileSync(src, dest);
    copyFileSync(src, latest);
    metadata[ext] = {
      archived: dest,
      latest,
    };
    console.log(`Archived: ${dest}`);
  } catch {
    metadata[ext] = { error: `Missing source file: ${src}` };
  }
});

// Write metadata file
const metaFile = join(ARCHIVE_DIR, `run-metadata-${TIMESTAMP}.json`);
writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
console.log(`Metadata written to: ${metaFile}`);