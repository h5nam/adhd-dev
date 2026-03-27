import { join } from 'node:path';
import { homedir } from 'node:os';

export function generatePlist(): string {
  const nodePath = process.execPath;
  const daemonPath = join(homedir(), '.adhd-dev', 'daemon.js');
  const logDir = join(homedir(), '.adhd-dev', 'logs');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.adhd-dev.daemon</string>

    <key>ProgramArguments</key>
    <array>
      <string>${nodePath}</string>
      <string>${daemonPath}</string>
    </array>

    <key>KeepAlive</key>
    <true/>

    <key>RunAtLoad</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${logDir}/daemon-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>${logDir}/daemon-stderr.log</string>

    <key>WorkingDirectory</key>
    <string>${homedir()}</string>
  </dict>
</plist>
`;
}
