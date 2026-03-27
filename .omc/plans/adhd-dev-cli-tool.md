# ADHD-Dev Plan B: CLI-Integrated Focus Tool (v2 - Consensus Revision)

> ADHD 성향의 개발자가 멀티 CLI/AI 코딩 환경에서 집중력을 유지하도록 돕는 CLI 통합 도구
> (Plan A의 네이티브 macOS 앱 대안 + Dopamine Architecture CLI 적응)

> **Revision**: v2 (2026-03-24) - Architect/Critic 피드백 반영 + Dopamine Architecture CLI 적응
> **Changes from v1**: 세션 디스커버리 로직 수정, sql.js(WASM) 전환, shell prompt 통합 추가, hook 스크립트 shell 전환, Dopamine Architecture 5개 메커니즘 CLI 적응, 에러/로깅 전략 추가, 데이터 정리 메커니즘 추가

---

## RALPLAN-DR Summary

### Principles (핵심 설계 원칙)

1. **Terminal-Native**: 개발자가 이미 작업하는 환경(터미널) 안에서 동작. 별도 GUI 전환 없이 컨텍스트 유지
2. **Zero-Friction Integration**: Claude Code hooks/filesystem을 활용한 자동 연동. 수동 설정 최소화
3. **Non-Judgmental by Default**: Plan A의 심리학적 원칙 계승. 감시가 아닌 자기인식 도구
4. **Progressive Enhancement**: 단순 CLI 명령어부터 시작하여 daemon, TUI, prompt 통합으로 점진 확장
5. **Unix Philosophy**: 작은 도구들의 조합. 파이프라인 친화적. 다른 도구와 합성 가능

### Decision Drivers (상위 3개 결정 요인)

1. **컨텍스트 스위칭 비용 최소화**: GUI 앱으로 전환하는 것 자체가 주의 분산. CLI 환경 내에서 해결하면 이 비용이 0
2. **기존 워크플로우 통합**: Claude Code hooks 시스템, tmux, 터미널 멀티플렉서 등 이미 사용 중인 도구와의 자연스러운 통합
3. **배포/설치 단순성**: npm/brew 한 줄로 설치. Notarization, DMG, Accessibility 권한 등 macOS 네이티브 앱의 배포 복잡성 제거

### Viable Options (구현 접근법)

#### Option A: Daemon + CLI Client + Claude Code Hooks (선택됨)

**설명**: 백그라운드 daemon이 세션 감시/타이머/도파민 신호를 관리하고, CLI client로 조회/제어. Claude Code hooks(shell script)로 세션 이벤트 자동 캡처. Shell prompt/tmux 통합으로 passive visibility 확보.

| Pros | Cons |
|------|------|
| 실시간 세션 추적 가능 (daemon 상시 동작) | daemon 관리 복잡성 (시작/종료/크래시 복구) |
| Claude Code hooks로 세션 시작/종료 자동 감지 | 프로세스가 하나 더 상시 실행됨 |
| CLI + TUI + prompt 통합 3중 인터페이스 | Node.js daemon의 메모리 사용량 관리 필요 |
| Shell prompt/tmux로 passive visibility 확보 | prompt 통합이 shell 종류에 따라 다름 |

#### Option B: Pure CLI + File-Based State (Daemon 없음)

**설명**: daemon 없이 CLI 호출 시점에 `~/.claude/` 파일시스템을 읽어 상태 파악.

| Pros | Cons |
|------|------|
| 아키텍처 단순. 설치/유지 쉬움 | 실시간 추적 불가 (호출 시점 스냅샷만) |
| 추가 프로세스 없음. 리소스 제로 | **Dopamine Architecture 구현 불가** (passive 신호 전달 경로 없음) |
| 테스트/디버그 용이 | 타이머/알림 구현이 어색 |

> **Option B 탈락 사유**: Dopamine Architecture의 핵심인 Momentum Pulse, Rhythm Anchor 등 지속적 신호 전달이 불가능. ADHD 사용자에게 passive visibility가 필수이나 daemon 없이는 shell prompt 업데이트를 트리거할 수 없음.

#### Option C: Claude Code Plugin (oh-my-claudecode 스타일)

**설명**: Claude Code 플러그인 시스템 위에 구축.

| Pros | Cons |
|------|------|
| Claude Code와 가장 밀접한 통합 | 세션 외부에서는 동작 불가 |
| 설치가 plugin install 한 줄 | **크로스 세션 도파민 신호 불가** |

> **Option C 탈락 사유**: 플러그인은 단일 세션 내에서만 동작. Dopamine Architecture의 Context Warmth(세션 간 비교), Return Bridge(세션 복귀) 등 크로스 세션 기능 구현 불가.

### 선택: Option A (Daemon + CLI + Hooks + Prompt) - 하이브리드

**근거**: Dopamine Architecture의 5개 메커니즘 모두 구현 가능한 유일한 옵션. daemon이 AdaptiveEngine과 SignalEmitter를 호스팅하고, shell prompt/tmux가 passive visibility를 담당. Option B/C는 각각 핵심 기능 결함이 있어 탈락.

---

## 1. Requirements Summary

### Problem Statement
현대 개발자들은 다수의 Claude Code CLI 세션을 동시에 실행하며 작업한다. AI 처리 대기 시간 동안 컨텍스트 스위칭이 빈번하게 발생하고, 특히 ADHD 성향의 개발자는 이 과정에서 주의가 분산되어 생산성이 크게 저하된다. **별도 GUI 앱으로 전환하는 것 자체가 추가적인 컨텍스트 스위칭을 유발**하므로, 개발자가 이미 작업 중인 터미널 환경 내에서 집중 지원 도구가 동작해야 한다. 또한 CLI 도구는 **"보이지 않으면 잊힌다(out of sight = out of mind)"** 문제가 있어, shell prompt/tmux 통합을 통한 passive visibility가 필수.

### Target User
- 멀티 CLI 환경에서 Claude Code를 복수로 운영하는 개발자
- ADHD 성향이 있거나 주의력 관리가 필요한 개발자
- 터미널 중심 워크플로우 선호자 (tmux, Warp, iTerm2, kitty 등)
- macOS / Linux 사용자 (크로스 플랫폼)

### Core Features (MVP)
1. **Claude Code 세션 디스커버리** - PID.json -> sessionId -> path-encoded project -> UUID.jsonl 조인 기반 자동 세션 탐지/추적
2. **"어디까지 했더라?" 컨텍스트 조회** - CLI 명령어 또는 TUI로 각 세션의 마지막 교환 내역 표시
3. **유연한 집중 타이머** - ADHD 친화적 가변 인터벌. 터미널 알림/시스템 알림 지원
4. **세션 대시보드 (TUI)** - tmux-style 분할 화면에서 전체 세션 상태 한눈에 파악
5. **자동 세션 메모** - Claude Code hook(shell script)으로 세션 시작/종료 시 자동 컨텍스트 스냅샷 저장
6. **Passive Visibility** - Shell prompt 통합 + tmux status-bar로 항상 보이는 집중 상태 표시
7. **Dopamine Architecture (CLI 적응)** - 5개 도파민 메커니즘의 터미널 환경 적응

### Deferred Features (v2+)
- 터미널 포커스 감지 (tmux pane 활성 상태 추적)
- Flow State 감지 (키 입력 패턴 분석)
- 능동적 넛지 시스템 (사용자 연구 검증 후)
- Claude Code 플러그인 통합 (slash command `/focus`, `/where-was-i`)
- 크로스 세션 분석/리포팅
- AI 기반 작업 요약 (Claude API 활용)

---

## 2. Psychological Framework (CLI 환경 적응)

### MVP에 적용할 핵심 이론: ADHD 외부 실행기능 보조

| 이론 | CLI 환경 적용 | Plan A 대비 차이 |
|------|-------------|-----------------|
| **ADHD 신경과학** | 터미널 내 마이크로 보상 (shell prompt 아이콘 변화, ANSI 색상 피드백). 도파민 루프를 터미널 환경에서 제공 | GUI 애니메이션 대신 prompt 기반 passive 신호. 더 subtle하지만 작업 흐름을 깨지 않음 |
| **인지부하 이론 (CLT)** | TUI 대시보드에서 최대 4-5개 세션만 우선 표시. CLI 출력은 항상 핵심 정보만 | GUI와 동일하게 적용. 터미널의 텍스트 제한이 오히려 정보 과부하 방지에 유리 |
| **Flow State 이론** | 터미널 환경을 떠나지 않아 플로우 유지. prompt 통합이 passive하여 흐름 방해 없음 | **핵심 이점**: GUI 앱 전환이 없으므로 플로우 보호가 구조적으로 우수 |
| **행동경제학** | 기본값 설계: prompt에 항상 보이는 집중 상태. 최소 인지 비용으로 자기 관찰 | passive visibility가 opt-in 조회보다 ADHD에 효과적 |

### CLI 환경의 심리학적 이점

1. **Zero Context-Switch Cost**: 터미널에서 터미널로. 앱 전환 없이 집중 상태 유지
2. **Command-Line as Ritual**: `adhd start` 타이핑 자체가 집중 시작의 의식적 행동 (behavioral activation)
3. **Passive Visibility via Prompt**: shell prompt에 항상 보이는 상태가 ADHD의 "out of sight = out of mind" 문제 해결
4. **Developer Identity Alignment**: CLI 도구는 개발자 정체성과 일치. "나를 위한 도구"라는 소유감 강화

### 핵심 설계 원칙 (Plan A 계승 + CLI 적응)

1. **판단하지 않기 (Non-judgmental)**: "15분간 터미널에서 떨어져 있었어요" (지지적 톤). RSD 방지
2. **외부 작업기억 역할**: `adhd where` 한 번으로 "어디까지 했는지" 즉시 복원
3. **유연한 구조 제공**: 타이머 강제 없음. 사용자가 선택하는 구조
4. **점진적 개입**: prompt 표시는 passive. daemon은 설정 시에만 알림 전송
5. **감시가 아닌 자기인식 도구**: 모든 데이터는 로컬. 네트워크 전송 없음

