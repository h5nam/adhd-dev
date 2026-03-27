import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  ADHD_DEV_HOME,
  ADHD_DEV_CONFIG,
  ADHD_DEV_LOG_DIR,
  ADHD_DEV_HOOKS_DIR,
} from './paths.js';

export interface AdhdDevConfig {
  timer: {
    defaultMinutes: number;
    breakMinutes: number;
    preset: 'pomodoro' | 'desktime' | 'ultradian' | 'custom';
  };
  notification: {
    sound: boolean;
    systemNotification: boolean;
    terminalBell: boolean;
  };
  dopamine: {
    signalLevel: 'on' | 'subtle' | 'off';
  };
  data: {
    retentionDays: number;
  };
  daemon: {
    autoStart: boolean;
  };
}

const DEFAULT_CONFIG: AdhdDevConfig = {
  timer: {
    defaultMinutes: 25,
    breakMinutes: 5,
    preset: 'pomodoro',
  },
  notification: {
    sound: true,
    systemNotification: true,
    terminalBell: true,
  },
  dopamine: {
    signalLevel: 'on',
  },
  data: {
    retentionDays: 30,
  },
  daemon: {
    autoStart: false,
  },
};

function ensureDirectories(): void {
  for (const dir of [ADHD_DEV_HOME, ADHD_DEV_LOG_DIR, ADHD_DEV_HOOKS_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function loadConfig(): AdhdDevConfig {
  ensureDirectories();

  if (!existsSync(ADHD_DEV_CONFIG)) {
    writeFileSync(ADHD_DEV_CONFIG, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(ADHD_DEV_CONFIG, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AdhdDevConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AdhdDevConfig): void {
  ensureDirectories();
  const dir = dirname(ADHD_DEV_CONFIG);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(ADHD_DEV_CONFIG, JSON.stringify(config, null, 2));
}
