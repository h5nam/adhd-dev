import { Command } from 'commander';
import chalk from 'chalk';
import { fork } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { ADHD_DEV_PID_FILE, ADHD_DEV_SOCKET } from '../../core/paths.js';
import { logger } from '../../core/logger.js';
import { generatePlist } from '../../daemon/launchd.js';

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(): number | null {
  if (!existsSync(ADHD_DEV_PID_FILE)) return null;
  try {
    const raw = readFileSync(ADHD_DEV_PID_FILE, 'utf-8').trim();
    const pid = parseInt(raw, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function cleanupStaleFiles(): void {
  const pid = readPid();
  if (pid !== null && !isPidAlive(pid)) {
    try {
      if (existsSync(ADHD_DEV_PID_FILE)) unlinkSync(ADHD_DEV_PID_FILE);
    } catch { /* ignore */ }
    try {
      if (existsSync(ADHD_DEV_SOCKET)) unlinkSync(ADHD_DEV_SOCKET);
    } catch { /* ignore */ }
  }
}

export const daemonCommand = new Command('daemon')
  .description('Manage background daemon');

daemonCommand
  .command('start')
  .description('Start the daemon')
  .action(async () => {
    cleanupStaleFiles();

    const pid = readPid();
    if (pid !== null && isPidAlive(pid)) {
      console.log(chalk.yellow(`Daemon is already running (PID ${pid})`));
      return;
    }

    // Resolve daemon entry point (sibling dist/daemon/index.js)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const daemonPath = join(__dirname, '..', 'daemon', 'index.js');

    const child = fork(daemonPath, [], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    // Give it a moment to write the PID file
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    const newPid = readPid();
    if (newPid !== null && isPidAlive(newPid)) {
      console.log(chalk.green(`Daemon started (PID ${newPid})`));
      logger.info('daemon-command: started daemon', { pid: newPid });
    } else {
      console.log(chalk.red('Daemon failed to start. Check logs for details.'));
      logger.error('daemon-command: daemon did not write PID file after start');
    }
  });

daemonCommand
  .command('stop')
  .description('Stop the daemon')
  .action(async () => {
    cleanupStaleFiles();

    const pid = readPid();
    if (pid === null || !isPidAlive(pid)) {
      console.log(chalk.dim('Daemon is not running'));
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      console.log(chalk.red(`Failed to send SIGTERM to PID ${pid}`));
      return;
    }

    // Wait up to 5 seconds for process to exit
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
      if (!isPidAlive(pid)) break;
    }

    if (isPidAlive(pid)) {
      console.log(chalk.red(`Daemon (PID ${pid}) did not exit within 5 seconds`));
    } else {
      console.log(chalk.green(`Daemon stopped (PID ${pid})`));
      logger.info('daemon-command: stopped daemon', { pid });
    }

    // Clean up any leftover files
    try {
      if (existsSync(ADHD_DEV_PID_FILE)) unlinkSync(ADHD_DEV_PID_FILE);
    } catch { /* ignore */ }
    try {
      if (existsSync(ADHD_DEV_SOCKET)) unlinkSync(ADHD_DEV_SOCKET);
    } catch { /* ignore */ }
  });

daemonCommand
  .command('status')
  .description('Show daemon status')
  .action(async () => {
    cleanupStaleFiles();

    const pid = readPid();
    if (pid === null) {
      console.log(chalk.dim('Daemon is not running'));
      return;
    }

    if (!isPidAlive(pid)) {
      console.log(chalk.dim('Daemon is not running (stale PID file)'));
      return;
    }

    // Try to get uptime via IPC if socket exists
    if (existsSync(ADHD_DEV_SOCKET)) {
      try {
        const { createConnection } = await import('node:net');
        const status = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const client = createConnection(ADHD_DEV_SOCKET, () => {
            client.write(JSON.stringify({ type: 'status' }) + '\n');
          });
          let buf = '';
          client.on('data', (chunk) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                resolve(JSON.parse(line) as Record<string, unknown>);
                client.destroy();
              } catch { /* ignore */ }
            }
          });
          client.on('error', reject);
          setTimeout(() => reject(new Error('timeout')), 2000);
        });

        const data = status['data'] as Record<string, unknown> | undefined;
        if (data) {
          const uptimeSec = Math.floor((data['uptimeMs'] as number) / 1000);
          const uptimeMin = Math.floor(uptimeSec / 60);
          const uptimeStr = uptimeMin > 0 ? `${uptimeMin}m ${uptimeSec % 60}s` : `${uptimeSec}s`;
          console.log(chalk.green(`Daemon running`) + chalk.dim(` (PID ${pid}, uptime ${uptimeStr})`));
          console.log(chalk.dim(`  Sessions: ${data['sessionCount']} total, ${data['activeSessions']} active`));
          return;
        }
      } catch {
        // fall through to basic status
      }
    }

    console.log(chalk.green(`Daemon running`) + chalk.dim(` (PID ${pid})`));
  });

daemonCommand
  .command('install')
  .description('Generate macOS launchd plist for auto-start')
  .action(() => {
    const plist = generatePlist();
    console.log(chalk.dim('# Save this to ~/Library/LaunchAgents/com.adhd-dev.daemon.plist'));
    console.log(chalk.dim('# Then run: launchctl load ~/Library/LaunchAgents/com.adhd-dev.daemon.plist'));
    console.log();
    console.log(plist);
  });
