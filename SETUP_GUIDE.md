# gleipi — 설치 및 빌드 가이드

---

## 0. 전체 구조 한눈에 보기

```
gleipi/
├── src/                    ← React 공통 코드 (iOS + Windows 공유)
├── src-tauri/              ← Windows 데스크탑 전용 (Rust)
├── ios/                    ← iOS 앱 (capacitor sync 후 자동 생성)
├── capacitor.config.ts     ← iOS 빌드 설정
├── vite.config.ts          ← 웹 빌드 설정
└── package.json
```

---

## 1. 사전 준비 — 공통

### Node.js 설치 (v20 이상)
```bash
# 설치 확인
node -v   # v20.x.x 이상이어야 함
npm -v
```
→ 없으면 https://nodejs.org 에서 LTS 버전 설치

### 프로젝트 패키지 설치
```bash
cd gleipi
npm install
```

### 개발 서버 실행 (브라우저에서 미리보기)
```bash
npm run dev
# → http://localhost:5173 에서 확인
```

---

## 2. iOS 빌드 (Mac 필수)

> iOS 빌드는 **반드시 Mac** 에서만 가능합니다.
> Mac이 없으면 GitHub Actions 같은 CI/CD를 사용해야 합니다.

### 2-1. Mac 환경 준비

**Xcode 설치**
```bash
# App Store에서 Xcode 설치 후
xcode-select --install
```

**CocoaPods 설치**
```bash
sudo gem install cocoapods
# 또는
brew install cocoapods
```

**Capacitor CLI 설치**
```bash
npm install -g @capacitor/cli
```

### 2-2. iOS 프로젝트 초기화 (최초 1회만)
```bash
# 1. 웹 앱 빌드
npm run build

# 2. iOS 플랫폼 추가
npx cap add ios

# 3. 빌드 결과물을 iOS 프로젝트에 동기화
npx cap sync ios
```
→ `ios/` 폴더가 자동 생성됩니다.

### 2-3. Xcode에서 열기
```bash
npx cap open ios
```
→ Xcode가 열리면:
1. 왼쪽 프로젝트 트리에서 `App` 클릭
2. **Signing & Capabilities** 탭 → Team 선택 (Apple ID 로그인 필요)
3. Bundle Identifier: `com.gleipi.app` 확인

### 2-4. 시뮬레이터 실행
```bash
# Xcode에서 상단 ▶ 버튼 클릭 (iPhone 시뮬레이터 선택)
# 또는 터미널에서
npx cap run ios
```

### 2-5. 실제 iPhone에 설치
1. iPhone을 Mac에 USB 연결
2. iPhone에서 "이 컴퓨터를 신뢰하시겠습니까?" → 신뢰
3. Xcode 상단 기기 선택 → 내 iPhone 선택 → ▶ 클릭
4. iPhone 설정 → 일반 → VPN 및 기기 관리 → 개발자 앱 신뢰

### 2-6. 코드 수정 후 반영 방법
```bash
npm run build          # React 앱 다시 빌드
npx cap sync ios       # iOS 프로젝트에 동기화
npx cap open ios       # Xcode에서 다시 실행
```

---

## 3. Windows 데스크탑 빌드 (Tauri)

> Windows PC 또는 Mac에서 크로스 컴파일 가능합니다.
> **Windows에서 빌드하는 것을 권장**합니다.

### 3-1. Windows 환경 준비

**Rust 설치**
```bash
# https://rustup.rs 에서 설치하거나 아래 명령어 실행
winget install Rustlang.Rustup
# 설치 후 터미널 재시작
rustc --version   # 확인
```

**Visual Studio C++ Build Tools 설치**
```bash
winget install Microsoft.VisualStudio.2022.BuildTools
# 설치 시 "C++를 사용한 데스크톱 개발" 워크로드 체크
```

**WebView2 런타임** (Windows 11은 기본 내장, Windows 10은 설치 필요)
```
https://developer.microsoft.com/ko-kr/microsoft-edge/webview2/
```

### 3-2. Tauri CLI 설치
```bash
npm install -g @tauri-apps/cli@next
```

### 3-3. 개발 모드 실행 (핫리로드)
```bash
npm run tauri dev
# → 데스크탑 창이 열리고 코드 수정 시 자동 반영
```

### 3-4. Windows 설치 파일(.exe/.msi) 빌드
```bash
npm run tauri build
# → src-tauri/target/release/bundle/ 폴더에 설치 파일 생성
# → .msi (Windows Installer) 또는 .exe (NSIS) 형태로 생성
```

---

## 4. 개발 워크플로우 (일상적인 작업)

```bash
# 1. 코드 수정
# src/ 폴더 내 React 파일 수정

# 2-A. 브라우저에서 빠르게 확인 (가장 빠름)
npm run dev

# 2-B. iOS 반영
npm run build && npx cap sync ios
# → Xcode에서 ▶ 다시 클릭

# 2-C. Windows 반영
npm run tauri dev
# → 저장 시 자동 반영됨
```

---

## 5. 알림 권한 설정

### iOS
- 앱 첫 실행 시 자동으로 권한 팝업이 뜹니다
- 설정 화면의 "알림 권한 요청" 버튼으로도 요청 가능
- 거부했다면: iPhone 설정 → gleipi → 알림 → 허용

### Windows
- Windows 알림 센터에서 자동 허용
- 차단된 경우: Windows 설정 → 시스템 → 알림 → gleipi → 켜기

---

## 6. 자주 발생하는 오류

| 오류 | 원인 | 해결 |
|------|------|------|
| `pod install` 실패 | CocoaPods 버전 문제 | `sudo gem update cocoapods` |
| `cap sync` 후 빌드 오류 | node_modules 캐시 | `rm -rf node_modules && npm install` |
| Tauri `WEBVIEW2_NOT_FOUND` | WebView2 미설치 | 위 링크에서 설치 |
| Rust 컴파일 오류 | Rust 버전 구버전 | `rustup update stable` |
| iOS 서명 오류 | Apple Team 미설정 | Xcode Signing 탭에서 팀 설정 |

---

## 7. 백엔드 연동 준비 (Phase 5 대비)

나중에 Firebase나 Supabase를 연동할 때는
`src/services/storage.ts` 파일 하나만 수정하면 됩니다.

```typescript
// 현재: localStorage
// 변경: Firebase Firestore

import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    const snap = await getDoc(doc(db, 'users', userId, 'data', key))
    return snap.exists() ? snap.data() as T : null
  },
  async set<T>(key: string, value: T): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'data', key), value)
  },
  ...
}
// 나머지 코드는 전혀 수정 불필요
```

---

## 8. Phase 로드맵 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 타입 · 스토어 · Todo CRUD · 로컬저장 | ✅ 완료 |
| Phase 2 | 캘린더 뷰 · 카테고리 관리 · CSS | ✅ 완료 |
| Phase 3 | Capacitor/Tauri 빌드 설정 · 알림 | ✅ 완료 |
| Phase 4 | 앱스토어 배포 준비 · 아이콘/스플래시 | 예정 |
| Phase 5 | 백엔드(Firebase/Supabase) 연동 | 예정 |
