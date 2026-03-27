# ADHD-Dev: macOS Menubar Focus App for Developers

> ADHD 성향의 개발자가 멀티 CLI/AI 코딩 환경에서 집중력을 유지하도록 돕는 네이티브 macOS 메뉴바 앱

---

## 1. Requirements Summary

### Problem Statement
현대 개발자들은 다수의 Claude Code CLI 세션을 동시에 실행하며 작업한다. AI 처리 대기 시간 동안 컨텍스트 스위칭이 빈번하게 발생하고, 특히 ADHD 성향의 개발자는 이 과정에서 주의가 분산되어 생산성이 크게 저하된다.

### Target User
- 멀티 CLI 환경에서 Claude Code를 복수로 운영하는 개발자
- ADHD 성향이 있거나 주의력 관리가 필요한 개발자
- macOS 사용자 (macOS 14 Sonoma 이상)

### Core Features (MVP)
1. **Claude Code 세션 디스커버리** - `~/.claude/projects/` 파일시스템 감시를 통한 자동 세션 탐지
2. **"어디까지 했더라?" 컨텍스트 카드** - 세션 클릭 시 마지막 몇 교환 내역 표시
3. **유연한 집중 타이머** - ADHD 친화적 가변 인터벌 (고정 포모도로가 아닌)
4. **앱 전환 인식** - Accessibility API 기반 전면 앱 추적 (권한 없이도 기본 기능 동작)
5. **사용자 설정 앱 분류** - 허용/차단 리스트로 "생산적 앱" vs "주의산만 앱" 구분

### Deferred Features (v2+)
- 능동적 넛지 시스템 (사용자 연구 검증 후)
- Flow State 감지 알고리즘
- 행동경제학 기반 커밋먼트 디바이스
- 인지부하 이론 기반 정보 청킹
- "생산적 휴식" 활동 제안
- 크로스 세션 분석/리포팅
- 클라우드/싱크 기능
- 플러그인/확장 아키텍처

---

## 2. Psychological Framework (통합적 접근)

### MVP에 적용할 핵심 이론: ADHD 외부 실행기능 보조

| 이론 | MVP 적용 | v2+ 확장 |
|------|----------|----------|
| **ADHD 신경과학** | 도파민 보상 루프 (작은 완료 신호), 외부 실행기능 보조 ("어디까지?"), 자극 조절 | 도파민 디톡스 사이클, 과집중 감지 |
| **인지부하 이론 (CLT)** | 세션 목록의 정보 청킹 (최대 4-5개 표시), 컨텍스트 스위칭 비용 시각화 | 적응형 정보 밀도 조절 |
| **Flow State 이론** | 플로우 보호 모드 (타이머 인터럽트 억제) | 난이도-스킬 밸런스 감지 |
| **행동경제학** | 기본값 설계 (opt-out이 아닌 opt-in 주의산만) | 넛지, 손실회피 프레이밍 |

### 핵심 설계 원칙 (심리학 기반)

1. **판단하지 않기 (Non-judgmental)**: "15분간 Chrome에 있었습니다" (감시적) -> "터미널에서 15분간 떨어져 있었어요" (지지적). ADHD 사용자의 거절 민감성 불쾌감(RSD) 방지
2. **외부 작업기억 역할**: 앱이 사용자의 "어디까지 했는지"를 기억해주는 외부 실행기능 보조 도구
3. **유연한 구조 제공**: 고정된 시간 규칙이 아닌, 사용자가 선택할 수 있는 구조. ADHD 사용자에게 경직된 타이머는 불안 유발 가능
4. **점진적 개입**: 최소 간섭 -> 필요 시 더 적극적 지원. 사용자가 통제감을 유지
5. **감시가 아닌 자기인식 도구**: 데이터는 자기 관찰용이지, 판단/보고용이 아님

---

## 3. Dopamine Architecture (미니멀 + 적응형)

> 업무 자체가 보상이 되는 시스템. 외부 보상(숏폼/게임)이 아닌, 코딩 행위와 완료에 내재된 도파민 신호를 증폭.

### 설계 철학

```
외부 보상 (TikTok 등)          이 앱의 접근
━━━━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━━
업무 → 보상(콘텐츠)            업무 자체 = 보상
도파민 원천: 외부              도파민 원천: 진행감, 완료감, 리듬
중독 위험: 높음                자기조절: 내장
AI 완료 = 벌(콘텐츠 중단)      AI 완료 = 보상(결과 확인 기대감)
```

### 메커니즘 1: Momentum Pulse (모멘텀 펄스)

**신경학적 기반**: 복측 피개 영역(VTA)의 보상 예측 오류(RPE). ADHD 뇌는 RPE 신호가 둔화되어 있어, 일반적인 진행 신호로는 보상감을 느끼기 어려움. 예측 불가능한 타이밍의 미세 신호로 RPE를 증폭.

**작동 방식**:
- Claude Code `.jsonl` 파일 변경 감지 → "교환 완료" 이벤트 발생
- 메뉴바 아이콘이 순간적으로 밝아졌다 돌아옴 (0.3초 페이드, 의식적 주의 불필요)
- 연속 교환이 누적되면(3회, 5회, 8회 — 피보나치 간격) 아이콘 옆에 작은 숫자 뱃지 표시
- **핵심**: 뱃지가 나타나는 간격이 비선형(가변비율 강화). 슬롯머신의 중독성 없이, "다음은 언제?"라는 가벼운 기대감 형성

