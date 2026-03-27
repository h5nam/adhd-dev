# adhd-dev

ADHD 성향의 개발자를 위한 터미널 네이티브 집중 도구. 멀티 Claude Code 세션 환경에서 컨텍스트를 추적하고, 가재 키우기 게이미피케이션으로 작업 동기를 부여합니다.

## Features

### Crayfish Evolution System
토큰 사용량에 따라 가재가 진화합니다. 쉬면 경험치가 줄어 레벨이 하락합니다.

| Lv | Name | Tokens | Color |
|----|------|--------|-------|
| 1 | Baby | 0+ | Gray |
| 2 | Juvenile | 1K+ | Cyan |
| 3 | Adult | 10K+ | Green |
| 4 | Warrior | 50K+ | Yellow |
| 5 | King | 200K+ | Red |

- 4-frame pixel animation per state (idle, working, complete, sleeping)
- Halfblock rendering with 24-bit truecolor ANSI
- Token decay: idle 2%/h, sleeping 5%/h (keeps you working!)

### TUI Dashboard
```bash
adhd-dev dash
```
- Real-time multi-agent grid view with animated crayfish
- Natural language activity descriptions (not raw tool names)
- Dynamic card sizing, CJK character width support
- Token delta tracking (green +, red -)
- Level-up flash animation

### Focus Timer
```bash
adhd-dev timer start 25        # 25-minute focus session
adhd-dev timer preset pomodoro  # Pomodoro (25/5)
adhd-dev timer preset desktime  # Desktime (52/17)
adhd-dev timer preset ultradian # Ultradian (90/20)
```

### Session Context
```bash
adhd-dev status   # Active/idle session overview
adhd-dev where    # "Where was I?" - last exchange per session
adhd-dev today    # Today's focus stats
adhd-dev go <name> # Jump to session directory
```

### Dopamine Architecture
5 psychologically-grounded mechanisms adapted for CLI:
1. **Momentum Pulse** - Fibonacci-spaced micro-rewards
2. **Completion Ripple** - Timer completion celebration
3. **Context Warmth** - Visual session temperature (warm/cool)
4. **Rhythm Anchor** - Time-of-day awareness (AM/PM/EVE)
5. **Return Bridge** - One-command session return

All signals are non-judgmental by design. No streaks, no loss framing, no guilt.

## Install

```bash
npm install -g adhd-dev
```

### Quick Setup
```bash
adhd-dev init --full  # Hooks + daemon + shell prompt
```

### Manual Setup
```bash
adhd-dev install-hooks   # Claude Code hooks
adhd-dev daemon start    # Background daemon
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `adhd-dev status` | Session overview |
| `adhd-dev where` | Last context per session |
| `adhd-dev dash` | TUI dashboard |
| `adhd-dev timer start [min]` | Start focus timer |
| `adhd-dev timer stop` | Stop timer |
| `adhd-dev timer status` | Timer remaining |
| `adhd-dev timer preset <name>` | Timer preset |
| `adhd-dev today` | Daily stats |
| `adhd-dev flow <on\|off>` | Flow protection mode |
| `adhd-dev go <session>` | Navigate to session |
| `adhd-dev doctor` | Health check |
| `adhd-dev config` | View/edit config |
| `adhd-dev daemon <start\|stop>` | Daemon control |
| `adhd-dev install-hooks` | Install Claude hooks |
| `adhd-dev uninstall-hooks` | Remove hooks |
| `adhd-dev reset` | Delete all data |

## Architecture

```
CLI (commander.js) ──┐
TUI (raw ANSI)    ───┤
Shell Prompt      ───┤── IPC (Unix Socket) ── Daemon
Claude Code Hooks ───┘                        ├── Agent Tracker (token count, decay, leveling)
                                              ├── Timer Engine (presets, flow protection)
                                              ├── Dopamine Service
                                              │   ├── Adaptive Engine (7-day baseline)
                                              │   └── Signal Emitter (fibonacci badges)
                                              └── File Watcher (chokidar)
```

## Tech Stack

- **TypeScript** (ES2022, ESM) + **Node.js** >=20
- **chalk** for terminal colors
- **commander** for CLI parsing
- **chokidar** for file watching
- **node-notifier** for system notifications
- **tsup** for bundling (CLI + daemon entry points)
- **vitest** for testing

## Data Storage

All data is local. No network. No telemetry.

```
~/.adhd-dev/
  config.json          # User preferences
  timer-state.json     # Timer state
  prompt-state.json    # Shell prompt signals
  baseline.json        # Adaptive engine baseline
  stats/YYYY-MM-DD.json # Daily statistics
  logs/                # Application logs
```

## Shell Integration

### Zsh
```bash
export RPROMPT='$(adhd-dev prompt-status 2>/dev/null)'
```

### Bash
```bash
export PS1='$(adhd-dev prompt-status 2>/dev/null)\$ '
```

### Tmux
```tmux
set -g status-right '#(adhd-dev tmux-status 2>/dev/null) | %H:%M'
```

## Development

```bash
npm install
npm run build      # Build CLI + daemon
npm run dev        # Dev mode (tsx)
npm run test       # Run tests
npm run typecheck  # TypeScript strict check
```

## License

MIT
