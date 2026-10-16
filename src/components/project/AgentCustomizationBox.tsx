type AgentCustomizationBoxProps = {
  agentName: string
  completed: boolean
  onCustomize: () => void
  onEdit: () => void
}

export function AgentCustomizationBox({
  agentName,
  completed,
  onCustomize,
  onEdit,
}: AgentCustomizationBoxProps) {
  return (
    <section
      className="agent-customization-box relative flex min-h-44 flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      data-completed={completed}
    >
      <div className="agent-customization-box__header flex items-start justify-between gap-3">
        <p className="agent-customization-box__name min-w-0 font-semibold">
          {agentName}
        </p>
        {completed ? (
          <span className="agent-customization-box__badge shrink-0 whitespace-nowrap text-sm">
            ✓ 완료
          </span>
        ) : null}
      </div>
      <div className="agent-customization-box__actions flex flex-col gap-2">
        <button
          type="button"
          className="agent-customization-box__customize-button h-11 rounded-lg border border-zinc-200 bg-white px-3 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={completed}
          onClick={onCustomize}
        >
          {completed ? '커스터마이징 완료' : '커스터마이징 하기'}
        </button>
        <button
          type="button"
          className="agent-customization-box__edit-button h-11 rounded-lg border border-zinc-200 bg-white px-3 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!completed}
          onClick={onEdit}
        >
          수정하기
        </button>
      </div>
    </section>
  )
}