---

## 3. Dopamine Architecture - CLI 적응 (미니멀 + 적응형)

> 업무 자체가 보상이 되는 시스템. Plan A의 5개 도파민 메커니즘을 터미널/CLI 환경에 맞게 재설계.
> GUI 애니메이션/아이콘 대신 **shell prompt, tmux status-bar, terminal title, ANSI escape, terminal bell**을 활용.

### 설계 철학

```
Plan A (GUI)                         Plan B (CLI)
━━━━━━━━━━━━━━━━━━━━                ━━━━━━━━━━━━━━━━━━━━
메뉴바 아이콘 애니메이션              Shell prompt 아이콘/색상 변화
팝오버 UI                            TUI 대시보드 / CLI 출력
시스템 사운드                         Terminal bell + node-notifier
아이콘 상태 (3단계)                   Prompt 이모지/색상 (3단계)
뱃지 숫자                            Prompt 내 숫자 표시
컨텍스트 카드                        adhd where / TUI 컨텍스트 패널
```

### CLI 신호 전달 채널 (Signal Channels)

| 채널 | 설명 | Passive 여부 | 적용 메커니즘 |
|------|------|-------------|-------------|
| **Shell Prompt** | PS1/PROMPT에 삽입되는 상태 문자열. 매 명령 후 갱신 | Passive (항상 보임) | Momentum Pulse, Rhythm Anchor, Context Warmth |
| **Tmux Status Bar** | tmux status-right에 삽입. 상시 표시 | Passive (항상 보임) | 모든 메커니즘 |
| **Terminal Title** | `\033]0;title\007` escape sequence로 탭 타이틀 변경 | Passive (탭 바에 보임) | Rhythm Anchor, Timer 상태 |
| **Terminal Bell** | `\a` (BEL). 타이머 완료, 과집중 알림 | Active (1회성) | Completion Ripple, Rhythm Anchor |
| **System Notification** | `node-notifier` 기반 OS 알림 | Active (1회성) | Completion Ripple, Rhythm Anchor |
| **CLI Output** | `adhd` 명령 실행 시 출력 (ANSI 색상) | On-demand | Context Warmth, Return Bridge |
| **TUI Dashboard** | `adhd dash` 실시간 대시보드 | On-demand | 모든 메커니즘 시각화 |

### 메커니즘 1: Momentum Pulse (모멘텀 펄스) - CLI 적응

**신경학적 기반**: 복측 피개 영역(VTA)의 보상 예측 오류(RPE). 예측 불가능한 타이밍의 미세 신호로 RPE를 증폭.

**CLI 작동 방식**:
- daemon이 `~/.claude/projects/*/UUID.jsonl` 파일 변경 감지 -> "교환 완료" 이벤트 발생
- **Shell prompt 변화**: prompt 내 작은 indicator가 순간적으로 변화
  - 평상시: `[~]` (neutral)
  - 교환 감지 직후: `[*]` (pulse, 다음 프롬프트 렌더 시 1회만)
  - 피보나치 뱃지(3, 5, 8회): `[*5]` (숫자 표시, 3회 프롬프트 동안 유지 후 소멸)
- **Tmux status bar**: `#(adhd-dev prompt-status)` 호출로 동일 정보 표시
- **Terminal title**: 교환 누적 수 반영 (예: `ADHD: 5 exchanges | project-name`)
- **핵심**: prompt 갱신은 사용자가 Enter를 칠 때만 발생 -> 자연스럽게 비동기적. 작업 중단 없음

**적응형 행동** (AdaptiveEngine 연동):
- 기준선 수집 (첫 7일): 사용자의 평균 교환 빈도, 세션 길이 학습
- 활동 수준 70% 미만 -> pulse 뱃지 간격을 줄임 (2, 3, 5로 변경하여 격려)
- 활동 수준 130% 이상 -> pulse 빈도 낮춤 (5, 8, 13으로 확대)
- 조절 범위: 기본 빈도의 0.5x ~ 1.5x

**과자극 방지**:
- prompt 변화는 무의식적 수준 -> 이 자체는 제한 불필요
- 뱃지 표시는 5분 내 최대 1회 prominent 신호
- daemon 로그에서 3회 연속 뱃지 무응답(세션 진행 없음) 감지 -> "조용 모드" 진입
- 설정: `signals.momentum: "on" | "subtle" | "off"`

---

### 메커니즘 2: Completion Ripple (완료 파문) - CLI 적응

**신경학적 기반**: 측좌핵(NAcc)의 강화 학습. 큰 목표를 작은 완료 단위로 분절하여 즉각적 보상감 제공.

**CLI 작동 방식**:
- 집중 타이머 세션 완료 시:
  - **Terminal bell**: `\a` (BEL) 1회 -> 터미널 탭이 잠깐 깜빡이거나 시스템 사운드
  - **System notification** (선택적): `node-notifier`로 OS 알림 ("25분 집중 완료")
  - **Shell prompt 변화**: 다음 프롬프트에 완료 마커 `[v]` 표시 (3회 프롬프트 동안)
  - **CLI 출력** (daemon -> socket -> prompt helper):
    ```
    ++ 25분 집중 완료 | 오늘 3세션 | 총 1h 45m ++
    ```
- 오늘의 완료 세션이 **tmux status bar에 누적 표시**: `[3/- 1h45m]` (세션 수 / 총 시간)
- TUI 대시보드에서 완료 세션이 시각적으로 성장 (점 -> 블록 -> 바)

**적응형 행동**:
- 짧은 세션(5-15분): prompt 변화만 (최소 신호)
- 긴 세션(30분+): bell + prompt + notification (풍부한 신호)
- **나쁜 날 감지**: 60분 내 타이머 완료 0회 + 세션 활동 < 10min -> 모든 능동적 신호 억제 ("지지적 침묵")
- 연속 3세션 이상: 중립적 사실 표시만 ("오늘 3세션째")

**과자극 방지 (하드코딩)**:
- 절대 "스트릭" 카운팅 없음
- 절대 손실 프레이밍 없음 ("스트릭을 잃었습니다" 금지)
- 절대 이전 기록과 자동 비교 없음
- 세션이 없으면 빈 상태 표시 (부정적 부재 없음: "아직 0세션" 금지)

---

### 메커니즘 3: Context Warmth (컨텍스트 온기) - CLI 적응

**신경학적 기반**: 전전두엽 피질(PFC)의 작업기억과 과제 개시. 이미 진행 중인 작업의 "따뜻한" 상태를 보여주어 재진입 활성화 에너지를 낮춤.

**CLI 작동 방식**:
- `adhd where` 출력에서 세션 목록의 **ANSI 색상 차이**:
  - 5분 이내 활동: `\033[33m` (yellow/warm) -- 따뜻한 톤
  - 30분 이내: `\033[37m` (white) -- 중간 톤
  - 1시간+: `\033[90m` (dark gray) -- 차가운 톤
- **Shell prompt**에 현재 디렉토리의 세션 온도 반영:
  - 현재 cwd와 매칭되는 세션이 있으면: `[~]` (warm indicator)
  - 매칭 세션 없으면: prompt 변화 없음
- **TUI 대시보드**: 세션 행의 배경색이 온도를 반영
- `adhd where` 출력에 "마지막에 물어본 것: ..." 표시 -> 재진입 마찰 최소화
- Claude 처리 중(jsonl 미변경 + PID 활성): TUI에서 다른 세션 컨텍스트를 subtle하게 표시

**적응형 행동**:
- 자주 돌아가는 세션 패턴 학습 -> `adhd where` 목록 상단 자동 배치
- 세션 간 전환 빈도 높을 때: 목록을 최대 3개로 축소
- 세션 간 전환 낮을 때: 전체 목록 표시

**과자극 방지**:
- 색상 차이는 순수 시각적 정보 (텍스트로 판단하지 않음)
- "N분 동안 비활성" 같은 시간 라벨 없음

---

### 메커니즘 4: Rhythm Anchor (리듬 앵커) - CLI 적응

**신경학적 기반**: ADHD의 시간 인지 장애(time blindness). 외부 시간 구조를 제공하되, 경직되지 않게.

**CLI 작동 방식**:
- **Shell prompt 시간대 반영** (3단계):
  - 오전(에너지 높음): prompt prefix `[AM]` 또는 밝은 색상
  - 오후(주의력 변동): `[PM]` 또는 중간 색상
  - 저녁(마무리): `[EVE]` 또는 차분한 색상
- **집중 세션 진행 중**: prompt에 남은 시간 간략 표시 `[18:42]`
  - tmux status bar에도 프로그레스 표시: `[####----  52%  18:42]`
  - Terminal title: `Focus: 18:42 remaining`
- **시간 체크포인트**: 설정 시간(예: 12시, 18시)에 daemon이 terminal bell 1회 + system notification
  - 내용: "오후가 됐어요" (중립적 시간 알림)
  - 하루 최대 3회
- **과집중(hyperfocus) 알림**: 90분 초과 연속 활동 시
  - Terminal bell 1회 + system notification "90분째 집중 중"
  - 무시 가능. 30분 후까지 재알림 없음
  - prompt에 `[90m+]` 표시 (1회만, 이후 소멸)

**적응형 행동**:
- 사용자의 자연스러운 집중 피크 시간대 학습 (7일 기준선)
- 피크 시간대에는 시간 체크포인트 억제 (방해하지 않음)
- 비피크 시간대에만 체크포인트 활성화

**과자극 방지**:
- "늦었다", "시간이 부족하다" 같은 압박 표현 절대 불가
- DND 모드에서는 체크포인트/과집중 알림 모두 억제
- 시간 체크포인트는 설정된 시간에만 (무작위 알림 없음)

---

### 메커니즘 5: Return Bridge (복귀 다리) - CLI 적응

