import { useTokenImageUrl } from "@/hooks/token-image-provider"

interface CoinIconProps {
  size?: "sm" | "md" | "lg"
  className?: string
  style?: React.CSSProperties
}

export function CoinIcon({ size = "md", className = "", style = {} }: CoinIconProps) {
  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")
  const sizeClass = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }
  return (
    <div className={`${sizeClass[size]} ${className}`} style={style}>
      <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
    </div>
  )
} 