**적응형 행동**:
- 기준선 수집 (첫 7일): 사용자의 평균 교환 빈도, 세션 길이 학습
- 사용자의 현재 활동 수준이 기준선의 70% 미만 → 펄스 빈도 약간 높임 (격려)
- 기준선의 130% 이상 → 펄스 빈도 낮춤 (과자극 방지, 업무 자체가 이미 보상적)
- 조절 범위: 기본 빈도의 0.5x ~ 1.5x (극단적 변동 방지)

**과자극 방지**:
- 5분 내 최대 1회 두드러진 신호 (아이콘 페이드는 제외 — 이것은 무의식적)
- 사용자가 3회 연속 신호 무시 시 → 나머지 세션 동안 "조용 모드" 진입
- 마스터 토글: 설정에서 "보상 신호: 켜기 / 은은하게 / 끄기"

**구현**: `Services/DopamineService.swift` → `FileWatcherService`의 이벤트 구독

---

### 메커니즘 2: Completion Ripple (완료 파문)

**신경학적 기반**: 측좌핵(NAcc)의 강화 학습. ADHD의 시간 할인(temporal discounting) 문제 — 먼 미래의 보상(프로젝트 완료)보다 즉각적 보상을 극단적으로 선호. **해결**: 큰 목표를 작은 완료 단위로 분절하여, 각 단위에서 즉각적 보상감 제공.

**작동 방식**:
- 집중 타이머 세션 완료 시: 원형 프로그레스가 "채워지는" 애니메이션 (0.5초)
- 오늘의 완료 세션 수가 시각적으로 누적 (원형 점 → 선 → 면으로 성장)
- **시스템 사운드** (선택적): macOS 기본 사운드 중 짧고 부드러운 것 (`Glass`, `Purr` 등)
- 완료 시점에 컨텍스트 카드가 자동 업데이트 — "다음에 할 것" 제안이 아닌, "여기까지 왔어" 확인

**적응형 행동**:
- 짧은 세션(5-15분) 완료 시: 간결한 신호 (아이콘 변화만)
- 긴 세션(30분+) 완료 시: 더 풍부한 신호 (사운드 + 시각)
- 연속 3세션 이상 완료 시: "오늘 벌써 3세션째" 같은 중립적 사실 표시 (축하가 아닌 인지)
- **나쁜 날 감지**: 60분 내 생산적 앱 사용 < 10분이면 → 모든 능동적 신호 억제. "지지적 침묵" 모드

**과자극 방지**:
- 절대 손실 프레이밍 없음: "스트릭을 잃었습니다" 같은 표현 금지
- 절대 이전 기록과 비교하지 않음 (opt-in 통계 뷰에서만 가능)
- 부정적 부재: "아직 0세션" 같은 표시 없음. 세션이 없으면 그냥 빈 상태

**구현**: `Services/DopamineService.swift` → `TimerEngine` 완료 이벤트 구독, `Views/CompletionRippleView.swift`

---

### 메커니즘 3: Context Warmth (컨텍스트 온기)

**신경학적 기반**: 전전두엽 피질(PFC)의 작업기억과 과제 개시. ADHD의 가장 큰 어려움 중 하나는 **과제 개시(task initiation)** — 시작하는 것 자체가 어려움. 이미 진행 중인 작업의 "따뜻한" 상태를 시각적으로 보여주어, 재진입 활성화 에너지를 낮춤.

**작동 방식**:
- 세션 목록에서 최근 활동이 있는 세션은 "따뜻한" 시각 표현 (미묘한 색상 차이)
  - 5분 이내 활동: 따뜻한 톤 (amber/warm)
  - 30분 이내: 중간 톤
  - 1시간+: 차가운 톤 (회색)
- 이것은 정보를 전달하는 것이지 판단이 아님 — "이 세션이 아직 머릿속에 있을 때 돌아가면 쉬워요"
- 컨텍스트 카드에 "마지막에 당신이 물어본 것: ..." 표시 → 재진입 마찰 최소화
- **대기 시간 활용**: Claude가 처리 중(`.jsonl` 미변경 + 프로세스 활성)일 때, 다른 세션의 컨텍스트 카드를 슬쩍 보여주기 — "기다리는 동안 이것도 있어요" (넛지가 아닌 리마인더)

**적응형 행동**:
- 사용자가 자주 돌아가는 세션 패턴 학습 → 해당 세션을 목록 상단에 자동 배치
- 세션 간 전환 빈도가 높을 때: 목록을 최대 3개로 축소 (인지부하 감소)
- 세션 간 전환이 낮을 때: 전체 목록 표시

**과자극 방지**:
- "따뜻한/차가운" 표현은 순수 시각적 정보. 텍스트로 판단하지 않음
- 대기 시간 리마인더는 최대 1회/세션 (반복하지 않음)

**구현**: `Views/SessionRowView.swift` 색상 로직, `Services/DopamineService.swift` 세션 순서 결정

---

### 메커니즘 4: Rhythm Anchor (리듬 앵커)

**신경학적 기반**: ADHD의 시간 인지 장애(time blindness). Sonuga-Barke의 이중경로 모델 — ADHD는 시간 처리 회로(소뇌-전전두엽)의 기능 저하로 시간 흐름을 정확히 인지하지 못함. 외부 시간 구조를 제공하되, 경직되지 않게.

**작동 방식**:
- 메뉴바 아이콘이 하루의 리듬을 반영하는 3단계 상태:
  - 오전(에너지 높음): 밝은 아이콘
  - 오후(주의력 변동): 중간 아이콘
  - 저녁(마무리): 차분한 아이콘