**신경학적 기반**: Barkley의 실행기능 모델 - 주의 이탈 후 돌아오는 전환 마찰 최소화.

**CLI 작동 방식**:
- CLI 환경에서는 "앱 전환 감지"가 불가하므로 **세션 비활성 시간 기반**으로 작동:
  - daemon이 각 세션의 마지막 활동 시간 추적
  - 세션 비활성 2분 이상 경과 시: 상태를 "away" 로 마킹
- **Shell prompt 변화**: 비활성 세션이 있는 cwd에서 새 명령 실행 시
  - `[<- project-name]` 복귀 힌트가 prompt에 1회 표시
  - "마지막으로: 인증 모듈 리팩토링 중" 같은 컨텍스트 1줄 표시
- **Tmux status bar**: 비활성 세션이 있으면 `[-> project]` 표시
- `adhd where` 실행 시 "돌아갈 곳" 섹션이 최상단에 표시:
  ```
  Return to:
    adhd-dev (2m ago) - "Plan B 작성 중..."

  Other sessions:
    gym-bro (15m ago) - "API 엔드포인트 설계"
  ```
- 원커맨드 복귀: `adhd go <session-name>` -> 해당 프로젝트 디렉토리로 cd + 컨텍스트 표시
  - **구현**: Node.js subprocess는 parent shell의 cwd를 변경할 수 없으므로 shell function wrapper 사용
  - `adhd init --full`이 `.zshrc`/`.bashrc`에 wrapper 설치: `adhd() { eval "$(command adhd-dev "$@")"; }`
  - `go` subcommand 시 stdout으로 `cd /path && adhd-dev where --brief` 출력 → wrapper가 eval
  - tmux 환경에서는 `tmux send-keys "cd /path" Enter`로 해당 pane에 직접 전송하는 대안도 지원
  - 선례: `nvm`, `rvm`, `direnv` 등 동일 패턴 사용

**적응형 행동**:
- 빠른 복귀(< 3분): prompt 힌트 생략 (이미 자기조절 잘 되는 상태)
- 긴 비활성(> 15분) 후 복귀: 더 상세한 컨텍스트 (마지막 3개 교환)
- 자주 전환하는 세션 쌍 학습 -> 해당 세션만 복귀 힌트 표시

**과자극 방지**:
- "N분 동안 이탈" 같은 시간 표시 절대 없음
- 복귀 시 판단/코멘트 없음. 오직 "여기로 돌아갈 수 있어요" 정보만
- prompt 힌트는 1회만 (연속 표시 안 함)

---

### DopamineService 아키텍처 (CLI 적응)

```
┌─────────────────────────────────────────────────────┐
│              DopamineService (daemon 내부)            │
│  ┌───────────────────────────────────────────────┐   │
│  │           AdaptiveEngine                      │   │
│  │  - 기준선 모델 (7일 학습)                        │   │
│  │  - 5개 입력 신호 -> 4개 출력 파라미터              │   │
│  │  - 규칙 기반 (ML 아님)                           │   │
│  │  - 파라미터 변경: 하루 최대 1회 (자정 재계산)       │   │
│  └──────────┬────────────────────────────────────┘   │
│             │                                        │
│  ┌──────────┴────────────────────────────────────┐   │
│  │           SignalEmitter                        │   │
│  │  - 신호 빈도 제한 (5분/1회 prominent)             │   │
│  │  - 과자극 감지 (3회 무시 -> 조용 모드)              │   │
│  │  - 나쁜 날 감지 -> 지지적 침묵                     │   │
│  └──────────┬────────────────────────────────────┘   │
│             │                                        │
│  ┌──────────┴────────────────────────────────────┐   │
│  │    Signal Types (CLI 출력 채널)                 │   │
│  │  - PromptUpdate: shell prompt 상태 갱신          │   │
│  │    (~/.adhd-dev/prompt-state.json 기록)          │   │
│  │  - TmuxUpdate: tmux status 문자열 갱신            │   │
│  │  - TerminalTitle: escape sequence 전송            │   │
│  │  - Bell: terminal bell 트리거                     │   │
│  │  - Notification: node-notifier OS 알림            │   │
│  │  - CLIMessage: 다음 CLI 호출 시 표시할 메시지 큐    │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  입력 <- FileWatcher (세션 .jsonl 변경 이벤트)         │
│  입력 <- TimerEngine (타이머 이벤트)                   │
│  입력 <- HookReceiver (Claude Code hook 이벤트)       │
│  입력 <- SessionTracker (세션 활성/비활성 상태)         │
│                                                      │
│  출력 -> prompt-state.json (shell prompt helper 읽기) │
│  출력 -> Unix socket (TUI 대시보드 실시간 업데이트)     │
│  출력 -> tmux status 캐시 파일                        │
│  출력 -> terminal bell/title (IPC를 통해)              │
└─────────────────────────────────────────────────────┘
```

### 적응형 엔진 상세

**입력 신호 (5개)**:
1. 세션 활동 시간 비율 (활성 세션 시간 / 총 경과 시간)
2. 세션 전환 빈도
3. 집중 타이머 완료율
4. CLI 호출 빈도 (`adhd` 명령 사용 패턴 — 도구 자체가 주의산만이 되는지 감지)
5. 신호 무시율 (prompt 변화 후 세션 미복귀 비율)

**출력 파라미터 (4개)**:
1. 신호 빈도 승수 (0.5x ~ 1.5x)
2. 신호 강도 레벨 (1: prompt만 / 2: prompt+bell / 3: prompt+bell+notification)
3. 조용 모드 임계값 (연속 무시 N회)
4. 컨텍스트 상세 레벨 (간략 1줄 / 보통 3줄 / 상세 교환 내역)

**규칙 예시** (ML 아닌 임계값 기반):
```
IF 신호_무시율 > 60% THEN 신호_빈도_승수 = 0.5
IF 세션_활동_비율 < 30% AND 시간 > 60분 THEN 지지적_침묵_모드
IF CLI_호출 > 5회/10분 THEN 통계_숨김 + prompt_최소화 (도구 자체가 산만원이 됨)
IF 타이머_완료율 > 80% THEN 신호_강도 = 1 (이미 자기조절 잘 됨)
IF 연속_세션 >= 3 AND 세션길이 > 30분 THEN 과집중_알림_활성화
```

### 기준선 기간 (첫 7일) UX

- 모든 신호는 보수적 기본값으로 동작 (강도 2, 빈도 1.0x)
- "앱이 당신의 패턴을 배우고 있어요" 같은 안내 없음 (감시 느낌 방지)
- 사용자 경험은 정적(static) 모드와 동일 -- 7일 후 자연스럽게 적응 시작
- 적응형 파라미터 변경은 하루 최대 1회 (매일 자정 재계산)

### 윤리적 경계 (하드코딩 — 설정으로 변경 불가)

| 절대 하지 않는 것 | 이유 |
|------------------|------|
| 하락 지표 강조 표시 | RSD 유발 |
| "스트릭 N일" 표시 | 끊어졌을 때 죄책감 |
| 오늘 vs 어제 비교 (자동) | 나쁜 날에 자기비하 촉발 |
| "X분 낭비" 표현 | 판단적 |
| 신호 부재를 통한 무언의 벌 | 부정적 강화 |
| 다른 사용자와 비교 | 절대 소셜 기능 없음 |
| 신호 빈도의 급격한 변화 | 사용자가 조작당하는 느낌 |
| 비활성 시간 표시 ("N분 이탈") | 죄책감/판단 유발 |

---

## 4. Technical Architecture

### 기술 스택
- **Language**: TypeScript (Node.js 20+)
  - 이유: Claude Code 생태계와 동일 런타임. npm 배포 용이
- **CLI Framework**: `commander` + `chalk`
- **TUI Framework**: `ink` (React for CLI)
  - 이유: React 패러다임으로 컴포넌트 재사용 용이. 실시간 업데이트 자연스러움
- **Daemon**: Node.js 프로세스 + `~/.adhd-dev/adhd-dev.pid` PID 파일
- **데이터 저장**: `sql.js` (WASM 기반 SQLite) + JSON 설정 파일
  - **변경 사유 (v1 -> v2)**: `better-sqlite3`는 네이티브 C++ 모듈로 `npm install` 시 컴파일 실패 위험. ADHD 사용자에게 설치 실패는 치명적 (재시도 동기 부여 어려움). `sql.js`는 순수 WASM으로 모든 플랫폼에서 zero-compile 설치
  - **트레이드오프**: `sql.js`는 `better-sqlite3` 대비 ~2-5x 느림. 하지만 이 도구의 데이터량은 극소 (일 수백 레코드)이므로 무시 가능
- **파일 감시**: `chokidar` (FSEvents/inotify 래퍼)
- **시스템 알림**: `node-notifier` (macOS/Linux 크로스 플랫폼)
- **프로세스 관리**: macOS `launchd` plist / Linux `systemd` unit
- **패키지 배포**: npm (`npx adhd-dev`) + Homebrew formula
- **Hook 스크립트**: Shell scripts (bash/zsh) — Node.js cold-start 회피
  - **변경 사유 (v1 -> v2)**: Hook은 Claude Code 매 이벤트마다 실행됨. TypeScript hook은 Node.js cold-start (~300ms)가 발생하여 Claude Code 응답 지연. Shell script로 daemon Unix socket에 메시지만 전송 (~5ms)

### Claude Code 세션 디스커버리 알고리즘

