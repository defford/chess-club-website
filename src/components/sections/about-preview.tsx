import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Trophy, BookOpen, Star } from "lucide-react"

export function AboutPreview() {
  const benefits = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Critical Thinking",
      description: "Develop problem-solving and analytical skills that transfer to academics and life."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Social Skills",
      description: "Make new friends and learn good sportsmanship in a supportive environment."
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Achievement",
      description: "Build confidence through tournaments, rankings, and personal improvement."
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "Fun Learning",
      description: "Enjoy the game while developing skills that last a lifetime."
    }
  ]

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div>

          {/* Right Column - Content */}
          <div>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-[--color-accent] mb-6">
              About the Club
            </h2>
            
            <div className="space-y-6 mb-8">
              <p className="text-lg text-[--color-text-secondary] leading-relaxed">
                <strong className="text-[--color-primary]">Founded in 2023</strong>, Central NL Scholastic Chess Club has helped over 
                <strong className="text-[--color-primary]"> 30+ students</strong> learn the game and grow as strategic thinkers.
              </p>
              
              <p className="text-[--color-text-secondary] leading-relaxed">
                Our mission is to provide a welcoming, educational environment where students from kindergarten through grade 12 
                can learn chess, develop critical thinking skills, and build lasting friendships through the timeless game of chess.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-[--color-primary] text-white rounded-lg flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-[--color-text-primary] mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-[--color-text-secondary]">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/about">
              <Button variant="outline" size="lg">
                Learn More About Us
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