- 집중 세션 진행 중: 아이콘에 미세한 프로그레스 링 (시계처럼 천천히 채워짐)
- **시간 체크포인트**: 설정한 시간(예: 12시, 18시)에 단 한 번 "오후가 됐어요" 같은 중립적 시간 알림
- 과집중(hyperfocus) 90분 초과 시: 부드러운 1회 알림 "90분째 집중 중" (강제 중단 없음, 무시 가능, 30분 후까지 재알림 없음)

**적응형 행동**:
- 사용자의 자연스러운 집중 피크 시간대 학습 (7일 기준선)
- 피크 시간대에는 시간 체크포인트 억제 (방해하지 않음)
- 비피크 시간대에만 체크포인트 활성화

**과자극 방지**:
- 시간 체크포인트는 하루 최대 3회
- "늦었다", "시간이 부족하다" 같은 압박 표현 절대 불가
- DND 모드에서는 체크포인트도 억제

**구현**: `Services/DopamineService.swift` → `TimerEngine` 통합, 아이콘 상태 관리

---

### 메커니즘 5: Return Bridge (복귀 다리)

**신경학적 기반**: Barkley의 실행기능 모델 — ADHD는 "행동 억제 → 작업기억 유지 → 목표 지향 행동 재개"의 연쇄가 약함. 주의가 이탈한 후 돌아오는 것이 가장 어려운 순간. 이 전환 마찰을 최소화.

**작동 방식**:
- Tier 2(Accessibility)에서 앱 전환 감지 후, 생산적 앱을 떠난 지 2분 이상 경과 시:
  - 메뉴바 아이콘만 살짝 변화 (텍스트 없음, 알림 없음)
  - 팝오버를 열면 "돌아갈 곳" 카드가 첫 화면에 표시
  - 카드 내용: 마지막 활성 세션의 컨텍스트 ("마지막으로: 인증 모듈 리팩토링 중")
  - 원클릭으로 해당 터미널 앱으로 포커스 이동
- **핵심**: 넛지/알림으로 끌어오지 않음. 사용자가 스스로 돌아올 때 마찰을 줄여줌

**적응형 행동**:
- 이탈 패턴 학습: 특정 시간대에 이탈이 잦으면, 해당 시간 전에 집중 세션 시작을 제안 (1회)
- 빠른 복귀(< 3분) 패턴이면: 아이콘 변화도 생략 (이미 자기조절 잘 하는 상태)
- 긴 이탈(> 15분) 후 복귀 시: 컨텍스트 카드를 더 상세하게 (마지막 3개 교환 표시)

**과자극 방지**:
- "N분 동안 이탈했습니다" 같은 시간 표시 절대 없음
- 복귀 시 판단/코멘트 없음. 오직 "여기로 돌아갈 수 있어요" 정보만
- 아이콘 변화는 2초 이상 느린 전환 (갑작스러운 변화 = 주의 끌기 = 감시 느낌)

**구현**: `Services/DopamineService.swift` → `ActivityDetector` 구독, `Views/ReturnBridgeView.swift`

---

### DopamineService 아키텍처

```
┌─────────────────────────────────────────────────┐
│                DopamineService                   │
│  ┌───────────────────────────────────────────┐   │
│  │         AdaptiveEngine                    │   │
│  │  - 기준선 모델 (7일 학습)                    │   │
│  │  - 5개 입력 신호 → 4개 출력 파라미터          │   │
│  │  - 규칙 기반 (ML 아님)                      │   │
│  └─────────┬─────────────────────────────────┘   │
│            │                                     │
│  ┌─────────┴─────────────────────────────────┐   │
│  │         SignalEmitter                     │   │
│  │  - 신호 빈도 제한 (5분/1회)                  │   │
│  │  - 과자극 감지 (3회 무시 → 조용 모드)          │   │
│  │  - 나쁜 날 감지 → 지지적 침묵                 │   │
│  └─────────┬─────────────────────────────────┘   │
│            │                                     │
│  ┌─────────┴─────────────────────────────────┐   │
│  │      Signal Types (출력)                   │   │
│  │  - IconPulse: 아이콘 페이드 (0.3초)          │   │
│  │  - Badge: 누적 뱃지 숫자                     │   │
│  │  - Sound: 시스템 사운드 (선택적)              │   │
│  │  - CardUpdate: 컨텍스트 카드 갱신             │   │
│  │  - IconState: 3단계 아이콘 상태              │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  입력 ← FileWatcherService (세션 이벤트)          │
│  입력 ← TimerEngine (타이머 이벤트)               │
│  입력 ← ActivityDetector (앱 전환 이벤트)          │
│  출력 → MenuBarView, SessionListView, StatsView  │
└─────────────────────────────────────────────────┘
```

### 적응형 엔진 상세

**입력 신호 (5개)**:
1. 생산적 앱 체류 시간 비율 (Tier 2)
2. 세션 전환 빈도
3. 집중 타이머 완료율
4. 팝오버 열기 빈도 (앱 자체가 주의산만이 되는지 감지)
5. 신호 무시율

**출력 파라미터 (4개)**:
1. 신호 빈도 승수 (0.5x ~ 1.5x)
2. 신호 강도 레벨 (1: 아이콘만 / 2: 아이콘+뱃지 / 3: 아이콘+뱃지+사운드)
3. 조용 모드 임계값 (연속 무시 N회)
4. 컨텍스트 카드 상세 레벨 (간략 / 보통 / 상세)