> **[Architect Blocker #1, Critic Critical #6 해결]**: 실제 파일 구조 기반 정확한 디스커버리

**실제 파일 구조** (검증됨):
```
~/.claude/
  sessions/
    PID.json          # {"pid": 37899, "sessionId": "UUID", "cwd": "/path/to/project", "startedAt": 1774265396149}
  projects/
    -Users-path-encoded/     # cwd를 path-encode한 디렉토리명
      UUID.jsonl              # 세션 트랜스크립트 (sessionId와 매칭)
      UUID/                   # 세션 관련 부가 데이터
      memory/                 # 프로젝트 메모리
```

**Path Encoding 로직** (하이브리드 접근):
- **1차 규칙**: `/`와 `.` 문자를 `-`로 치환 (실측 기반)
- 예: `/Users/hona.mind/Dev/playground/adhd-dev` -> `-Users-hona-mind-Dev-playground-adhd-dev`
- 구현: `cwd.replace(/[/.]/g, '-')` (선행 `/`도 `-`로 변환되므로 결과가 `-`로 시작)
- **2차 Fallback**: 1차 규칙 매칭 실패 시 `~/.claude/projects/` 디렉토리를 직접 스캔하여 fuzzy match
  - 디렉토리명에서 cwd의 마지막 2-3 세그먼트를 포함하는 항목 탐색
  - 매칭 성공 시 해당 인코딩 규칙을 `~/.adhd-dev/path-encoding-cache.json`에 캐싱
- **3차 검증**: `adhd doctor`에서 현재 cwd의 path encoding 결과가 실제 디렉토리와 매칭되는지 런타임 검증
- **주의**: Claude Code의 path encoding 규칙은 비공식이므로, 추가 특수문자(`~`, `@`, 공백 등) 치환 가능성 있음. Fallback이 이를 커버

**디스커버리 조인 알고리즘**:
```
1. ~/.claude/sessions/*.json 스캔
   -> 각 PID.json에서 {pid, sessionId, cwd, startedAt} 추출

2. 각 세션에 대해:
   a. pid가 실제 활성 프로세스인지 확인 (process.kill(pid, 0))
   b. cwd를 path-encode: cwd.replace(/[/.]/g, '-') (1차), 실패 시 디렉토리 스캔 fallback (2차)
   c. 경로 조합: ~/.claude/projects/{encoded-cwd}/{sessionId}.jsonl
   d. .jsonl 파일 존재 확인 + 마지막 수정 시간 체크

3. 세션 상태 결정:
   - "active": pid 활성 AND .jsonl 최근 수정 (5분 이내)
   - "idle": pid 활성 AND .jsonl 오래됨 (5분+)
   - "stale": pid 비활성 (프로세스 종료됨)
   - "orphan": PID.json 있으나 .jsonl 없음 (비정상 종료)

4. 결과를 sessions 테이블에 upsert
```

**세션 상태 머신 (Lifecycle)**:
```
                   ┌─────────┐
  PID.json 생성 -> │ active  │ <- .jsonl 변경 감지
                   └────┬────┘
                        │ .jsonl 5분+ 미변경
                        v
                   ┌─────────┐
                   │  idle   │
                   └────┬────┘
                        │ PID 프로세스 종료
                        v
                   ┌─────────┐
                   │  stale  │ -> 30일 후 자동 정리
                   └─────────┘

  예외:
  ┌─────────┐
  │ orphan  │ -> PID.json은 있으나 매칭 .jsonl 없음 -> 로그 경고 후 무시
  └─────────┘
```

### 아키텍처 다이어그램

```
┌───────────────────────────────────────────────────────────────────┐
│                      User Interfaces                              │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────┐ ┌─────────────┐ │
│  │  CLI Client   │ │ TUI Dashboard│ │ Shell     │ │ Claude Code │ │
│  │  (adhd ...)   │ │ (adhd dash)  │ │ Prompt    │ │ Hooks       │ │
│  │               │ │  ink/React   │ │ Integration│ │ (shell      │ │
│  │  status       │ │              │ │           │ │  scripts)   │ │
│  │  where        │ │ Session List │ │ PS1/RPROMPT│ │             │ │
│  │  timer        │ │ Timer View   │ │ tmux bar  │ │ -> socket   │ │
│  │  today        │ │ Dopamine     │ │ term title│ │    message  │ │
│  │  go           │ │ Signals View │ │           │ │             │ │
│  └──────┬───────┘ └──────┬───────┘ └─────┬─────┘ └──────┬──────┘ │
│         │                │               │               │        │
│  ┌──────┴────────────────┴───────────────┴───────────────┴─────┐  │
│  │              IPC Layer (Unix Socket)                         │  │
│  │         ~/.adhd-dev/adhd-dev.sock                           │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│                          │                                        │
│  ┌───────────────────────┴──────────────────────────────────────┐ │
│  │                     Daemon Process                            │ │
│  │                                                               │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │ │
│  │  │ Session      │ │ Timer        │ │ DopamineService      │  │ │
│  │  │ Tracker      │ │ Engine       │ │                      │  │ │
│  │  │              │ │              │ │ AdaptiveEngine       │  │ │
│  │  │ - discover   │ │ - flexible   │ │ SignalEmitter        │  │ │
│  │  │   (PID->     │ │   intervals  │ │ (prompt, bell,      │  │ │
│  │  │   sessionId  │ │ - flow       │ │  tmux, notification) │  │ │
│  │  │   -> .jsonl) │ │   protect    │ │                      │  │ │
│  │  │ - lifecycle  │ │ - hyperfocus │ │ Ethical boundaries   │  │ │
│  │  │   state      │ │   detect     │ │ (hardcoded)          │  │ │
│  │  └──────┬───────┘ └──────────────┘ └──────────┬───────────┘  │ │
│  │         │                                     │               │ │
│  │  ┌──────┴─────────────────────────────────────┴────────────┐  │ │
│  │  │  sql.js (WASM SQLite) + File Watchers + Prompt State   │  │ │
│  │  │  ~/.adhd-dev/data.db          (세션/타이머/통계 DB)      │  │ │
│  │  │  ~/.adhd-dev/config.json      (사용자 설정)              │  │ │
│  │  │  ~/.adhd-dev/prompt-state.json (shell prompt용 상태)     │  │ │
│  │  │  ~/.adhd-dev/baseline.json    (AdaptiveEngine 기준선)    │  │ │
│  │  │  ~/.adhd-dev/logs/            (에러/디버그 로그)          │  │ │
│  │  └──────────────────────┬─────────────────────────────────┘  │ │
│  └──────────────────────────┼────────────────────────────────────┘ │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                    ┌─────────┴──────────────┐
                    │ ~/.claude/              │
                    │   sessions/             │
                    │     PID.json            │
                    │   projects/             │
                    │     -encoded-path/      │
                    │       UUID.jsonl        │
                    └────────────────────────┘
```

### Shell Prompt 통합 상세

> **[Architect High #3 해결]**: ADHD 사용자를 위한 passive visibility

**통합 방식 (3가지 제공)**:

#### 1. Zsh Prompt (RPROMPT)
```bash
# ~/.zshrc에 추가 (adhd init --full 이 자동 설정)
export RPROMPT='$(adhd-dev prompt-status 2>/dev/null)'
```
`adhd-dev prompt-status`는 `~/.adhd-dev/prompt-state.json`을 읽어 ANSI 문자열 반환:
- daemon 미실행: 빈 문자열 (graceful)
- 타이머 활성: `[18:42 | *5]` (남은시간 + pulse)
- 타이머 없음: `[~]` 또는 빈 문자열

**성능 요구사항**: `prompt-status`는 JSON 파일 읽기만 수행. 목표 < 10ms. Socket 통신 없음 (파일 기반).

#### 2. Bash Prompt (PS1)
```bash
# ~/.bashrc에 추가
export PS1='$(adhd-dev prompt-status 2>/dev/null)\$ '
```

#### 3. Tmux Status Bar
```tmux
# ~/.tmux.conf에 추가
set -g status-right '#(adhd-dev tmux-status 2>/dev/null) | %H:%M'
set -g status-interval 5
```
`adhd-dev tmux-status`는 더 풍부한 정보 반환:
- `[Focus 18:42 | 3 sessions | *5]`
- tmux는 상시 표시이므로 모든 도파민 신호 전달 가능

#### 4. Terminal Title (추가 채널)
daemon이 직접 escape sequence 전송 (IPC를 통해 터미널에):
```
\033]0;ADHD: Focus 18:42 | adhd-dev\007
```

### Hook 스크립트 아키텍처

> **[Architect Medium #5, Critic Major #7 해결]**: Shell scripts로 cold-start 회피

Hook 스크립트는 `~/.adhd-dev/hooks/` 에 설치되는 **shell script**:

#### session-start.sh
```bash
#!/bin/bash
# Claude Code SessionStart hook -> daemon에 세션 시작 알림
SOCK="$HOME/.adhd-dev/adhd-dev.sock"
if [ -S "$SOCK" ]; then
  echo '{"event":"session_start","pid":'$$',"cwd":"'$(pwd)'","ts":'$(date +%s)'}' | nc -U "$SOCK" -w 1 2>/dev/null
fi
# daemon 미실행 시 파일 기반 폴백
echo '{"event":"session_start","pid":'$$',"cwd":"'$(pwd)'","ts":'$(date +%s)'}' >> "$HOME/.adhd-dev/events.jsonl"
```

#### session-stop.sh
```bash
#!/bin/bash
SOCK="$HOME/.adhd-dev/adhd-dev.sock"
if [ -S "$SOCK" ]; then
  echo '{"event":"session_stop","pid":'$$',"ts":'$(date +%s)'}' | nc -U "$SOCK" -w 1 2>/dev/null
fi
echo '{"event":"session_stop","pid":'$$',"ts":'$(date +%s)'}' >> "$HOME/.adhd-dev/events.jsonl"
```

#### notification.sh
```bash
#!/bin/bash
SOCK="$HOME/.adhd-dev/adhd-dev.sock"
if [ -S "$SOCK" ]; then
  echo '{"event":"notification","pid":'$$',"ts":'$(date +%s)'}' | nc -U "$SOCK" -w 1 2>/dev/null
fi
```

**성능**: shell script + `nc` (netcat) = ~5ms 실행. Node.js cold-start (~300ms) 대비 60x 빠름.

### settings.json 안전한 수정

> **[Architect Medium #4 해결]**: Atomic write + backup

`adhd install-hooks`가 `~/.claude/settings.json`을 수정할 때:

```typescript
async function safeUpdateSettings(settingsPath: string, modifier: (settings: any) => any) {
  // 1. 백업 생성
  const backupPath = `${settingsPath}.adhd-backup-${Date.now()}`;
  await fs.copyFile(settingsPath, backupPath);

  // 2. 현재 설정 읽기
  const current = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));

  // 3. 수정
  const updated = modifier(current);

  // 4. 임시 파일에 쓰기 (같은 파일시스템)
  const tempPath = `${settingsPath}.tmp-${process.pid}`;
  await fs.writeFile(tempPath, JSON.stringify(updated, null, 2));

  // 5. Atomic rename (같은 파일시스템이므로 atomic)
  await fs.rename(tempPath, settingsPath);

  // 6. 3개 이상 오래된 백업 정리
  // ~/.claude/settings.json.adhd-backup-* 중 최근 3개만 유지
}
```

- 백업 파일: `~/.claude/settings.json.adhd-backup-TIMESTAMP`
- 최근 3개 백업 유지 (이전 것 자동 삭제)
- `adhd uninstall-hooks`는 백업에서 복원하는 옵션도 제공

### 데이터 정리 메커니즘

> **[Critic Missing #12 해결]**: 30일 retention + purge 로직

```typescript
// daemon이 매일 자정에 실행
async function purgeOldData(db: Database, retentionDays: number = 30) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  // 1. 오래된 세션 기록 삭제
  db.run('DELETE FROM sessions WHERE last_seen < ?', cutoff);

  // 2. 오래된 집중 기록 삭제
  db.run('DELETE FROM focus_records WHERE completed_at < ?', cutoff);

  // 3. 오래된 스냅샷 삭제
  db.run('DELETE FROM snapshots WHERE created_at < ?', cutoff);

  // 4. AdaptiveEngine 기준선은 rolling window (항상 최근 7일만)
  // baseline.json은 매일 재계산이므로 별도 정리 불필요

  // 5. 이벤트 로그 정리
  // ~/.adhd-dev/events.jsonl -> 30일 이상 된 라인 제거

  // 6. 로그 파일 로테이션
  // ~/.adhd-dev/logs/ -> 7일 이상 된 로그 삭제

  // 7. SQLite VACUUM (월 1회)
  if (isFirstDayOfMonth()) {
    db.run('VACUUM');
  }
}
```

설정: `config.json`의 `dataRetentionDays` (기본 30, 최소 7, 최대 365)

### 에러 보고/로깅 전략

> **[Critic Missing #13 해결]**

**로깅 레벨**: `error`, `warn`, `info`, `debug`

**로그 위치**: `~/.adhd-dev/logs/`
- `daemon.log` - daemon 프로세스 로그 (info 이상)
- `daemon-debug.log` - debug 레벨 (config에서 `debug: true` 시에만)
- `error.log` - error만 별도 파일 (빠른 진단용)

**로그 포맷**:
```
2026-03-24T10:30:15.123Z [INFO] session-tracker: Discovered 3 active sessions
2026-03-24T10:30:15.456Z [WARN] session-tracker: Orphan PID.json found: 12345 (no matching .jsonl)
2026-03-24T10:30:16.789Z [ERROR] file-watcher: chokidar error on ~/.claude/projects/: EACCES
```

**에러 처리 원칙**:
- 모든 파일 I/O는 try-catch로 감싸기. ADHD 사용자에게 스택 트레이스 노출 금지
- CLI 에러 메시지는 항상 **다음 행동 제안 포함**:
  - Bad: `Error: EACCES: permission denied`
  - Good: `~/.claude/ 디렉토리에 접근할 수 없어요. 'ls -la ~/.claude/' 로 권한을 확인해 보세요.`
- daemon 크래시 시 `~/.adhd-dev/crash.log`에 기록 + 다음 CLI 호출 시 안내
- `adhd doctor` 명령어로 자가 진단 (daemon 상태, 파일 권한, hook 설치 상태, 디스크 사용량)

**로그 로테이션**: 7일 보존. 단일 파일 최대 10MB. 초과 시 `.1` 접미사로 순환.

### 권한 계층 모델 (Graceful Degradation)

| 권한 레벨 | 사용 가능 기능 | 필요 조건 |
|-----------|--------------|----------|
| **Tier 0** (CLI만) | 집중 타이머, 수동 세션 메모, `adhd today` 통계 | `npm i -g adhd-dev` 설치만 |
| **Tier 1** (파일 접근) | Claude Code 세션 자동 탐지, 컨텍스트 카드, TUI 대시보드 | `~/.claude/` 읽기 가능 (기본 충족) |
| **Tier 2** (Hooks 연동) | 세션 시작/종료 자동 감지, 실시간 이벤트 캡처 | Claude Code hooks 설정 (`adhd install-hooks`) |
| **Tier 3** (Daemon + Prompt) | 도파민 신호, shell prompt 통합, tmux status, 실시간 대시보드, AdaptiveEngine | daemon 실행 + prompt 설정 (`adhd init --full`) |

---

## 5. Implementation Steps

### Phase 1: 프로젝트 세팅 및 CLI 쉘 (Step 1-2)

**Step 1: 프로젝트 초기화 및 CLI 기본 구조**
- TypeScript + Node.js 프로젝트 세팅 (ESM)
- `commander` 기반 CLI 엔트리포인트
- 기본 서브커맨드 스켈레톤: `status`, `where`, `timer`, `config`, `dash`, `daemon`, `go`, `doctor`
- `~/.adhd-dev/` 디렉토리 자동 생성 (config, data, logs, hooks)
- 파일:
  - `package.json`, `tsconfig.json`
  - `src/cli/index.ts` (엔트리포인트)
  - `src/cli/commands/*.ts` (서브커맨드별)
  - `src/core/config.ts` (설정 관리)
  - `src/core/paths.ts` (경로 상수)
  - `src/core/logger.ts` (로깅 시스템)
- **Acceptance Criteria**: `npx adhd-dev status` 실행 시 "No active sessions" 메시지 출력. `~/.adhd-dev/config.json` 자동 생성. 로그 파일 생성 확인

**Step 2: sql.js 데이터 레이어 + Claude 세션 디스커버리**
- `sql.js` (WASM) 기반 스키마 정의 (sessions, focus_records, snapshots, dopamine_signals 테이블)
- 마이그레이션 시스템 (버전 기반)
- **세션 디스커버리 알고리즘 구현**:
  - `~/.claude/sessions/PID.json` 스캔 -> `{pid, sessionId, cwd, startedAt}` 추출
  - Path encoding: `cwd.replace(/[/.]/g, '-')` (1차), 실패 시 디렉토리 스캔 fallback (2차)
  - 조인: `~/.claude/projects/{encoded-cwd}/{sessionId}.jsonl`
  - PID 활성 확인: `process.kill(pid, 0)` (시그널 0 = 존재 확인만)
  - 세션 상태 결정 (active / idle / stale / orphan)
- `.jsonl` 트랜스크립트 파싱 (마지막 N개 교환 추출)
- 추상화 레이어로 감싸기 (Claude Code 내부 포맷 변경 대비)
- 파일:
  - `src/core/db.ts` (sql.js 관리 — WASM 로딩, 파일 persist)
  - `src/core/migrations/*.ts`
  - `src/services/claude-session-parser.ts`
  - `src/services/claude-session-discovery.ts` (디스커버리 조인 알고리즘)
  - `src/services/path-encoder.ts` (경로 인코딩 유틸)
  - `src/models/types.ts` (SessionState enum 포함)
- **Acceptance Criteria**:
  - `adhd where` 실행 시 현재 활성 Claude 세션 목록과 마지막 교환 내역 표시
  - PID.json -> sessionId -> encoded-path -> UUID.jsonl 조인이 정확히 동작
  - 손상된 `.jsonl` 파일에 크래시 없이 대응
  - `adhd doctor` 실행 시 디스커버리 경로 진단 출력

### Phase 2: 집중 타이머 엔진 (Step 3)

**Step 3: 타이머 코어 + CLI 인터페이스 + 기본 도파민 신호**
- 유연한 인터벌 설정 (5분~90분)
- 연구 기반 프리셋: 25/5 (포모도로), 52/17 (DeskTime), 90/20 (울트라디안)
- `Date` 기반 절대 시간 계산 (시스템 슬립 안전)
- 타이머 상태 파일: `~/.adhd-dev/timer-state.json` (daemon 재시작 시 복원)
- 플로우 보호 모드 (`adhd flow on/off`): 타이머 알림 억제, 자동 연장
- **Completion Ripple 기본 구현**: 타이머 완료 시 terminal bell + 텍스트 피드백
- 오늘의 집중 시간 합계, 완료 세션 수 (`adhd today`)
- CLI 명령어:
  - `adhd timer start [minutes]` - 집중 세션 시작
  - `adhd timer stop` - 중단
  - `adhd timer status` - 남은 시간 표시
  - `adhd timer preset <name>` - 프리셋 선택
  - `adhd flow on/off` - 플로우 보호 모드
  - `adhd today` - 일일 통계
- 파일:
  - `src/services/timer-engine.ts`
  - `src/services/flow-protection.ts`
  - `src/services/stats-aggregator.ts`
  - `src/services/notification.ts`
  - `src/cli/commands/timer.ts`, `flow.ts`, `today.ts`
- **Acceptance Criteria**:
  - `adhd timer start 25` 후 25분 뒤 terminal bell + 시스템 알림
  - 시스템 슬립 후에도 타이머 정확
  - 플로우 모드 중 타이머 알림 미발생
  - `adhd today`에서 당일 집중 시간/세션 수 정확 표시

### Phase 3: Daemon + Dopamine Service (Step 4-5)

**Step 4: Daemon 프로세스 + IPC + DopamineService**
- Node.js 백그라운드 프로세스 (`child_process.fork` + detach)
- PID 파일: `~/.adhd-dev/adhd-dev.pid`
- Unix domain socket IPC: `~/.adhd-dev/adhd-dev.sock`
- `chokidar`로 `~/.claude/sessions/` + `~/.claude/projects/` 실시간 감시
- 세션 디스커버리 주기적 실행 (30초 간격) + 파일 변경 이벤트 트리거
- **DopamineService 구현**:
  - AdaptiveEngine (기준선 수집, 규칙 기반 파라미터 조절)
  - SignalEmitter (빈도 제한, 과자극 감지, 나쁜 날 감지)
  - Signal 출력: `prompt-state.json` 기록, bell 전송, notification 발송
- **Prompt State 파일**: `~/.adhd-dev/prompt-state.json`
  ```json
  {
    "pulse": "*",
    "badge": 5,
    "timer": "18:42",
    "timeOfDay": "PM",
    "returnTo": "adhd-dev",
    "warmth": "warm",
    "updated": 1774265396149
  }
  ```
- 라이프사이클 명령어:
  - `adhd daemon start` - daemon 시작
  - `adhd daemon stop` - daemon 중지
  - `adhd daemon status` - daemon 상태 확인
  - `adhd daemon install` - launchd/systemd 자동 시작 등록
- **데이터 정리**: 매일 자정 purge 실행 (30일 retention)
- 파일:
  - `src/daemon/index.ts` (daemon 엔트리포인트)
  - `src/daemon/ipc-server.ts` (Unix socket 서버)
  - `src/daemon/file-watcher.ts` (chokidar 감시)
  - `src/daemon/launchd.ts` / `src/daemon/systemd.ts`
  - `src/services/dopamine-service.ts` (DopamineService)
  - `src/services/adaptive-engine.ts` (AdaptiveEngine)
  - `src/services/signal-emitter.ts` (SignalEmitter)
  - `src/services/data-purger.ts` (데이터 정리)
  - `src/cli/commands/daemon.ts`
- **Acceptance Criteria**:
  - `adhd daemon start` 후 백그라운드 실행 확인
  - 새 Claude 세션 시작 시 5초 이내 감지
  - `prompt-state.json`이 세션 이벤트에 따라 갱신
  - daemon CPU 사용량 평균 1% 미만, 메모리 50MB 미만
  - 30일 이상 된 데이터 자동 정리 확인

**Step 5: Shell Prompt + Tmux 통합 + TUI 대시보드**
- `adhd-dev prompt-status` 명령어 (< 10ms 목표)
  - `~/.adhd-dev/prompt-state.json` 읽어 ANSI 문자열 반환
  - daemon 미실행 시 빈 문자열 (graceful)
- `adhd-dev tmux-status` 명령어 (풍부한 정보)
- TUI 대시보드 (`ink` React 기반):
  ```
  ┌─ ADHD-Dev Dashboard ──────────────────────────────────┐
  │                                                        │
  │  Sessions (3 active)            Timer: 18:42 remaining │
  │  ┌────────────────────────┐     ┌────────────────────┐ │
  │  │ ● adhd-dev    2m ago   │     │  ████████░░  75%   │ │
  │  │   "Plan B 작성 중..."   │     │  Focus: 25min      │ │
  │  │ ● gym-bro     5m ago   │     │  Break: 5min       │ │
  │  │ ○ d0po-mind  15m ago   │     │                    │ │
  │  └────────────────────────┘     │  [f]low [s]kip     │ │
  │                                  └────────────────────┘ │
  │  Dopamine: [*5] momentum | PM rhythm | warm context    │
  │                                                        │
  │  Today: 2h 15m focused | 5 sessions | 3 completed      │
  │  ─────────────────────────────────────────────────────  │
  │  [q]uit  [t]imer  [w]here  [g]o  [r]efresh             │
  └────────────────────────────────────────────────────────┘
  ```
- 세션 색상: Context Warmth 반영 (warm=yellow, medium=white, cool=gray)
- 도파민 신호 시각화 행: 현재 활성 신호 표시
- 파일:
  - `src/cli/commands/prompt-status.ts` (prompt helper)
  - `src/cli/commands/tmux-status.ts` (tmux helper)
  - `src/tui/App.tsx` (ink 루트)
  - `src/tui/components/SessionList.tsx`
  - `src/tui/components/TimerWidget.tsx`
  - `src/tui/components/StatsBar.tsx`
  - `src/tui/components/ContextCard.tsx`
  - `src/tui/components/DopamineBar.tsx`
  - `src/cli/commands/dash.ts`
- **Acceptance Criteria**:
  - `adhd-dev prompt-status` 실행 시간 < 10ms
  - zsh RPROMPT에 통합 시 매 프롬프트에 상태 표시
  - tmux status bar에 실시간 정보 표시
  - TUI 대시보드 렌더링 + 키바인딩 동작 + Context Warmth 색상 표시

### Phase 4: Hooks + 온보딩 (Step 6)

**Step 6: Claude Code Hooks + `adhd init --full` 원버튼 설정**
- **Shell script hooks** 설치/관리:
  - `~/.adhd-dev/hooks/session-start.sh`
  - `~/.adhd-dev/hooks/session-stop.sh`
  - `~/.adhd-dev/hooks/notification.sh`
- **settings.json 안전 수정**: atomic write + backup (3개 보존)
- `adhd install-hooks` / `adhd uninstall-hooks`
- **`adhd init` 초기 설정 위저드**:
  1. "ADHD-Dev는 당신의 외부 작업기억입니다" (핵심 가치 소개)
  2. Claude Code 세션 디스커버리 확인 (자동)
  3. 선호 타이머 프리셋 선택
  4. 도파민 신호 강도 선택 (on / subtle / off)
- **`adhd init --full` 원버튼 설정** (Critic #8):
  1. `adhd init` 기본 설정 모두 실행 +
  2. Claude Code hooks 자동 설치
  3. daemon 자동 시작 등록 (launchd/systemd)
  4. shell prompt 통합 자동 설정 (현재 shell 감지 -> .zshrc/.bashrc에 추가)
  5. tmux 감지 시 tmux.conf에 status-right 추가
  6. 모든 설정 후 `adhd doctor` 실행하여 검증
- `adhd reset` 전체 데이터 삭제 + hooks 제거 + prompt 설정 복원
- 파일:
  - `src/services/hook-installer.ts` (settings.json 안전 수정 포함)
  - `src/services/shell-integrator.ts` (prompt/tmux 자동 설정)
  - `src/cli/commands/init.ts` (`--full` 플래그 포함)
  - `src/cli/commands/install-hooks.ts`
  - `src/cli/commands/uninstall-hooks.ts`
  - `src/cli/commands/reset.ts`
  - `src/cli/commands/doctor.ts` (자가 진단)
  - `hooks/session-start.sh`, `hooks/session-stop.sh`, `hooks/notification.sh`
- **Acceptance Criteria**:
  - `adhd init --full` 실행 시 30초 이내에 모든 설정 완료
  - hooks 설치 후 settings.json 백업 존재 확인
  - 새 Claude Code 세션 시작 시 hook 트리거 확인 (daemon 로그)
  - `adhd uninstall-hooks`로 settings.json 완전 복원
  - shell prompt에 adhd-dev 상태 표시 확인
  - `adhd doctor` 실행 시 모든 컴포넌트 상태 보고

### Phase 5: 빌드 및 배포 (Step 7)

**Step 7: 빌드, 테스트, 배포 파이프라인**
- TypeScript 빌드: `tsup` (번들링)
- `bin` 필드로 `adhd-dev` 글로벌 CLI 등록
- npm 배포: `npm publish`
- Homebrew formula (선택): `brew install adhd-dev`
- **테스트 전략** (Critic #9 반영 -- fixture 사용):
  - **Unit Tests** (`vitest`):
    - 세션 디스커버리 조인 알고리즘 (path encoding, PID 매칭)
    - 세션 상태 머신 (active/idle/stale/orphan 전환)
    - .jsonl 파서 (정상/손상/빈 파일)
    - 타이머 엔진 (시작/정지/슬립 복원)
    - AdaptiveEngine 규칙 (입력 -> 출력 파라미터)
    - SignalEmitter 빈도 제한
    - 데이터 정리 로직
    - settings.json 안전 수정 (atomic write)
  - **Integration Tests**:
    - daemon IPC (socket 통신)
    - 파일 감시 -> 세션 디스커버리 -> DB 업데이트 파이프라인
    - hook installer -> settings.json 수정/복원
    - prompt-status 성능 (< 10ms)
  - **E2E Tests**:
    - CLI 명령어 전체 플로우
    - **fixture 사용** (`tests/fixtures/mock-claude-home/`): 실제 `~/.claude/` 대신 테스트용 디렉토리 구조
    - `adhd init --full` -> `adhd where` -> `adhd timer start` -> 완료 -> `adhd today` 전체 흐름
  - **Fixture 구조**:
    ```
    tests/fixtures/mock-claude-home/
      sessions/
        12345.json    # {"pid":12345,"sessionId":"test-uuid-1","cwd":"/tmp/test-project","startedAt":...}
      projects/
        -tmp-test-project/
          test-uuid-1.jsonl
    ```
- CI: GitHub Actions (lint, test, build, publish)
- 파일:
  - `tsup.config.ts`
  - `tests/unit/*.test.ts`
  - `tests/integration/*.test.ts`
  - `tests/e2e/*.test.ts`
  - `tests/fixtures/mock-claude-home/` (fixture 데이터)
  - `.github/workflows/ci.yml`
  - `.github/workflows/release.yml`
- **Acceptance Criteria**:
  - `npm i -g adhd-dev` 후 `adhd-dev` 명령어 사용 가능 (zero-compile)
  - 테스트 커버리지 80% 이상
  - 모든 테스트가 fixture 사용 (실제 `~/.claude/` 데이터 미사용)
  - CI 파이프라인 그린

---

## 6. Acceptance Criteria

### 기능별 검증 기준

| # | 기준 | 측정 방법 |
|---|------|----------|
| AC-1 | `adhd where` 실행 시 활성 Claude 세션 목록 2초 이내 표시 | CLI 실행 시간 측정 |
| AC-2 | PID.json -> sessionId -> path-encode -> UUID.jsonl 조인 정확 | fixture 기반 unit test |
| AC-3 | 세션 상태 머신 (active/idle/stale/orphan) 정확 전환 | 상태 전환 unit test |
| AC-4 | 집중 타이머 5분~90분 범위 자유 설정 + 슬립 후 정확성 | 슬립 시뮬레이션 test |
| AC-5 | daemon 없이 Tier 0-1 기능 정상 동작 | daemon 미실행 상태 테스트 |
| AC-6 | `adhd-dev prompt-status` 실행 시간 < 10ms | 성능 벤치마크 |
| AC-7 | Shell prompt에 도파민 신호 표시 (zsh/bash) | 수동 통합 테스트 |
| AC-8 | Tmux status bar에 실시간 정보 표시 | tmux 환경 테스트 |
| AC-9 | daemon CPU 평균 1% 미만, 메모리 50MB 미만 | profiling |
| AC-10 | `adhd init --full` 30초 이내 완료 + 모든 컴포넌트 설정 | 사용자 테스트 |
| AC-11 | Hook 스크립트 실행 시간 < 10ms | 벤치마크 |
| AC-12 | settings.json 수정 시 백업 생성 + atomic write | 중단 시뮬레이션 test |
| AC-13 | 손상된 `.jsonl` / 누락된 PID.json 크래시 없이 처리 | 퍼즈 테스트 |
| AC-14 | 30일 이상 데이터 자동 정리 | 시간 조작 test |
| AC-15 | 윤리적 경계 준수 (스트릭 없음, 손실 프레이밍 없음) | 코드 리뷰 체크리스트 |
| AC-16 | 네트워크 요청 없음 (npm 업데이트 체크 제외) | 오프라인 테스트 |
| AC-17 | 모든 E2E 테스트 fixture 사용 (실제 ~/.claude/ 미접근) | CI 환경 test |
| AC-18 | macOS + Linux 양쪽에서 동작 | CI 매트릭스 테스트 |

---

## 7. Risks and Mitigations

| # | 리스크 | 영향도 | 완화 방법 |
|---|--------|-------|----------|
| R-1 | Claude Code 세션 파일 포맷 변경 | 높음 | 추상화 레이어 (`ClaudeSessionParser`) 분리. path-encoder 별도 모듈. `adhd doctor`에 포맷 검증 포함 |
| R-2 | Claude Code hooks API 변경 | 중간 | hooks는 보조 채널. 파일 기반 디스커버리가 1차. hooks 없이도 Tier 0-1 동작 보장 |
| R-3 | daemon 크래시/좀비 프로세스 | 중간 | PID 파일 기반 상태 관리. stale PID 감지/정리. launchd KeepAlive로 자동 재시작 |
| R-4 | ADHD 사용자가 CLI 도구 설정을 잊음 | 높음 | **`adhd init --full` 원버튼 설정**. shell prompt 통합으로 passive visibility. daemon 자동 시작 |
| R-5 | 도파민 신호가 오히려 주의산만 유발 | 중간 | AdaptiveEngine의 과자극 방지. 3단계 신호 강도 설정. 조용 모드 자동 전환. 윤리적 경계 하드코딩 |
| R-6 | Node.js daemon 메모리 누수 | 중간 | 주기적 GC 힌트. 메모리 모니터링 + 자동 재시작 임계값 (100MB). sql.js WASM은 별도 메모리 |
| R-7 | Shell prompt 통합이 사용자 환경에 따라 깨짐 | 중간 | `prompt-status`는 파일 읽기만 (외부 의존 없음). 실패 시 빈 문자열 (silent fail). `adhd doctor`로 진단 |
| R-8 | sql.js WASM 성능 | 낮음 | 데이터량이 극소 (일 수백 레코드). 벤치마크로 검증. 성능 이슈 시 better-sqlite3 마이그레이션 경로 확보 |
| R-9 | tmux/screen 비사용자에게 passive visibility 부재 | 중간 | Shell prompt 통합이 1차 채널. Terminal title이 2차. tmux 없이도 동작 보장 |

---

## 8. Verification Steps

1. **빌드 검증**: `npm run build` 성공, TypeScript 0 errors, sql.js WASM 번들 정상
2. **세션 디스커버리 테스트**:
   - fixture 데이터로 PID.json -> sessionId -> path-encode -> UUID.jsonl 조인 정확성
   - 존재하지 않는 `~/.claude/` 경로에서 graceful 에러 메시지
   - orphan PID.json (매칭 .jsonl 없음) 처리
   - stale 세션 (PID 종료됨) 감지
3. **타이머 테스트**: 1분 타이머 시작 -> 슬립 시뮬레이션 -> 정확한 시간 복원
4. **daemon 테스트**:
   - start -> status -> stop 라이프사이클
   - daemon 크래시 후 재시작 -> PID 파일 정리
   - 2개 이상 daemon 동시 실행 방지
   - 도파민 신호 출력 (prompt-state.json 갱신) 확인
5. **Prompt 통합 테스트**:
   - `adhd-dev prompt-status` < 10ms
   - daemon 미실행 시 빈 문자열
   - zsh RPROMPT / bash PS1 통합 동작
6. **Hooks 테스트**:
   - shell script hook 실행 시간 < 10ms
   - `adhd install-hooks` -> settings.json 백업 생성 + 수정 확인
   - `adhd uninstall-hooks` -> settings.json 복원 확인
7. **도파민 신호 테스트**:
   - Momentum Pulse: .jsonl 변경 -> prompt-state 업데이트 -> 피보나치 뱃지
   - Completion Ripple: 타이머 완료 -> bell + notification + prompt 변화
   - Context Warmth: 세션 활동 시간에 따른 색상 차이
   - Rhythm Anchor: 시간대별 prompt 변화 + 과집중 알림
   - Return Bridge: 비활성 세션 복귀 힌트
   - 과자극 방지: 5분 내 1회 제한, 3회 무시 -> 조용 모드
   - 나쁜 날 감지 -> 지지적 침묵
8. **데이터 정리 테스트**: 30일 이상 데이터 purge 확인
9. **TUI 테스트**: Terminal.app, iTerm2, Warp에서 대시보드 정상 렌더링
10. **크로스 플랫폼 테스트**: macOS + Ubuntu에서 전체 기능 동작

---

## 9. File Structure (Proposed)

```
adhd-dev/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── cli/
│   │   ├── index.ts                       # CLI 엔트리포인트 (commander)
│   │   └── commands/
│   │       ├── status.ts                  # adhd status
│   │       ├── where.ts                   # adhd where (세션 컨텍스트)
│   │       ├── timer.ts                   # adhd timer start/stop/status
│   │       ├── flow.ts                    # adhd flow on/off
│   │       ├── today.ts                   # adhd today (일일 통계)
│   │       ├── go.ts                      # adhd go <session> (원커맨드 복귀)
│   │       ├── dash.ts                    # adhd dash (TUI 대시보드)
│   │       ├── daemon.ts                  # adhd daemon start/stop/status/install
│   │       ├── config.ts                  # adhd config
│   │       ├── init.ts                    # adhd init [--full] (온보딩)
│   │       ├── install-hooks.ts           # adhd install-hooks
│   │       ├── uninstall-hooks.ts         # adhd uninstall-hooks
│   │       ├── doctor.ts                  # adhd doctor (자가 진단)
│   │       ├── reset.ts                   # adhd reset (데이터 삭제)
│   │       ├── prompt-status.ts           # adhd-dev prompt-status (shell prompt helper)
│   │       └── tmux-status.ts             # adhd-dev tmux-status (tmux helper)
│   ├── core/
│   │   ├── paths.ts                       # 경로 상수 (~/.adhd-dev/, ~/.claude/)
│   │   ├── config.ts                      # 설정 관리
│   │   ├── db.ts                          # sql.js (WASM) 관리
│   │   ├── logger.ts                      # 로깅 시스템 (파일 + 콘솔)
│   │   └── migrations/
│   │       └── 001-initial.ts             # 초기 스키마
│   ├── services/
│   │   ├── claude-session-parser.ts       # .jsonl 파서 (추상화 레이어)
│   │   ├── claude-session-discovery.ts    # PID->sessionId->path->UUID 디스커버리
│   │   ├── path-encoder.ts               # /path -> -path 인코딩 유틸
│   │   ├── timer-engine.ts                # 집중 타이머 코어
│   │   ├── flow-protection.ts             # 플로우 보호 모드
│   │   ├── stats-aggregator.ts            # 통계 집계
│   │   ├── notification.ts                # 시스템 알림
│   │   ├── hook-installer.ts              # Claude Code hooks 관리 (atomic write)
│   │   ├── shell-integrator.ts            # Shell prompt / tmux 자동 설정
│   │   ├── dopamine-service.ts            # DopamineService (메인 오케스트레이터)
│   │   ├── adaptive-engine.ts             # AdaptiveEngine (기준선, 규칙, 파라미터)
│   │   ├── signal-emitter.ts              # SignalEmitter (빈도 제한, 과자극 방지)
│   │   └── data-purger.ts                 # 데이터 정리 (retention, vacuum)
│   ├── daemon/
│   │   ├── index.ts                       # daemon 엔트리포인트
│   │   ├── ipc-server.ts                  # Unix socket IPC
│   │   ├── file-watcher.ts                # chokidar 파일 감시
│   │   ├── launchd.ts                     # macOS launchd plist 생성
│   │   └── systemd.ts                     # Linux systemd unit 생성
│   ├── hooks/                             # Shell script hook 템플릿
│   │   ├── session-start.sh
│   │   ├── session-stop.sh
│   │   └── notification.sh
│   ├── tui/
│   │   ├── App.tsx                        # ink 루트 컴포넌트
│   │   └── components/
│   │       ├── SessionList.tsx            # 세션 목록 (Context Warmth 색상)
│   │       ├── TimerWidget.tsx            # 타이머 위젯
│   │       ├── StatsBar.tsx               # 통계 바
│   │       ├── ContextCard.tsx            # 컨텍스트 카드
│   │       └── DopamineBar.tsx            # 도파민 신호 시각화
│   └── models/
│       ├── types.ts                       # 공유 타입 (SessionState enum 등)
│       └── signals.ts                     # 도파민 신호 타입 정의
├── tests/
│   ├── unit/
│   │   ├── claude-session-discovery.test.ts  # 디스커버리 조인 알고리즘
│   │   ├── path-encoder.test.ts              # 경로 인코딩
│   │   ├── claude-session-parser.test.ts     # .jsonl 파싱
│   │   ├── timer-engine.test.ts
│   │   ├── adaptive-engine.test.ts           # 규칙 기반 파라미터 조절
│   │   ├── signal-emitter.test.ts            # 빈도 제한, 과자극 방지
│   │   ├── stats-aggregator.test.ts
│   │   ├── data-purger.test.ts
│   │   ├── hook-installer.test.ts            # atomic write, 백업
│   │   └── flow-protection.test.ts
│   ├── integration/
│   │   ├── daemon-ipc.test.ts
│   │   ├── file-watcher-discovery.test.ts    # 파일 감시 -> 디스커버리 파이프라인
│   │   ├── dopamine-pipeline.test.ts         # 이벤트 -> AdaptiveEngine -> 신호
│   │   └── prompt-status-perf.test.ts        # < 10ms 성능
│   ├── e2e/
│   │   ├── full-flow.test.ts                 # init -> where -> timer -> today
│   │   └── hook-lifecycle.test.ts            # install -> trigger -> uninstall
│   └── fixtures/
│       ├── mock-claude-home/
│       │   ├── sessions/
│       │   │   ├── 12345.json
│       │   │   └── 99999.json               # stale PID
│       │   └── projects/
│       │       └── -tmp-test-project/
│       │           ├── test-uuid-1.jsonl
│       │           └── test-uuid-1/
│       ├── sample-session.jsonl
│       ├── corrupted-session.jsonl
│       └── empty-session.jsonl
└── scripts/
    └── generate-launchd-plist.ts
```

---

## 10. Key Architectural Decisions

### AD-1: TypeScript + Node.js
- **결정**: TypeScript/Node.js를 주 언어/런타임으로 사용
- **이유**: Claude Code 생태계와 동일 런타임. npm 배포가 가장 자연스러움
- **대안**: Rust(성능), Go(단일 바이너리) -- 개발 속도/생태계 이유로 탈락
- **결과**: Node.js 런타임 의존 (타겟 사용자 이미 보유)

### AD-2: Daemon + CLI + Shell Prompt 하이브리드
- **결정**: daemon이 도파민 신호/감시 담당, shell prompt이 passive visibility 담당
- **이유**: ADHD "out of sight = out of mind" 문제 해결에 passive visibility 필수. daemon 없이는 prompt 상태 갱신 불가
- **대안**: Pure CLI (passive 불가), Plugin only (크로스 세션 불가)
- **결과**: 3중 인터페이스 유지 비용. 하지만 각 레이어가 독립적으로 graceful degrade

### AD-3: sql.js (WASM) over better-sqlite3
- **결정**: WASM 기반 SQLite 사용
- **이유**: 네이티브 모듈 컴파일 실패 위험 제거. ADHD 사용자에게 설치 실패는 치명적
- **대안**: better-sqlite3 (2-5x 빠르지만 컴파일 필요), JSON 파일 (쿼리 불편)
- **결과**: 성능 트레이드오프 수용 (데이터량 극소). 필요시 better-sqlite3 마이그레이션 경로 확보

### AD-4: Shell Script Hooks
- **결정**: Claude Code hooks를 TypeScript 대신 shell script로 구현
- **이유**: Node.js cold-start (~300ms) vs shell + netcat (~5ms). Hook은 매 이벤트마다 실행
- **대안**: TypeScript hooks (개발 편의), compiled binary (복잡)
- **결과**: hook 로직은 최소화 (daemon에 메시지 전달만). 복잡한 로직은 daemon 측에서 처리

### AD-5: Atomic settings.json Write + Backup
- **결정**: Claude Code의 settings.json 수정 시 항상 atomic write + 백업
- **이유**: settings.json 손상 시 Claude Code 전체 설정이 날아감. 사용자 신뢰 상실
- **대안**: 직접 write (위험), copy-on-write (복잡)
- **결과**: 백업 파일 3개 유지. uninstall 시 복원 옵션 제공

### AD-6: File-Based Prompt State (Socket 아님)
- **결정**: daemon이 `prompt-state.json` 파일에 상태 기록, prompt helper가 파일 읽기
- **이유**: prompt helper는 매 프롬프트마다 실행됨. socket 통신은 overhead (~50ms). 파일 읽기는 < 1ms
- **대안**: daemon socket 쿼리 (느림), shared memory (복잡)
- **결과**: daemon -> 파일 -> prompt helper 경로. 파일 갱신 주기가 prompt 갱신 주기와 다를 수 있음 (수용 가능 -- 최대 30초 지연)

---

## 11. Open Questions (계획 후 결정 필요)

- [ ] npm 패키지 이름 결정 (`adhd-dev`, `adhd-focus`, `focusdev` 등)
- [ ] `ink` vs `blessed-contrib` TUI 프레임워크 최종 선택
- [ ] daemon의 자동 시작 기본값: `adhd init --full`은 opt-in으로 자동 시작. `adhd init` 기본은 수동
- [ ] Linux systemd 지원 우선순위 (v1에서 동시 지원 vs v1.1 분리)
- [ ] 도파민 신호의 정확한 ANSI escape / 이모지 선택 (사용자 테스트 후 결정)
- [ ] prompt-status의 최적 갱신 주기 (현재 30초 계획 -- 사용자 피드백에 따라 조정)

---

## Plan A vs Plan B 비교 (v2 업데이트)

| 항목 | Plan A (Native macOS App) | Plan B (CLI Tool) |
|------|--------------------------|-------------------|
| **설치** | DMG 다운로드 + Notarization | `npm i -g adhd-dev` (zero-compile) |
| **플랫폼** | macOS only | macOS + Linux |
| **Passive Visibility** | 메뉴바 아이콘 (항상 보임) | **Shell prompt + tmux status bar** (항상 보임) |
| **도파민 신호** | GUI 애니메이션/사운드/뱃지 | Prompt 변화/bell/notification/ANSI 색상 |
| **앱 전환 감지** | Accessibility API (네이티브) | 세션 비활성 시간 기반 (근사치) |
| **UI 풍부함** | SwiftUI 팝오버 (리치) | TUI (ink) + CLI + prompt |
| **컨텍스트 스위칭 비용** | 메뉴바 클릭 필요 | 터미널 내 (제로) |
| **배포 복잡성** | Notarization, Sparkle, DMG | npm publish |
| **Claude Code 통합** | 파일 감시만 | 파일 감시 + hooks + prompt |
| **AdaptiveEngine** | 동일 (규칙 기반, 7일 기준선) | 동일 |

---

## ADR (Architectural Decision Record) - v2

### Decision
ADHD-Dev를 **CLI 통합 도구 (Daemon + CLI Client + Shell Prompt + Claude Code Shell Hooks)** 로 구현한다. Plan A의 Dopamine Architecture 5개 메커니즘을 터미널 환경(shell prompt, tmux, terminal bell, ANSI escape)에 적응시킨다.

### Drivers
1. 터미널 환경에서의 컨텍스트 스위칭 비용 제거가 ADHD 사용자에게 구조적 이점
2. Shell prompt/tmux 통합으로 passive visibility 확보 (ADHD "out of sight = out of mind" 해결)
3. Claude Code hooks(shell script) + 파일 기반 디스커버리로 깊은 세션 연동
4. sql.js(WASM)로 zero-compile 설치 보장 (ADHD 사용자의 설치 실패 방지)

### Alternatives Considered
- **Plan A (Native macOS App)**: 리치 UI + Accessibility API. 하지만 앱 전환 비용 + macOS 전용
- **Pure CLI (daemon 없음)**: 가장 단순. 하지만 Dopamine Architecture 구현 불가 (passive 신호 전달 경로 없음)
- **Plugin Only**: 밀접한 통합. 하지만 크로스 세션 도파민 신호 불가 + API 종속

### Why Chosen
Dopamine Architecture의 5개 메커니즘 모두 구현 가능한 유일한 아키텍처. daemon이 AdaptiveEngine/SignalEmitter를 호스팅하고, shell prompt/tmux가 passive visibility를 담당. 각 레이어가 독립적으로 graceful degrade 가능.

### Consequences
- 앱 전환 감지 (Accessibility API) 대신 세션 비활성 시간 기반 근사치 사용
- Shell prompt 통합이 사용자 shell 환경에 따라 다를 수 있음
- 3중 인터페이스 (CLI + TUI + Prompt) 유지 비용
- sql.js 성능이 better-sqlite3 대비 열세 (데이터량 극소이므로 수용)

### Follow-ups
- v1.1: Linux systemd 지원 완성
- v2: Claude Code 플러그인 통합 (slash commands)
- v2: 터미널 포커스 감지 (tmux pane 활성 추적)
- v2: 사용자 연구 기반 도파민 신호 미세 조정
- v2+: 능동적 넛지 시스템

---

*Plan created: 2026-03-24*
*Plan revised: 2026-03-24 (v2 - Architect/Critic consensus feedback + Dopamine Architecture CLI adaptation)*
*Alternative to: `.omc/plans/adhd-dev-focus-app.md` (Plan A)*
*Estimated MVP scope: 7 implementation steps across 5 phases*
*Consensus iteration: 2 of N*
