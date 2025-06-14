"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Coins,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  ChevronDown,
  Star,
  Trophy,
  Zap,
  Cpu,
  Network,
  Lock,
  Rocket,
  Globe,
  Code,
} from "lucide-react"
import Image from "next/image"

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
      const timer = setInterval(() => {
        setCount((prev) => {
          if (prev < target) {
            return Math.min(prev + Math.ceil(target / 50), target)
          }
          return target
        })
      }, 50)
      return () => clearInterval(timer)
    }, [target])

    return (
      <span>
        {count}
        {suffix}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(197, 225, 126, 0.1), transparent 40%)`,
          }}
        ></div>
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
            linear-gradient(rgba(197, 225, 126, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(197, 225, 126, 0.1) 1px, transparent 1px)
          `,
            backgroundSize: "50px 50px",
          }}
        ></div>
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-lime-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-lime-400/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/images/pecamp-logo.png"
                alt="PlanetEnglish PEcamp - английский лагерь"
                width={200}
                height={80}
                className="drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-all duration-300 hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]"
              />
            </div>
          </div>
          <Link href="/dashboard" passHref>
            <Button
              className="bg-gradient-to-r from-lime-400 to-green-400 hover:from-lime-300 hover:to-green-300 text-black font-bold rounded-full px-8 py-3 shadow-lg shadow-lime-400/25 hover:shadow-lime-400/40 transition-all duration-300 hover:scale-105"
            >
              <Network className="w-4 h-4 mr-2" />
              Дашборд
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-lime-400/20 to-green-400/20 backdrop-blur-sm border border-lime-400/30 rounded-full px-4 py-2 text-sm font-medium text-lime-300">
                  <Cpu className="w-4 h-4" />
                  Powered by Solana Blockchain
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
                  Добро пожаловать в{" "}
                  <span className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">
                    <Image src="/images/pecoin-token.png" alt="PEcoin" width={32} height={32} className="inline w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-1 sm:mr-2 rounded-full" />
                    PEcoin!
                  </span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-300 leading-relaxed">
                  Этим летом мы запускаем революционную механику — цифровая монета <Image src="/images/pecoin-token.png" alt="PEcoin" width={20} height={20} className="inline w-4 h-4 sm:w-5 sm:h-5 mr-1 rounded-full" />PEcoin станет частью лагерной игры.
                  Это реальный токен на блокчейне Solana, который откроет детям мир технологий будущего.
                </p>
                <div className="flex items-center gap-2 sm:gap-3 text-lime-400 font-bold text-base sm:text-lg">
                  <div className="relative">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                    <div className="absolute inset-0 bg-lime-400 blur-md opacity-50 animate-pulse"></div>
                  </div>
                  <span className="text-sm sm:text-base lg:text-lg">Инновационно • Безопасно • Вдохновляюще</span>
                </div>
              </div>
              <Button
                onClick={() => scrollToSection("how-it-works")}
                className="group bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 hover:from-red-400 hover:via-pink-400 hover:to-purple-400 text-white font-bold px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-full text-lg sm:text-xl shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-500 hover:scale-110"
              >
                <Rocket className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:animate-bounce" />
                Как это работает?
              </Button>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 rounded-full blur-3xl opacity-30 animate-pulse scale-150"></div>
                {/* Middle ring */}
                <div className="absolute inset-4 bg-gradient-to-r from-lime-400/50 to-green-400/50 rounded-full blur-xl animate-spin-slow"></div>
                {/* Token image */}
                <div className="relative z-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full p-8 border-2 border-lime-400/30">
                  <Image
                    src="/images/pecoin-token.png"
                    alt="PEcoin токен"
                    width={300}
                    height={300}
                    className="rounded-full"
                  />
                </div>
                {/* Floating elements */}
                <div className="absolute -top-8 -right-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full p-4 animate-bounce shadow-lg shadow-yellow-400/50">
                  <Coins className="w-8 h-8 text-black" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full p-3 animate-pulse shadow-lg shadow-blue-400/50">
                  <Code className="w-6 h-6 text-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-8 sm:py-12 lg:py-16 z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[
              { icon: Globe, label: "Блокчейн Solana", value: 100, suffix: "%" },
              { icon: Users, label: "Активных участников", value: 250, suffix: "+" },
              { icon: Coins, label: "🪙 PEcoin в обороте", value: 10000, suffix: "" },
              { icon: Trophy, label: "Успешных проектов", value: 50, suffix: "+" },
            ].map((stat, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-lime-400/20 rounded-2xl hover:border-lime-400/40 transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="bg-gradient-to-r from-lime-400 to-green-400 rounded-full p-2 sm:p-3 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    {stat.label.includes("PEcoin") ? (
                      <Image src="/images/pecoin-token.png" alt="PEcoin" width={32} height={32} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
                    ) : (
                      <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-lime-400 mb-1 sm:mb-2">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-300 font-medium leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What is PEcoin */}
      <section id="what-is-pecoin" className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-8">
                Что такое{" "}
                <span className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">
                  <Image src="/images/pecoin-token.png" alt="PEcoin" width={32} height={32} className="inline w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-1 sm:mr-2 rounded-full" />
                  PEcoin?
                </span>
              </h2>
            </div>
            <Card className="group bg-gradient-to-br from-gray-900/70 via-gray-950/80 to-black/70 backdrop-blur-2xl border border-lime-400/30 rounded-3xl shadow-2xl shadow-lime-400/20 hover:shadow-lime-400/30 transition-all duration-500 overflow-hidden relative">
              <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-lime-500/20 rounded-full blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000 opacity-50 group-hover:opacity-70"></div>
              <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/20 rounded-full blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000 opacity-50 group-hover:opacity-70 animation-delay-500"></div>

              <CardContent className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16">
                <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
                  <div className="space-y-6 sm:space-y-8 text-gray-300 text-base sm:text-lg leading-relaxed">
                    <p className="text-lg sm:text-xl md:text-2xl">
                      <span className="text-lime-400 font-black text-xl sm:text-2xl lg:text-3xl"><Image src="/images/pecoin-token.png" alt="PEcoin" width={32} height={32} className="inline w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-1 sm:mr-2 rounded-full" />PEcoin</span> — это не просто игровая валюта.
                      Это <span className="text-green-400 font-bold">реальный цифровой токен</span>, созданный на
                      ультрасовременном и быстром блокчейне <span className="text-purple-400 font-bold">Solana</span>.
                      Мы интегрировали настоящую <span className="text-blue-400 font-bold">Web3 технологию</span>, чтобы
                      ваши дети получили бесценный опыт работы с инструментами, которые уже сегодня формируют цифровое
                      будущее.
                    </p>
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/40 shadow-lg hover:shadow-blue-400/30 transition-shadow duration-300">
                      <p className="text-blue-300 text-center font-medium">
                        <Lock className="inline-block w-5 h-5 mr-2 text-blue-400" />
                        <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin разработан как <span className="font-bold">образовательный инструмент</span>, а не
                        криптовалюта для биржевой торговли. Его главная цель — обучение основам децентрализованных
                        финансов (DeFi) и блокчейн-технологий в увлекательной и безопасной среде.
                      </p>
                    </div>
                    <p className="text-lime-300 font-semibold text-xl text-center md:text-left">
                      <Rocket className="inline-block w-6 h-6 mr-2 animate-pulse" />
                      Родителям не нужно быть крипто-экспертами. Всё уже настроено, безопасно и готово к погружению в
                      мир инноваций!
                    </p>
                  </div>
                  <div className="relative flex flex-col items-center justify-center gap-6 p-6 bg-black/30 backdrop-blur-md border border-lime-400/20 rounded-2xl">
                    <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10">
                      {[...Array(100)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-full h-full border-r border-b border-lime-400/20 ${Math.random() > 0.8 ? "bg-lime-400/10 animate-pulse" : ""}`}
                          style={{ animationDelay: `${Math.random() * 2}s` }}
                        ></div>
                      ))}
                    </div>
                    {[
                      {
                        icon: Shield,
                        text: "Максимальная Безопасность",
                        color: "text-lime-400",
                        glow: "shadow-lime-500/50",
                      },
                      {
                        icon: Network,
                        text: "Полная Децентрализация",
                        color: "text-green-400",
                        glow: "shadow-green-500/50",
                      },
                      { icon: Cpu, text: "Передовые Инновации", color: "text-blue-400", glow: "shadow-blue-500/50" },
                      { icon: Zap, text: "Скорость Solana", color: "text-purple-400", glow: "shadow-purple-500/50" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`relative z-10 flex items-center gap-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700 hover:border-${item.color.replace("text-", "")} transition-all duration-300 hover:scale-105 w-full`}
                      >
                        <item.icon className={`w-8 h-8 ${item.color} flex-shrink-0`} />
                        <span className={`font-bold text-lg ${item.color}`}>{item.text}</span>
                        <div
                          className={`absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 blur-md ${item.glow} transition-opacity duration-300`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10 overflow-hidden">
        {/* Animated background lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-lime-400/30 to-transparent animate-move-lines"
              style={{ top: `${i * 20}%`, animationDuration: `${10 + i * 2}s`, animationDelay: `${i}s` }}
            ></div>
          ))}
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16 lg:mb-20">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-4 sm:mb-6">
                Как <Image src="/images/pecoin-token.png" alt="PEcoin" width={32} height={32} className="inline w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-1 sm:mr-2 rounded-full" />PEcoin{" "}
                <span className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">
                  трансформирует
                </span>{" "}
                лагерь?
              </h2>
              <p className="text-lg sm:text-xl lg:text-2xl text-lime-300 font-semibold">
                Каждый день — это портал в мир цифрового предпринимательства и Web3 инноваций!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 mb-12 sm:mb-16">
              {/* Card for 10+ */}
              <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-950 to-black backdrop-blur-xl border border-lime-400/40 rounded-3xl hover:border-lime-400/70 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-lime-400/30 overflow-hidden">
                <CardContent className="relative z-10 p-6 sm:p-8 lg:p-10">
                  <div className="flex flex-col items-center md:flex-row md:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="relative">
                      <div className="bg-gradient-to-r from-lime-400 to-green-400 rounded-2xl p-3 sm:p-4 lg:p-5 group-hover:animate-pulse shadow-lg shadow-lime-500/30">
                        <Users className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-black" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-lime-400 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-ping animation-delay-300"></div>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-lime-300 text-center md:text-left">
                      Для Про-Геймеров (10+)
                    </h3>
                  </div>
                  <p className="text-gray-200 text-base sm:text-lg leading-relaxed">
                    Участники старше 10 лет погружаются в{" "}
                    <span className="text-lime-400 font-bold">полноценную Web3 экосистему</span>. Они получают{" "}
                    <span className="text-green-400 font-bold">реальные цифровые токены <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin</span> за активность,
                    достижения и успешные проекты. Для управления активами используется{" "}
                    <span className="text-purple-400 font-bold">кошелёк Phantom</span> — профессиональный и безопасный
                    инструмент из мира Solana, адаптированный для образовательных целей.
                  </p>
                </CardContent>
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-lime-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Card>

              {/* Card for younger kids */}
              <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-950 to-black backdrop-blur-xl border border-yellow-400/40 rounded-3xl hover:border-yellow-400/70 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-yellow-400/30 overflow-hidden">
                <CardContent className="relative z-10 p-6 sm:p-8 lg:p-10">
                  <div className="flex flex-col items-center md:flex-row md:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="relative">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-3 sm:p-4 lg:p-5 group-hover:animate-pulse shadow-lg shadow-yellow-500/30">
                        <Star className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-black" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-yellow-400 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-ping animation-delay-500"></div>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-yellow-300 text-center md:text-left">
                      Для Юных Исследователей (&lt;10)
                    </h3>
                  </div>
                  <p className="text-gray-200 text-base sm:text-lg leading-relaxed">
                    Младшие участники (до 10 лет) начинают свое путешествие в мир экономики с помощью{" "}
                    <span className="text-yellow-400 font-bold">физических жетонов и интерактивных стикеров</span>. Это
                    увлекательный подготовительный этап, который знакомит с базовыми концепциями ценности и обмена перед
                    плавным переходом к цифровым технологиям в будущем.
                  </p>
                </CardContent>
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-yellow-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Card>
            </div>

            <Card className="relative group bg-gradient-to-b from-purple-900/50 via-black to-black backdrop-blur-2xl border-2 border-purple-400/50 rounded-3xl shadow-2xl shadow-purple-400/20 hover:shadow-purple-400/40 transition-all duration-500 overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23a855f7' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                }}
              ></div>
              <CardContent className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-20">
                <div className="space-y-6 sm:space-y-8 lg:space-y-10 text-gray-200 text-base sm:text-lg leading-relaxed">
                  <p className="text-lg sm:text-xl md:text-2xl text-center">
                    В течение смены дети объединяются в команды, придумывают бизнес-идеи и превращают их в настоящие{" "}
                    <span className="text-purple-300 font-bold text-xl sm:text-2xl md:text-3xl">
                      мини-стартапы
                    </span>
                    . Кто-то становится директором, кто-то отвечает за рекламу или финансы, а кто-то — за дизайн и
                    презентацию.
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl text-center">
                    Команды каждый день встречаются, обсуждают задачи и{" "}
                    <span className="text-pink-400 font-bold text-xl sm:text-2xl md:text-3xl">шаг за шагом развивают</span>{" "}
                    свои проекты. За активность и успехи они зарабатывают{" "}
                    <span className="text-lime-400 font-bold"><Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin</span> — нашу лагерную монету.
                  </p>
                  <div className="bg-gradient-to-r from-lime-800/30 via-green-800/30 to-emerald-800/30 rounded-2xl p-6 sm:p-8 md:p-12 border-2 border-lime-400/50 shadow-xl hover:shadow-lime-400/30 transition-shadow duration-300">
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-lime-300 text-center leading-snug">
                      <Zap className="inline-block w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-2 sm:mr-3 text-lime-300 animate-fast-pulse" />
                      Всё это — <span className="text-white">увлекательно, полезно и приближено к реальной жизни</span>. И всё, что происходит, 
                      видно вам — через наш <span className="text-white">дашборд</span>!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <div className="relative inline-block mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-green-400 to-emerald-400 rounded-full p-4 sm:p-6 shadow-2xl shadow-green-400/50">
                  <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-black" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-8">Это безопасно?</h2>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Абсолютно!
              </p>
            </div>

            <Card className="bg-gray-900 backdrop-blur-2xl border border-green-400/30 rounded-3xl shadow-2xl shadow-green-400/10">
              <CardContent className="p-6 sm:p-8 md:p-12 lg:p-16">
                <div className="space-y-6 sm:space-y-8 text-gray-300 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 lg:mb-12">
                  <p className="text-lg sm:text-xl text-center">
                    Мы используем блокчейн-технологии не для спекуляций, а для{" "}
                    <span className="text-green-400 font-bold">образовательного геймификации</span>.
                  </p>
                  <p className="text-lg sm:text-xl text-center">
                    <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin — это настоящий токен, но в лагере он используется{" "}
                    <span className="text-lime-400 font-bold">исключительно как инструмент обучения и мотивации</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                  <div className="text-center group">
                    <div className="relative mb-4 sm:mb-6">
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-4 sm:p-6 w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center shadow-lg shadow-red-500/50 group-hover:scale-110 transition-transform duration-300">
                        <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-red-400 mb-2 sm:mb-3">Zero Investment</h3>
                    <p className="text-sm sm:text-base text-gray-400">Никаких финансовых вложений от родителей или детей</p>
                  </div>
                  <div className="text-center group">
                    <div className="relative mb-4 sm:mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 sm:p-6 w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform duration-300">
                        <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-blue-400 mb-2 sm:mb-3">Easy Setup</h3>
                    <p className="text-sm sm:text-base text-gray-400">Phantom кошелёк не требует банковских данных</p>
                  </div>
                  <div className="text-center group sm:col-span-2 md:col-span-1">
                    <div className="relative mb-4 sm:mb-6">
                      <div className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl p-4 sm:p-6 w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                        <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-purple-400 mb-2 sm:mb-3">Closed System</h3>
                    <p className="text-sm sm:text-base text-gray-400">Все операции только внутри лагерной экосистемы</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What parents need to do */}
      <section className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-8">
                Что нужно сделать{" "}
                <span className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">
                  родителям?
                </span>
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-lime-400 font-bold">Практически ничего! 🚀</p>
            </div>

            <Card className="bg-gray-900 backdrop-blur-2xl border border-lime-400/30 rounded-3xl shadow-2xl shadow-lime-400/10">
              <CardContent className="p-6 sm:p-8 md:p-12">
                <div className="space-y-4 sm:space-y-6 text-gray-300 text-base sm:text-lg leading-relaxed">
                  <p className="text-lg sm:text-xl text-center">
                    Единственное, что может понадобиться — помочь ребёнку установить{" "}
                    <span className="text-purple-400 font-bold">приложение Phantom</span> (Web3 кошелёк для <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin).
                  </p>

                  <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-3xl p-4 sm:p-6 border border-blue-400/30">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg flex-shrink-0">
                        <Image
                          src="/images/phantom-wallet-icon.png"
                          alt="Phantom Wallet"
                          width={80}
                          height={80}
                          className="object-contain w-16 h-16 sm:w-20 sm:h-20"
                        />
                      </div>

                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg sm:text-xl font-bold text-blue-400 mb-3 sm:mb-4">Скачать Phantom Wallet:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <a
                            href="https://play.google.com/store/apps/details?id=app.phantom"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 sm:gap-3 bg-black rounded-xl p-2 sm:p-3 hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg"
                          >
                            <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-lg p-1.5 sm:p-2 group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-gray-400 uppercase tracking-wide">Скачать в</div>
                              <div className="text-xs sm:text-sm font-bold text-white">Google Play</div>
                            </div>
                          </a>

                          <a
                            href="https://apps.apple.com/app/phantom-solana-wallet/id1598432977"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 sm:gap-3 bg-black rounded-xl p-2 sm:p-3 hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg"
                          >
                            <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg p-1.5 sm:p-2 group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-gray-400 uppercase tracking-wide">Скачать в</div>
                              <div className="text-xs sm:text-sm font-bold text-white">App Store</div>
                            </div>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-3xl p-6 sm:p-8 text-center border border-green-400/30">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400 mb-3 sm:mb-4">
                      🔒 Никаких банковских карт или платежей не требуется
                    </p>
                    <p className="text-base sm:text-lg lg:text-xl text-emerald-300">Только технологии • Только обучение • Только будущее!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard section */}
      <section id="dashboard" className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-8">
                Как следить за{" "}
                <span className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">
                  успехами?
                </span>
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-start">
              {/* Левый блок - Дашборд */}
              <div className="space-y-6 sm:space-y-8">
                <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 backdrop-blur-xl border border-lime-400/40 rounded-3xl shadow-2xl shadow-lime-400/10 hover:border-lime-400/60 transition-all duration-500 h-full">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                      <div className="bg-gradient-to-r from-lime-400 to-green-400 rounded-xl p-2 sm:p-3 shadow-lg shadow-lime-400/30">
                        <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-lime-400">Следите за успехами</h3>
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6 text-gray-300 text-base sm:text-lg leading-relaxed">
                      <p>
                        В течение всей смены дети зарабатывают <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin — участвуя в командных играх, выполняя задания,
                        развивая свои стартапы и проявляя инициативу.
                      </p>
                      
                      <div className="bg-gradient-to-r from-lime-900/30 to-green-900/30 rounded-2xl p-4 sm:p-6 border border-lime-400/20">
                        <p className="font-semibold text-lime-300 mb-3 sm:mb-4">
                          Дашборд в реальном времени покажет:
                        </p>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-lime-400 rounded-full animate-pulse shadow-lg shadow-lime-400/50"></div>
                            <span className="text-sm sm:text-base">сколько <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin заработала команда</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                            <span className="text-sm sm:text-base">как продвигается проект стартапа</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                            <span className="text-sm sm:text-base">активность ребёнка в заданиях</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Link href="/dashboard" passHref>
                      <Button className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 hover:from-lime-300 hover:via-green-300 hover:to-emerald-300 text-black font-bold py-3 sm:py-4 rounded-2xl text-base sm:text-lg shadow-2xl shadow-lime-400/30 hover:shadow-lime-400/50 transition-all duration-500 hover:scale-105">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                        Открыть Live Dashboard
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Правый блок - Business Day */}
              <div>
                <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 backdrop-blur-xl border border-yellow-400/40 rounded-3xl shadow-2xl shadow-yellow-400/10 hover:border-yellow-400/60 transition-all duration-500 h-full">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-2 sm:p-3 shadow-lg shadow-yellow-400/30">
                        <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-yellow-400">Финал смены</h3>
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6 text-gray-300 text-base sm:text-lg leading-relaxed">
                      <p>
                        Финал смены — это <span className="text-orange-400 font-bold">Business Day</span>. Два дня команды работают со своими проектами по-настоящему.
                      </p>
                      <p>
                        Дети открывают кафе, мастерские, магазины — всё, что придумали за смену. Зарабатывают настоящие <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin от других участников лагеря.
                      </p>
                      
                      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-2xl p-4 sm:p-6 border border-yellow-400/20">
                        <p className="font-semibold text-yellow-300 mb-3 sm:mb-4">
                          В конце все <Image src="/images/pecoin-token.png" alt="PEcoin" width={16} height={16} className="inline w-4 h-4 mr-1 rounded-full" />PEcoin распределяются:
                        </p>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-2xl">🏆</span>
                            <span className="text-sm sm:text-lg">за личные достижения</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-2xl">🤝</span>
                            <span className="text-sm sm:text-lg">внутри команд</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-2xl">🚀</span>
                            <span className="text-sm sm:text-lg">по итогам стартапа</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Итоговый результат */}
            <div className="mt-8 sm:mt-10 lg:mt-12 text-center">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 sm:p-8">
                <p className="text-gray-300 text-lg sm:text-xl leading-relaxed">
                  🎯 Каждый ребёнок получит собственный цифровой капитал 💰, который сможет потратить на 
                  <span className="text-lime-400 font-semibold">финальной ярмарке проектов</span> 🛍️✨
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-12 sm:py-16 md:py-24 lg:py-32 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-8">
                <span className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">
                  FAQ
                </span>
              </h2>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {[
                {
                  question: "Нужно ли что-то платить?",
                  answer:
                    "Абсолютно нет. Участие в <Image src=\"/images/pecoin-token.png\" alt=\"PEcoin\" width={16} height={16} className=\"inline w-4 h-4 mr-1 rounded-full\" />PEcoin экосистеме полностью бесплатно — ни родители, ни дети не вносят никаких средств. Это образовательная программа, а не инвестиционный продукт.",
                },
                {
                  question: "Ребёнок точно справится с технологиями?",
                  answer:
                    "Определённо! Мы используем Phantom — самый user-friendly Web3 кошелёк. Установка займёт 2-3 минуты. Наши технические менторы помогают детям на каждом этапе освоения блокчейн-инструментов.",
                },
                {
                  question: "Мой ребёнок младше 10 лет, он тоже участвует?",
                  answer:
                    "Дети до 10 лет не работают с цифровыми токенами. Для них мы создали аналоговую версию — физические жетоны и геймификацию без блокчейна. Это подготовительный этап перед переходом к Web3 технологиям.",
                },
                {
                  question: "Куда обращаться при технических сложностях?",
                  answer:
                    "У нас есть dedicated техподдержка: вожатые групп и IT-менторы помогут с установкой кошелька, объяснят принципы работы блокчейна и решат любые технические вопросы в режиме 24/7.",
                },
              ].map((faq, index) => (
                <Card
                  key={index}
                  className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-lime-400/20 rounded-2xl hover:border-lime-400/40 transition-all duration-300"
                >
                  <Collapsible open={openFaq === index} onOpenChange={() => toggleFaq(index)}>
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-6 sm:p-8 cursor-pointer hover:bg-gray-800/30 transition-colors duration-200 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-bold text-lime-400 text-left">{faq.question}</h3>
                          <ChevronDown
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-lime-400 transition-transform duration-300 flex-shrink-0 ml-3 ${
                              openFaq === index ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
                        <p className="text-gray-300 text-base sm:text-lg leading-relaxed">{faq.answer}</p>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 sm:py-16 z-10 border-t border-lime-400/20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6 sm:mb-8">
              <div className="relative">
                <Image
                  src="/images/pecamp-logo.png"
                  alt="PlanetEnglish PEcamp - английский лагерь"
                  width={200}
                  height={80}
                  className="drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] w-40 sm:w-48 lg:w-52 h-auto"
                />
              </div>
            </div>
            <p className="text-gray-400 text-base sm:text-lg mb-2">© 2024 Летний лагерь. Все права защищены.</p>
            <p className="text-lime-400 font-bold text-lg sm:text-xl">
              <Image src="/images/pecoin-token.png" alt="PEcoin" width={20} height={20} className="inline w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 rounded-full" />PEcoin — революционная Web3 образовательная программа на Solana blockchain
            </p>
            <div className="flex justify-center gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className="bg-gradient-to-r from-lime-400/20 to-green-400/20 rounded-full p-2 sm:p-3 border border-lime-400/30">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-lime-400" />
              </div>
              <div className="bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full p-2 sm:p-3 border border-blue-400/30">
                <Network className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div className="bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full p-2 sm:p-3 border border-purple-400/30">
                <Code className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