**규칙 예시** (ML 아닌 임계값 기반):
```
IF 신호_무시율 > 60% THEN 신호_빈도_승수 = 0.5
IF 생산적_앱_비율 < 30% AND 시간 > 60분 THEN 지지적_침묵_모드
IF 팝오버_열기 > 3회/10분 THEN 통계_숨김 + "I'll be here" 메시지
IF 타이머_완료율 > 80% THEN 신호_강도 = 1 (이미 자기조절 잘 됨)
IF 연속_세션 >= 3 AND 세션길이 > 30분 THEN 과집중_알림_활성화
```

### 기준선 기간 (첫 7일) UX

적응형 시스템이 학습하는 동안:
- 모든 신호는 보수적 기본값으로 동작 (강도 2, 빈도 1.0x)
- "앱이 당신의 패턴을 배우고 있어요" 같은 안내 없음 (감시 느낌 방지)
- 사용자 경험은 정적(static) 모드와 동일 — 7일 후 자연스럽게 적응 시작
- 적응형 파라미터 변경은 하루 최대 1회 (매일 자정 재계산)

### 윤리적 경계 (하드코딩)

| 절대 하지 않는 것 | 이유 |
|------------------|------|
| 하락 지표 강조 표시 | RSD 유발 |
| "스트릭 N일" 표시 | 끊어졌을 때 죄책감 |
| 오늘 vs 어제 비교 (자동) | 나쁜 날에 자기비하 촉발 |
| "X분 낭비" 표현 | 판단적 |
| 신호 부재를 통한 무언의 벌 | 부정적 강화 |
| 다른 사용자와 비교 | 절대 소셜 기능 없음 |
| 신호 빈도의 급격한 변화 | 사용자가 조작당하는 느낌 |

---

## 4. Technical Architecture

### 기술 스택
- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI (macOS 14+)
- **배포**: 직접 배포 (Notarized DMG) - App Store 샌드박스가 Accessibility API와 호환 불가
- **자동 업데이트**: Sparkle framework
- **데이터 저장**: SwiftData (SQLite 기반)
- **프로세스 모니터링**: `NSWorkspace`, `NSRunningApplication`
- **파일 감시**: `DispatchSource.makeFileSystemObjectSource` / FSEvents
- **로그인 항목**: `SMAppService` (modern API)

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────┐
│              Menubar App (SwiftUI)           │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Session  │ │  Focus   │ │  Awareness   │  │
│  │ Tracker  │ │  Timer   │ │  Monitor     │  │
│  │  View    │ │  View    │ │  View        │  │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       │            │               │          │
│  ┌────┴────────────┴───────────────┴───────┐  │
│  │          App State (Observable)          │  │
│  └────┬────────────┬───────────────┬───────┘  │
│       │            │               │          │
│  ┌────┴─────┐ ┌────┴─────┐ ┌──────┴───────┐  │
│  │ Session  │ │  Timer   │ │  Activity    │  │
│  │ Service  │ │  Engine  │ │  Detector    │  │
│  └────┬─────┘ └──────────┘ └──────┬───────┘  │
│       │                           │          │
│  ┌────┴─────┐              ┌──────┴───────┐  │
│  │ Claude   │              │ Accessibility│  │
│  │ Session  │              │ API Bridge   │  │
│  │ Parser   │              │ (optional)   │  │
│  └────┬─────┘              └──────────────┘  │
│       │                                      │
│  ┌────┴──────────────────────────────────┐   │
│  │        SwiftData Persistence          │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        │
   ┌────┴─────────────┐
   │ ~/.claude/        │
   │   projects/       │
   │     */sessions/   │
   │       *.jsonl     │
   └──────────────────┘
