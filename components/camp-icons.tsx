import type { CSSProperties } from "react"

type IconType = "forest" | "beach" | "water" | "social" | "nft" | "team" | "startup" | "camp-logo"

interface CampIconProps {
  type: IconType
  size?: "sm" | "md" | "lg"
  className?: string
  style?: CSSProperties
}

export function CampIcon({ type, size = "md", className = "", style }: CampIconProps) {
  const sizeClass = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  if (type === "camp-logo") {
    return (
      <div className={`${sizeClass[size]} ${className}`} style={style}>
        <img src="/images/camp-logo.png" alt="PlanetEnglish Camp" className="w-full h-full object-contain" />
      </div>
    )
  }

  const iconMap: Record<Exclude<IconType, "camp-logo">, string> = {
    forest: "🌲",
    beach: "🏖️",
    water: "🏄‍♂️",
    social: "🎮",
    nft: "🖼️",
    team: "👥",
    startup: "🚀",
  }

  const icon = iconMap[type as Exclude<IconType, "camp-logo">] || "😊"

  return (
    <div
      className={`camp-icon relative flex items-center justify-center ${sizeClass[size]} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/10 rounded-full blur-[1px] z-0"></div>
      <div className="relative z-10 text-2xl sm:text-3xl md:text-4xl transform hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  )
}
