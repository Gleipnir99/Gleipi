# gleipi 프로젝트 폴더 세팅 가이드

## 최종 폴더 구조

```
gleipi/
│
├── index.html                  ← 앱 진입점 HTML
├── package.json                ← 패키지 목록
├── vite.config.ts              ← Vite 빌드 설정
├── tsconfig.json               ← TypeScript 설정
├── capacitor.config.ts         ← iOS 설정
│
├── src-tauri/                  ← Windows 데스크탑 (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       └── lib.rs
│
└── src/                        ← React 공통 코드
    ├── main.tsx                ← React 진입점
    ├── App.tsx                 ← 라우팅
    │
    ├── types/
    │   └── index.ts            ← 공용 타입 정의
    │
    ├── utils/
    │   ├── date.ts             ← 날짜 유틸
    │   └── platform.ts         ← iOS/Windows 분기
    │
    ├── services/
    │   ├── storage.ts          ← 저장소 추상 레이어
    │   ├── notification.ts     ← 알림 서비스
    │   └── speech.ts           ← 음성인식 (iOS 전용)
    │
    ├── store/
    │   ├── todoStore.ts        ← Todo 전역 상태
    │   ├── categoryStore.ts    ← 카테고리 전역 상태
    │   └── calendarStore.ts    ← 캘린더 전역 상태
    │
    ├── screens/
    │   ├── TodoScreen.tsx      ← 할 일 목록 화면
    │   ├── CalendarScreen.tsx  ← 캘린더 화면
    │   └── SettingsScreen.tsx  ← 설정 화면
    │
    ├── components/
    │   ├── Calendar/
    │   │   ├── MonthView.tsx
    │   │   ├── WeekView.tsx
    │   │   └── DayView.tsx
    │   ├── TodoItem/
    │   │   └── TodoItem.tsx
    │   └── TodoFormModal/
    │       └── TodoFormModal.tsx
    │
    └── styles/
        └── global.css          ← 전체 스타일
```

---

## 세팅 순서

### 1단계 — 폴더 만들기

바탕화면이나 원하는 위치에 `gleipi` 폴더를 만들고,
위 구조대로 하위 폴더들을 만들어주세요.

```
gleipi/
  src/
    types/
    utils/
    services/
    store/
    screens/
    components/
      Calendar/
      TodoItem/
      TodoFormModal/
    styles/
  src-tauri/
    src/
```

### 2단계 — 파일 붙여넣기

대화에서 받은 각 파일 내용을 해당 경로에 저장하세요.
파일 목록과 경로는 아래와 같습니다.

| 파일 | 경로 |
|------|------|
| package.json | gleipi/package.json |
| index.html | gleipi/index.html |
| vite.config.ts | gleipi/vite.config.ts |
| tsconfig.json | gleipi/tsconfig.json |
| capacitor.config.ts | gleipi/capacitor.config.ts |
| main.tsx | gleipi/src/main.tsx |
| App.tsx | gleipi/src/App.tsx |
| index.ts (타입) | gleipi/src/types/index.ts |
| date.ts | gleipi/src/utils/date.ts |
| platform.ts | gleipi/src/utils/platform.ts |
| storage.ts | gleipi/src/services/storage.ts |
| notification.ts | gleipi/src/services/notification.ts |
| speech.ts | gleipi/src/services/speech.ts |
| todoStore.ts | gleipi/src/store/todoStore.ts |
| categoryStore.ts | gleipi/src/store/categoryStore.ts |
| calendarStore.ts | gleipi/src/store/calendarStore.ts |
| TodoScreen.tsx | gleipi/src/screens/TodoScreen.tsx |
| CalendarScreen.tsx | gleipi/src/screens/CalendarScreen.tsx |
| SettingsScreen.tsx | gleipi/src/screens/SettingsScreen.tsx |
| MonthView.tsx | gleipi/src/components/Calendar/MonthView.tsx |
| WeekView.tsx | gleipi/src/components/Calendar/WeekView.tsx |
| DayView.tsx | gleipi/src/components/Calendar/DayView.tsx |
| TodoItem.tsx | gleipi/src/components/TodoItem/TodoItem.tsx |
| TodoFormModal.tsx | gleipi/src/components/TodoFormModal/TodoFormModal.tsx |
| global.css | gleipi/src/styles/global.css |
| tauri.conf.json | gleipi/src-tauri/tauri.conf.json |
| Cargo.toml | gleipi/src-tauri/Cargo.toml |
| main.rs | gleipi/src-tauri/src/main.rs |
| lib.rs | gleipi/src-tauri/src/lib.rs |

### 3단계 — 패키지 설치 및 실행

```bash
# 터미널에서 프로젝트 폴더로 이동
cd gleipi

# 패키지 설치
npm install

# 브라우저에서 실행
npm run dev
```

---

## 빠른 세팅 팁

VS Code를 쓴다면 폴더를 열고 터미널(Ctrl+`) 에서
바로 명령어를 실행할 수 있어서 편합니다.
