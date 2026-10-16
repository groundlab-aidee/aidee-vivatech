type StepSectionHeaderProps = {
  description: string
  title: string
}

export function StepSectionHeader({
  description,
  title,
}: StepSectionHeaderProps) {
  return (
    <section className="step-section-header flex w-full flex-col items-center text-center">
      <h2 className="step-section-header__title">{title}</h2>
      <p className="step-section-header__description">{description}</p>
    </section>
  )
}
