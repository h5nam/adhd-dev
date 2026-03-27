# Open Questions

## adhd-dev-cli-tool (Plan B v2) - 2026-03-24

- [ ] npm 패키지 이름 결정 (`adhd-dev`, `adhd-focus`, `focusdev` 등) — npm 네임스페이스 충돌 확인 필요. 사용자가 타이핑하는 이름이므로 짧고 직관적이어야 함
- [ ] `ink` vs `blessed-contrib` TUI 프레임워크 최종 선택 — 프로토타입 비교 후 결정. ink는 React 패러다임, blessed는 전통적 위젯
- [ ] daemon 자동 시작 기본값 — `adhd init --full`은 opt-in 자동 시작, `adhd init` 기본은 수동. 사용자 피드백 후 재검토
- [ ] Linux systemd 지원 우선순위 — v1에서 macOS launchd + Linux systemd 동시 지원할지, v1.1로 분리할지
- [ ] 도파민 신호의 정확한 ANSI escape / 이모지 선택 — `[*]`, `[v]` 등 텍스트 기반 vs Unicode 이모지. 터미널 호환성과 사용자 선호 균형. 사용자 테스트 후 결정
- [ ] prompt-status 갱신 주기 최적값 — 현재 30초 계획. daemon이 prompt-state.json을 얼마나 자주 갱신할지. 너무 잦으면 디스크 I/O, 너무 드물면 stale 정보
- [ ] Claude Code 플러그인 확장 시점 — v2에서 slash command 통합 (`/focus`, `/where-was-i`) 여부. 플러그인 API 안정성 확인 필요
- [ ] 수익화 모델 결정 — 오픈소스 / 프리미엄 기능 / 스폰서. 타겟 사용자 규모와 지속 가능성에 영향
- [ ] ADHD 개발자 사용자 연구 일정 — v2 넛지 기능 전 필수. 연구 없이 능동적 개입 기능은 역효과 위험

## adhd-dev-focus-app (Plan A) - 2026-03-24

- [ ] 앱 이름 및 브랜딩 결정 (현재 가칭 "ADHD-Dev") — Plan A/B 공통
- [ ] v1 지원 터미널 에뮬레이터 범위 (Terminal.app + iTerm2 권장) — Plan A/B 공통
- [ ] 수익화 모델 (무료, 프리미엄, 일회성 구매, 구독) — Plan A/B 공통
- [ ] ADHD 개발자 사용자 연구 일정 (v2 넛지 기능 전 필수) — Plan A/B 공통
- [ ] Claude Code `--resume` 플래그 통합 여부 (보안 고려 필요) — Plan A/B 공통
- [ ] 앱 아이콘 및 디자인 시스템 — Plan A 전용
