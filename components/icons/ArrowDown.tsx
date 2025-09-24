type Props = {
  className?: string
}

const ArrowDown = (props: Props) => {
  return (
    <svg width="11" height="7" viewBox="0 0 11 7" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={props.className}>
        <path
            d="M10.0436 1.30717C10.0436 1.30717 6.81378 5.69257 5.65814 5.69257C4.50243 5.69257 1.27271 1.30713 1.27271 1.30713"
            className={`stroke-[#9366B7] dark:stroke-[#F8F8F8] ${props.className}`}
            strokeWidth="1.09636"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
  )
}

export default ArrowDown