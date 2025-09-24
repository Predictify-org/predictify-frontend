type Props = {
    className?: string
}

const StellarIcon = (props: Props) => {
  return (
    <div className={`h-[20px] flex items-center justify-center bg-black rounded-full p-1 w-[20px] ${props.className}`}>
        <svg xmlns="http://www.w3.org/2000/svg"  width="1em" height="1em" fill="#ffffff" viewBox="0 0 24 24">
            <path d="M12.283 1.851A10.154 10.154 0 0 0 1.876 12.775 1.85 1.85 0 0 1 .872 14.56L0 15.005v2.074l2.568-1.309.832-.424.82-.417 14.71-7.496 1.653-.842L24 4.85V2.776l-3.387 1.728-2.89 1.473-13.955 7.108a8.313 8.313 0 0 1 12.296-8.333l1.654-.843.247-.126a10.15 10.15 0 0 0-5.682-1.932M24 6.925 5.055 16.571l-1.653.844L0 19.15v2.072L3.378 19.5l2.89-1.473 13.97-7.117q.07.544.07 1.092A8.312 8.312 0 0 1 7.93 19.248l-.101.054-1.793.914a10.155 10.155 0 0 0 16.089-8.994 1.85 1.85 0 0 1 1.003-1.785L24 8.992z"></path>
        </svg>
    </div>
  )
}

export default StellarIcon