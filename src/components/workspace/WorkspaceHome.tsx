function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8 text-blue-600"
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M7 9.5A2.5 2.5 0 0 1 9.5 7h13A2.5 2.5 0 0 1 25 9.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 7 22.5v-13Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M10 22l5-5 3.25 3.25 1.75-1.75 2 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M13 12.5h6M16 9.5v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}

export function WorkspaceHome() {
  return (
    <div className="flex min-h-full flex-col items-center px-5 pb-12 pt-20 sm:px-8 lg:px-10 lg:pt-24">
      <h1 className="w-full max-w-[1498px] text-center text-3xl font-bold leading-[48px] text-neutral-900 sm:text-4xl sm:leading-[64px]">
        간단한 아이디어로 시작해 보세요.
      </h1>

      <div className="mt-12 flex w-full max-w-[1008px] flex-col gap-4">
        <button
          type="button"
          className="flex h-20 w-full items-center justify-start rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex items-start gap-4">
            <UploadIcon />
            <div className="flex flex-col gap-[3px]">
              <span className="text-sm font-medium leading-6 text-zinc-500">
                이미지 파일을 드래그 하거나 클릭해서 추가해주세요.
              </span>
              <span className="text-xs font-medium leading-6 text-neutral-400">
                최대 4개&nbsp;&nbsp;&nbsp;파일당 최대 용량
                10MB&nbsp;&nbsp;&nbsp;지원 형식: PNG, JPG, JPEG, WEBP
              </span>
            </div>
          </div>
        </button>

        <form className="flex min-h-20 w-full items-end justify-between overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-[0px_4px_3px_0px_rgba(0,0,0,0.10)]">
          <div className="flex min-w-0 flex-1 items-end gap-3">
            <button
              type="button"
              aria-label="첨부 파일 추가"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-gray-100"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-3xl bg-gradient-to-b from-zinc-500 to-zinc-500 text-2xl font-medium leading-none text-gray-100 shadow-[inset_0px_-1px_2px_0px_rgba(93,102,107,1.00)]">
                +
              </span>
            </button>
            <label className="sr-only" htmlFor="workspace-prompt">
              제품 아이디어 입력
            </label>
            <textarea
              id="workspace-prompt"
              rows={1}
              placeholder="어떤 제품을 만들고 싶은가요?"
              className="min-h-8 flex-1 resize-none border-0 bg-transparent py-2 text-xl font-medium leading-6 text-neutral-900 outline-none placeholder:text-neutral-400"
            />
          </div>
          <button
            type="submit"
            aria-label="전송"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-blue-600 transition hover:bg-blue-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <SendIcon />
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
