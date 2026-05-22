# UI 개발 규칙

## 기술 스택
- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Pretendard / Inter 폰트

## 레이아웃 원칙

### 전체 페이지 구조
- 최상위: `h-[100svh] overflow-hidden` (스크롤 없는 전체화면)
- 중앙 정렬: `flex items-center justify-center`
- 컨텐츠 최대 너비: `max-w-sm` (모바일/데스크탑 공통)
- 반응형 간격: `gap-6 sm:gap-8`, `px-4 sm:px-6`

### 절대 하지 말 것
- vw 단위 사용 금지 (텍스트 크기에 특히)
- absolute + left/top 수치 그대로 사용 금지 (피그마 코드 직접 붙여넣기 금지)
- 고정 px 너비로 레이아웃 잡기 금지 (w-[530px] 등)

### 피그마 → 코드 변환 규칙
- 피그마 전체 데스크탑 프레임을 화면 비율로 축소해서 구현하지 말 것
- 먼저 구현 대상 컴포넌트의 부모 컨테이너 기준을 코드에서 정할 것
  - 로그인/인증 UI처럼 compact form surface는 `max-w-sm` 기준으로 구현
  - 큰 작업 화면은 해당 화면의 정보 밀도와 반응형 breakpoint를 먼저 정한 뒤 구현
- 피그마에서 absolute 좌표보다 Auto Layout 구조를 우선 읽을 것
  - vertical/horizontal 방향 → `flex-col` / `flex`
  - item spacing → `gap-*`
  - padding → `p-*`, `px-*`, `py-*`
  - Fill container → `w-full` 또는 flex growth
  - Hug contents → 내용 크기 기반 레이아웃
  - alignment → `items-*`, `justify-*`, `text-*`
- absolute 배치 → 가능한 한 flex/grid 슬롯 구조로 재구성
- 고정 px 너비 → `w-full` (부모가 `max-w-*`로 제어)
- 버튼/입력처럼 반응형 부모 안에 들어가는 UI는 피그마의 고정 frame width를 복사하지 말 것
- 텍스트 크기/색상/폰트/radius/border/shadow/icon asset은 피그마 값을 우선 참고
- 피그마 원본 컴포넌트 크기와 코드 컴포넌트 크기가 다르면 spacing, icon, font도 같은 기준으로 함께 재해석할 것
  - 예: 피그마 버튼 높이 80px을 코드에서 `h-14`(56px)로 줄이면 40px icon은 약 28px, 27px gap은 약 19px부터 검토
  - 원본 gap만 그대로 복사해 compact UI에서 간격이 과장되지 않게 할 것
- 피그마와 동일한 고정 크기 재현이 필요한 경우에는 먼저 그 컴포넌트가 fixed fidelity 대상임을 명시하고, 반응형 변형은 별도로 설계할 것

### 피그마 작업 순서
1. 전체 화면이 아니라 구현 대상 frame/component를 먼저 확인
2. Auto Layout 방향, gap, padding, fill/hug/fixed, alignment를 읽음
3. 코드에서 부모 폭과 breakpoint 기준을 먼저 고정
4. flex/grid로 구조를 만들고 색상/타입/radius/shadow/icon을 반영
5. 브라우저에서 피그마와 시각 비교하며 spacing과 크기를 조정
6. 고정 좌표가 필요한 것처럼 보이면 먼저 슬롯 레이아웃으로 표현 가능한지 검토

## 텍스트 규칙
- 크기: px 고정 (text-sm, text-base, text-lg 등 Tailwind 토큰 우선)
- 줄간격: leading-5, leading-6, leading-relaxed 등 토큰 사용
- 색상: zinc 팔레트 우선 (zinc-500, zinc-700, zinc-900)
- 폰트: font-['Pretendard'] (한국어), font-['Inter'] (영문/숫자)

## 컴포넌트 규칙
- 버튼: rounded-lg border border-zinc-200 bg-white shadow-sm
- 버튼 내부 정렬은 텍스트 길이에 따라 icon 위치가 흔들리지 않게 슬롯 구조를 우선 사용
  - 단순 icon+label은 flex/grid와 gap으로 구현
  - icon과 label이 서로 독립된 정렬 위치를 가져야 하면 grid column 또는 relative 슬롯을 사용
  - 피그마의 `left/top` 수치를 그대로 복사해 button 자식을 배치하지 말 것
- disabled 상태 반드시 처리
- 에러 메시지: mt-2 text-sm text-red-600

## 컨텐츠 너비 제한 규칙

- 모든 컨텐츠(버튼, 텍스트, 로고)는 반드시 `max-w-sm` (384px) 컨테이너 안에 있어야 함
- 버튼은 w-full이어도 부모의 max-w-sm을 벗어나면 안 됨
- 피그마에서 버튼 너비가 크게 나와도 절대 그 px값 그대로 쓰지 말 것
- 로고 크기 기준: w-auto h-10 (높이 40px 고정)
- 버튼 높이: h-11 ~ h-14 사이

## 인증 UI 기준
- 로그인 UI는 `max-w-sm` compact form surface 기준으로 구현
- 피그마의 큰 desktop login button frame은 스타일 기준으로만 보고, width/height/spacing은 compact form 기준으로 함께 축소 검토
- social login button은 provider별 label과 icon asset을 데이터 매핑으로 연결
- social icon은 `public/assets/icons`의 실제 provider SVG를 사용하고 텍스트 badge로 대체하지 말 것