```

### 권한 계층 모델 (Graceful Degradation)

| 권한 레벨 | 사용 가능 기능 | 필요 권한 |
|-----------|--------------|----------|
| **Tier 0** (무권한) | 집중 타이머, 수동 세션 메모, 수동 작업 추적 | 없음 |
| **Tier 1** (파일 접근) | Claude Code 세션 자동 탐지, 컨텍스트 카드 | `~/.claude/` 읽기 (비샌드박스) |
| **Tier 2** (Accessibility) | 앱 전환 자동 감지, 주의산만 추적 | Accessibility API 권한 |

---

## 4. Implementation Steps

### Phase 1: 프로젝트 세팅 및 앱 쉘 (Step 1-4)

**Step 1: Xcode 프로젝트 생성**
- macOS App 프로젝트 (SwiftUI lifecycle)
- `LSUIElement = YES` (Dock 아이콘 없이 메뉴바만)
- 번들 ID: `com.adhd-dev.focus` (가칭)
- 최소 타겟: macOS 14.0 (Sonoma)
- Hardened Runtime 활성화
- 파일: `ADHDDev.xcodeproj`, `ADHDDevApp.swift`

**Step 2: 메뉴바 앱 기본 구조**
- `MenuBarExtra` (SwiftUI native, macOS 13+) 사용
- 메뉴바 아이콘: SF Symbols 기반 (`brain.head.profile` 등)
- 팝오버 스타일 메인 뷰 (클릭 시 펼쳐지는 패널)
- 파일: `ADHDDevApp.swift`, `MenuBarView.swift`

**Step 3: SwiftData 모델 정의**
- `FocusSession` 모델: 집중 세션 기록
- `ClaudeSession` 모델: Claude Code 세션 정보
- `ActivityRecord` 모델: 앱 전환 기록
- `UserPreference` 모델: 사용자 설정
- 버전드 스키마 (마이그레이션 지원)
- 파일: `Models/FocusSession.swift`, `Models/ClaudeSession.swift`, `Models/ActivityRecord.swift`

**Step 4: 로그인 항목 등록**
- `SMAppService.mainApp.register()` 사용
- 설정에서 on/off 토글
- 파일: `Services/LaunchAtLoginService.swift`

### Phase 2: Claude Code 세션 트래커 (Step 5-8)

**Step 5: Claude 세션 파일 파서**
- `~/.claude/projects/` 디렉토리 구조 파싱
- `sessions-index.json` 읽기
- `.jsonl` 세션 트랜스크립트 파싱 (마지막 N개 교환)
- 불완전/손상된 파일 핸들링 (세션 중 크래시 대비)
- 추상화 레이어로 감싸기 (Claude Code 내부 포맷 변경 대비)
- 파일: `Services/ClaudeSessionParser.swift`, `Models/ParsedExchange.swift`

**Step 6: 파일시스템 감시 서비스**
- `DispatchSource.makeFileSystemObjectSource` 또는 FSEvents API 사용
- `~/.claude/projects/` 하위 변경 감지
- 새 세션 생성, 세션 업데이트 이벤트 발행
- 디바운스 처리 (빈번한 파일 변경 시 과도한 업데이트 방지)
- 파일: `Services/FileWatcherService.swift`

**Step 7: 세션 목록 뷰**
- 활성/최근 세션 목록 (프로젝트명, 마지막 활동 시간, 상태)
- 인지부하 이론 적용: 최대 5개 세션 우선 표시 (작업기억 용량 고려)
- 세션 상태 아이콘: 활성(초록), 대기중(노랑), 비활성(회색)
- 파일: `Views/SessionListView.swift`, `Views/SessionRowView.swift`

**Step 8: "어디까지 했더라?" 컨텍스트 카드**
- 세션 클릭 시 마지막 2-3개 교환 내역 표시
- 사용자 프롬프트와 Claude 응답 요약
- 빠른 복귀 지원: "이 세션으로 돌아가기" 버튼 (해당 터미널로 포커스 이동, Tier 2)
- 파일: `Views/ContextCardView.swift`

### Phase 3: 집중 타이머 엔진 (Step 9-12)

**Step 9: 타이머 엔진 코어**
- 유연한 인터벌 설정 (5분~90분, 기본값 25분/5분)
- 연구 기반 프리셋 제공: 25/5 (포모도로), 52/17 (DeskTime 연구), 90/20 (울트라디안 리듬)
- 시스템 슬립 처리: 뚜껑 닫힘 시 타이머 자동 일시정지
- `Date` 기반 계산 (Timer 틱이 아닌 절대 시간 비교로 슬립 안전)
- 파일: `Services/TimerEngine.swift`

**Step 10: 플로우 보호 모드**
- 집중 세션 중 사용자가 "몰입 상태"로 보일 때 타이머 인터럽트 억제
- 조건: 터미널/에디터 앱에 연속 N분 이상 체류 시 (Tier 2)
- Tier 0에서는 수동 "플로우 모드" 토글 제공
- 파일: `Services/FlowProtectionService.swift`

**Step 11: 타이머 UI**
- 메뉴바 아이콘에 남은 시간 표시 (선택적)
- 팝오버에 원형 프로그레스 + 현재 상태 (집중/휴식)
- 완료 시 부드러운 알림 (macOS 알림, 소리 선택 가능)
- DND(방해금지) 모드 감지: DND 활성 시 알림 대신 아이콘 변경으로 대체
- 파일: `Views/TimerView.swift`, `Views/TimerProgressView.swift`

**Step 12: 세션 통계 (간단)**
- 오늘의 집중 시간 합계
- 완료한 세션 수
- 작은 완료 신호 제공 (도파민 보상 루프: 세션 완료 시 미니 축하 애니메이션)
- 파일: `Views/StatsView.swift`

### Phase 4: 활동 인식 모듈 (Step 13-16)

**Step 13: 앱 전환 감지 (Tier 2)**
- `NSWorkspace.shared.frontmostApplication` 관찰
- `NSWorkspace.didActivateApplicationNotification` 구독
- 디바운스: 2초 미만 체류는 무시 (Cmd+Tab 스크롤 방지)
- 앱 번들 ID만 기록 (윈도우 타이틀, URL 절대 수집 안함 - 프라이버시 원칙)
- 파일: `Services/ActivityDetector.swift`

**Step 14: Accessibility 권한 관리**
- 권한 상태 확인: `AXIsProcessTrusted()`
- 권한 미부여 시 기능 비활성화 (크래시 없이 graceful degradation)
- 설정에서 권한 요청 안내 (System Settings 딥링크)
- 권한 변경 감지 및 실시간 기능 활성화
- 파일: `Services/AccessibilityPermissionService.swift`

**Step 15: 앱 분류 시스템**
- 기본 분류 제공:
  - 생산적: Terminal, iTerm2, VS Code, Xcode, IntelliJ 등 (번들 ID 기반)
  - 중립: Finder, System Settings 등
  - 주의산만: 사용자 설정 (기본값 없음 - 판단하지 않기 원칙)
- 사용자가 직접 앱 분류 편집 가능
- 파일: `Services/AppClassifier.swift`, `Views/AppClassificationView.swift`

**Step 16: 활동 요약 뷰**
- "터미널에서 떨어져 있던 시간" 표시 (판단적 표현 배제)
- 간단한 일일 타임라인 (앱별 체류 시간 바 차트)
- 자기인식 도구로서의 데이터 - "오늘 나는 이렇게 시간을 썼구나"
- 파일: `Views/ActivitySummaryView.swift`

### Phase 5: 도파민 아키텍처 (Step 17-21)

**Step 17: DopamineService 코어**
- 이벤트 구독 허브: `FileWatcherService`, `TimerEngine`, `ActivityDetector`의 이벤트를 통합 수신
- `SignalEmitter`: 신호 빈도 제한 (5분/1회 두드러진 신호), 과자극 감지 로직
- 신호 타입 정의: `IconPulse`, `Badge`, `Sound`, `CardUpdate`, `IconState`
- 마스터 토글: "보상 신호: 켜기 / 은은하게 / 끄기"
- 파일: `Services/DopamineService.swift`

**Step 18: AdaptiveEngine (적응형 엔진)**
- 기준선 수집기: 첫 7일간 5개 입력 신호의 평균/분산 기록
- 규칙 엔진: 임계값 기반 4개 출력 파라미터 조절 (ML 아님)
- 하루 1회 재계산 (자정), 파라미터 변경 범위 제한 (0.5x~1.5x)
- "나쁜 날" 감지: 60분 내 생산적 앱 < 10분 → 지지적 침묵 모드
- "앱 자체가 주의산만" 감지: 팝오버 3회+/10분 → 통계 숨김
- SwiftData에 `AdaptiveBaseline` 모델 저장 (30일 지수 가중 감쇠)
- 파일: `Services/AdaptiveEngine.swift`, `Models/AdaptiveBaseline.swift`

**Step 19: Momentum Pulse + Completion Ripple 구현**
- Momentum Pulse: `.jsonl` 변경 → 아이콘 0.3초 페이드 + 피보나치 간격 뱃지
- Completion Ripple: 타이머 완료 → 원형 채움 애니메이션 + 선택적 시스템 사운드
- 세션 길이별 적응형 강도 (짧은 세션: 아이콘만, 긴 세션: 사운드 포함)
- 연속 완료 표시: "3세션째" (축하가 아닌 중립적 사실)
- 파일: `Views/CompletionRippleView.swift`, 아이콘 애니메이션 로직

**Step 20: Context Warmth + Rhythm Anchor 구현**
- Context Warmth: 세션 행에 활동 시간 기반 색온도 (amber → gray 그라데이션)
- 세션 자동 정렬: 사용자 복귀 패턴 학습 기반 (AdaptiveEngine 연동)
- Rhythm Anchor: 메뉴바 아이콘 3단계 일간 상태 (오전/오후/저녁)
- 시간 체크포인트: 하루 최대 3회, 피크 시간대 자동 억제
- 과집중 알림: 90분+ 연속 집중 시 1회 알림, 무시 시 30분 후까지 재알림 없음
- 파일: `Views/SessionRowView.swift` 색상 로직, `Services/DopamineService.swift`

**Step 21: Return Bridge (복귀 다리) 구현**
- Tier 2 전용: 생산적 앱 이탈 2분+ 후 아이콘 상태 변화 (느린 전환, 2초+)
- 팝오버 첫 화면에 "돌아갈 곳" 카드 (마지막 세션 컨텍스트)
- 원클릭 터미널 포커스 이동
- 적응형: 빠른 복귀(< 3분) 패턴이면 아이콘 변화 생략
- 긴 이탈(> 15분) 후에는 상세 컨텍스트 카드 (마지막 3개 교환)
- 절대 이탈 시간 표시 없음, 판단 없음
- 파일: `Views/ReturnBridgeView.swift`, `Services/DopamineService.swift`

### Phase 6: 설정 및 온보딩 (Step 22-24)

**Step 22: 설정 화면**
- 일반: 로그인 시 시작, 메뉴바 아이콘 스타일
- 타이머: 기본 인터벌, 프리셋, 소리
- 도파민: 보상 신호 (켜기/은은하게/끄기), 패턴 초기화 버튼
- 활동: 앱 분류 편집, 디바운스 시간
- 프라이버시: 데이터 보존 기간, 전체 삭제 버튼
- 파일: `Views/SettingsView.swift`

**Step 23: 온보딩 플로우**
- 3단계 간결한 온보딩:
  1. 앱 소개 + 핵심 가치 ("당신의 외부 작업기억")
  2. Claude Code 세션 감지 설명 + 파일 접근 안내
  3. Accessibility 권한 요청 (선택적, 스킵 가능)
- 파일: `Views/OnboardingView.swift`

**Step 24: 프라이버시 정책 및 데이터 관리**
- 명시적 "No Telemetry" 정책
- 모든 데이터 로컬 저장 (네트워크 요청 없음, 자동 업데이트 제외)
- 데이터 보존 기간 설정 (기본 30일, 사용자 조절 가능)
- 전체 데이터 삭제 기능
- 파일: `Services/DataRetentionService.swift`

### Phase 7: 빌드 및 배포 (Step 25-26)

**Step 25: 빌드 파이프라인**
- Xcode Archive + Notarization (`notarytool`)
- DMG 패키징
- Sparkle framework 통합 (자동 업데이트)
- appcast.xml 호스팅 (GitHub Releases)
- 파일: `Scripts/build.sh`, `Scripts/notarize.sh`

**Step 26: 테스트 전략**
- Unit Tests: 세션 파서, 타이머 엔진, 앱 분류기, AdaptiveEngine 규칙, SignalEmitter 빈도 제한
- UI Tests: 온보딩 플로우, 설정 화면, CompletionRipple 애니메이션
- Integration Tests: 파일 감시 + 세션 파서 연동, DopamineService 이벤트 파이프라인
- 도파민 특화 Tests: 과자극 감지(3회 무시 → 조용모드), 나쁜 날 감지, 기준선 7일 불변성, 마스터 킬스위치
- 수동 테스트: Accessibility 권한 시나리오 (권한 있음/없음/취소)

---

## 5. Acceptance Criteria

### 기능별 검증 기준

| # | 기준 | 측정 방법 |
|---|------|----------|
| AC-1 | 새 Claude Code 세션이 시작 후 5초 이내에 앱에 표시 | 타이머 측정 테스트 |
| AC-2 | 세션 클릭 시 마지막 3개 교환 내역이 1초 이내 로드 | UI 반응 시간 측정 |
| AC-3 | 집중 타이머가 5분~90분 범위에서 자유롭게 설정 가능 | 설정 UI 테스트 |
| AC-4 | 시스템 슬립 후 깨어났을 때 타이머가 올바르게 일시정지 상태 | 슬립/웨이크 시나리오 테스트 |
| AC-5 | Accessibility 권한 없이 Tier 0 기능이 정상 동작 | 권한 미부여 상태 테스트 |
| AC-6 | 앱 전환 감지 시 2초 미만 체류는 무시 | 디바운스 단위 테스트 |
| AC-7 | CPU 사용량 평균 1% 미만, 메모리 50MB 미만 | `powermetrics`, Instruments 프로파일링 |
| AC-8 | 앱 시작 후 ready 상태까지 2초 이내 | 콜드 스타트 측정 |
| AC-9 | 손상된 .jsonl 파일을 만나도 크래시 없이 처리 | 퍼즈 테스트 |
| AC-10 | DND 모드에서 알림 대신 아이콘 변경으로 대체 | DND 시나리오 테스트 |
| AC-11 | 데이터 전체 삭제 시 모든 ActivityRecord/FocusSession 완전 제거 | 삭제 후 DB 검증 |
| AC-12 | 앱이 네트워크 요청을 하지 않음 (Sparkle 업데이트 제외) | Network Link Conditioner 오프라인 테스트 |
| AC-13 | 도파민 신호가 이벤트 발생 후 2초 이내 표시 | FSEvent 타임스탬프 vs UI 변경 타임스탬프 비교 |
| AC-14 | 25분 집중 세션 중 두드러진 신호 최대 5회, 최소 1회 | 세션별 신호 이벤트 카운트 로깅 |
| AC-15 | 사용자가 3회 연속 신호 무시 시 빈도 50% 이상 감소 | 신호-상호작용 로그 + 빈도 변화 검증 |
| AC-16 | UI 텍스트에 손실 프레이밍/비교/판단 표현 없음 | 전체 문자열 감사 (자동화 가능) |
| AC-17 | 60분 내 생산적 앱 < 10분일 때 5분 이내 능동적 신호 억제 | 저활동 시뮬레이션 + 신호 타이밍 검증 |
| AC-18 | 도파민 시스템이 추가 인터랙티브 요소 0개 (모든 신호 수동적) | UI 감사 — 도파민 레이어에 버튼/토글/해제 알림 없음 |
| AC-19 | 기준선 7일간 적응형 파라미터 변경 없음 (정적 기본값만) | 7일 내 AdaptiveEngine 출력 불변 검증 |
| AC-20 | 마스터 킬스위치 토글 후 1초 이내 모든 도파민 신호 중단 | 토글 off → 5분간 신호 0건 확인 |

---

## 6. Risks and Mitigations

| # | 리스크 | 영향도 | 완화 방법 |
|---|--------|-------|----------|
| R-1 | Claude Code 세션 파일 포맷 변경 | 높음 | 추상화 레이어 (`ClaudeSessionParser`) 분리. 파서만 교체 가능한 구조. 포맷 변경 감지 로직 추가 |
| R-2 | 사용자가 Accessibility 권한 거부 | 중간 | Tier 0 기능만으로도 유용한 앱 보장. 권한은 점진적 향상 |
| R-3 | ADHD 사용자가 모니터링을 감시로 느낌 | 높음 | "판단하지 않기" 원칙 전체 적용. 앱 이름/표현 배제. 사용자 연구 필수 (v2 넛지 전) |
| R-4 | tmux/screen에서 다중 Claude 세션 감지 실패 | 중간 | 프로세스 트리 워킹으로 터미널-Claude 매핑. v1에서는 파일 기반 감지로 우회 |
| R-5 | 포모도로 타이머가 ADHD 사용자에게 불안 유발 | 중간 | "유연한 인터벌" + "플로우 보호 모드"로 경직성 제거. 강제 중단 없음 |
| R-6 | 배터리 소모 | 중간 | 이벤트 기반 감시 (폴링 아님). CPU < 1% 목표. Energy Impact 프로파일링 |
| R-7 | Full-screen 앱에서 메뉴바 숨겨짐 | 낮음 | 알림으로 대체. v2에서 플로팅 위젯 옵션 고려 |
| R-8 | 멀티 디스플레이/Spaces 환경 | 낮음 | v1에서는 전면 앱만 추적 (디스플레이 무관). 윈도우 위치 추적은 v2+ |

---

## 7. Verification Steps

1. **빌드 검증**: `xcodebuild clean build` 성공, 0 warnings 목표
2. **Notarization 검증**: `notarytool` 통과, Gatekeeper에서 실행 허용
3. **권한 시나리오 테스트**:
   - Tier 0: 모든 권한 거부 상태에서 타이머/수동 기능 정상 동작
   - Tier 1: `~/.claude/projects/` 접근 가능 시 세션 자동 탐지
   - Tier 2: Accessibility 활성 시 앱 전환 감지
4. **성능 프로파일링**: Instruments로 CPU/Memory/Energy 측정, AC-7 기준 충족
5. **슬립/웨이크 테스트**: 타이머 활성 중 뚜껑 닫고 열기 -> 타이머 정확성 검증
6. **파서 안정성**: 비정상 .jsonl 파일 10개 이상으로 크래시 없음 검증
7. **UI 접근성**: VoiceOver로 전체 UI 네비게이션 가능 확인

---

## 8. File Structure (Proposed)

```
ADHDDev/
├── ADHDDev.xcodeproj
├── ADHDDev/
│   ├── ADHDDevApp.swift              # App entry point, MenuBarExtra
│   ├── Models/
│   │   ├── FocusSession.swift         # SwiftData 집중 세션 모델
│   │   ├── ClaudeSession.swift        # SwiftData Claude 세션 모델
│   │   ├── ActivityRecord.swift       # SwiftData 활동 기록 모델
│   │   ├── ParsedExchange.swift       # 파싱된 대화 교환 구조체
│   │   └── AppCategory.swift          # 앱 분류 열거형/모델
│   ├── Services/
│   │   ├── ClaudeSessionParser.swift  # .jsonl 파서 (추상화 레이어)
│   │   ├── FileWatcherService.swift   # FSEvents 기반 파일 감시
│   │   ├── TimerEngine.swift          # 집중 타이머 코어 로직
│   │   ├── FlowProtectionService.swift # 플로우 보호 모드
│   │   ├── ActivityDetector.swift     # 앱 전환 감지
│   │   ├── AppClassifier.swift        # 앱 분류 로직
│   │   ├── DopamineService.swift      # 도파민 아키텍처 코어 (적응형 엔진 + 신호 방출)
│   │   ├── AdaptiveEngine.swift       # 기준선 학습 + 규칙 기반 파라미터 조절
│   │   ├── AccessibilityPermissionService.swift
│   │   ├── LaunchAtLoginService.swift
│   │   └── DataRetentionService.swift
│   ├── Views/
│   │   ├── MenuBarView.swift          # 메인 팝오버 뷰
│   │   ├── SessionListView.swift      # 세션 목록
│   │   ├── SessionRowView.swift       # 세션 행
│   │   ├── ContextCardView.swift      # "어디까지 했더라?" 카드
│   │   ├── ReturnBridgeView.swift     # 복귀 다리 (돌아갈 곳 카드)
│   │   ├── CompletionRippleView.swift # 완료 파문 애니메이션
│   │   ├── TimerView.swift            # 타이머 메인 뷰
│   │   ├── TimerProgressView.swift    # 원형 프로그레스
│   │   ├── StatsView.swift            # 통계 뷰
│   │   ├── ActivitySummaryView.swift  # 활동 요약
│   │   ├── AppClassificationView.swift # 앱 분류 설정
│   │   ├── SettingsView.swift         # 설정 화면
│   │   └── OnboardingView.swift       # 온보딩
│   ├── Resources/
│   │   └── Assets.xcassets
│   └── Info.plist
├── ADHDDevTests/
│   ├── ClaudeSessionParserTests.swift
│   ├── TimerEngineTests.swift
│   ├── AppClassifierTests.swift
│   └── ActivityDetectorTests.swift
└── Scripts/
    ├── build.sh
    └── notarize.sh
