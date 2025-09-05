import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center bg-gradient-to-br from-[#2D5BE3] to-[#1C1F33] overflow-hidden pt-8 md:pt-0">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 text-white text-6xl rotate-12">♗</div>
        <div className="absolute top-40 right-32 text-white text-8xl -rotate-12">♞</div>
        <div className="absolute bottom-32 left-40 text-white text-7xl rotate-45">♜</div>
        <div className="absolute bottom-20 right-20 text-white text-5xl -rotate-45">♛</div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-9xl opacity-50">♔</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="font-heading font-bold text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
            Chess for Students in
            <br />
            <span className="text-[#FFD93D]">Central Newfoundland.</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-2xl mx-auto">
            Building skills and confidence for students K–12 through the timeless game of chess.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <Button variant="primary" size="xl" className="w-full sm:w-auto bg-white text-[#2D5BE3] hover:bg-gray-100">
                Register Your Child
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="secondary" size="xl" className="w-full sm:w-auto">
                See Upcoming Events
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 pb-8 md:pb-0 border-t border-white/20">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading font-bold text-[#FFD93D]">30+</div>
              <div className="text-sm md:text-base text-gray-200">Active Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading font-bold text-[#FFD93D]">2</div>
              <div className="text-sm md:text-base text-gray-200">Years Running</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading font-bold text-[#FFD93D]">4</div>
              <div className="text-sm md:text-base text-gray-200">Tournaments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading font-bold text-[#FFD93D]">K-12</div>
              <div className="text-sm md:text-base text-gray-200">Grade Levels</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