```

---

## 9. Key Architectural Decisions

### AD-1: 직접 배포 (App Store X)
- **결정**: Notarized DMG로 직접 배포
- **이유**: App Store 샌드박스가 Accessibility API 접근을 차단하여 핵심 기능 (앱 전환 감지) 불가
- **결과**: Sparkle 프레임워크로 자체 업데이트 관리 필요

### AD-2: 파일 기반 세션 탐지 (프로세스 기반 X)
- **결정**: `~/.claude/projects/` FSEvents 감시를 1차 탐지 방법으로 사용
- **이유**: 프로세스 기반은 터미널 에뮬레이터별 차이가 크고, 파일 기반이 더 안정적이며 추가 권한 불필요
- **결과**: SSH 원격 실행, Docker 컨테이너 내 실행은 감지 불가 (문서화)

### AD-3: 번들 ID 기반 앱 추적 (윈도우 타이틀/URL X)
- **결정**: `NSWorkspace.frontmostApplication.bundleIdentifier`만 수집
- **이유**: 프라이버시 원칙. 윈도우 타이틀이나 URL 수집은 감시 도구로 변질 위험
- **결과**: "Chrome에서 뭘 했는지"는 알 수 없지만, 이는 의도적 설계

### AD-4: SwiftData (Core Data X, 플랫 파일 X)
- **결정**: SwiftData를 persistence 레이어로 사용
- **이유**: macOS 14+ 타겟에서 최신 API, Swift 네이티브, 버전드 스키마 마이그레이션 기본 지원
- **결과**: macOS 14 미만 미지원 (수용 가능)

---

## 10. Open Questions (계획 후 결정 필요)

- [ ] 앱 이름 및 브랜딩 결정 (현재 가칭 "ADHD-Dev")
- [ ] v1 지원 터미널 에뮬레이터 범위 (Terminal.app + iTerm2 권장)
- [ ] 수익화 모델 (무료, 프리미엄, 일회성 구매, 구독)
- [ ] ADHD 개발자 사용자 연구 일정 (v2 넛지 기능 전 필수)
- [ ] Claude Code `--resume` 플래그 통합 여부 (보안 고려 필요)
- [ ] 앱 아이콘 및 디자인 시스템

---

*Plan created: 2026-03-24*
*Updated: 2026-03-24 — Dopamine Architecture (Section 3) 추가, Phase 5 신설, 26 steps across 7 phases*
