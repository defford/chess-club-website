import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Users, Award, Calendar, BookOpen, Target, Heart, Star, Trophy } from "lucide-react"
import Image from "next/image"

export default function AboutPage() {
  const benefits = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Critical Thinking",
      description: "Chess develops problem-solving abilities, pattern recognition, and analytical thinking that transfer to academics and life decisions."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Social Development",
      description: "Build friendships, learn good sportsmanship, and develop communication skills in a supportive, structured environment."
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Achievement & Confidence",
      description: "Build self-esteem through personal improvement, tournament success, and recognition of strategic accomplishments."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Focus & Patience",
      description: "Improve concentration, learn to think before acting, and develop the patience needed for deep strategic planning."
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Character Building",
      description: "Learn grace in victory and defeat, develop resilience, and understand the value of practice and persistence."
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "Academic Enhancement",
      description: "Studies show chess players often see improvements in math, reading comprehension, and standardized test scores."
    }
  ]

  const instructors = [
    {
      name: "Sarah Mitchell",
      title: "Head Instructor & Club Director",
      experience: "15 years teaching experience",
      credentials: "FIDE Instructor, Canadian Chess Federation Level 3",
      bio: "Former provincial champion with a passion for youth development through chess."
    },
    {
      name: "David Chen",
      title: "Tournament Director",
      experience: "8 years competitive experience",
      credentials: "CFC Arbiter, Provincial Master",
      bio: "Specializes in tournament preparation and competitive strategy."
    },
    {
      name: "Emily Rodriguez",
      title: "Beginner Specialist",
      experience: "5 years youth instruction",
      credentials: "Elementary Education Degree, Chess Coach Certification",
      bio: "Expert at making chess fun and accessible for young beginners."
    }
  ]

  const achievements = [
    { number: "200+", label: "Students Taught", description: "Since our founding in 2019" },
    { number: "25+", label: "Tournament Wins", description: "By our club members" },
    { number: "15", label: "Regional Qualifiers", description: "Advanced to provincial championships" },
    { number: "98%", label: "Parent Satisfaction", description: "Would recommend our club" }
  ]

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-[--color-accent] mb-4">
            About Our Club
          </h1>
          <p className="text-xl text-[--color-text-secondary] max-w-3xl mx-auto">
            Founded in 2023, the Central NL Scholastic Chess Club has become a cornerstone of youth chess education in Newfoundland and Labrador.
          </p>
        </div>

        {/* Mission & Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="font-heading font-bold text-3xl text-[--color-accent] mb-6">
              Our Mission
            </h2>
            <div className="space-y-4 text-[--color-text-secondary] leading-relaxed">
              <p>
                We believe chess is more than just a game—it's a powerful educational tool that develops critical thinking, 
                builds character, and creates lasting friendships. Our mission is to provide a welcoming, inclusive 
                environment where students from kindergarten through grade 12 can learn, grow, and excel.
              </p>
              <p>
                <strong className="text-[--color-primary]">Founded in 2023</strong> by a group of passionate educators 
                and chess enthusiasts, we've grown from a small group of students meeting in a classroom to a 
                thriving community of over <strong className="text-[--color-primary]">30 active members</strong> with 
                our own dedicated space at Exploits Valley Intermediate School.
              </p>
              <p>
                Our approach combines structured learning with fun, competitive play. Whether your player is a complete 
                beginner or an experienced tournament player, we have programs designed to meet them where they are 
                and help them reach their full potential.
              </p>
            </div>
          </div>
          
          {/* Image Collage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="relative h-48 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="/images/491381142_10171354577070165_4202854025260736222_n.jpg"
                  alt="One-on-one chess instruction"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-32 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="/images/505370465_10171743782025165_7321635704409433236_n.jpg"
                  alt="Focused young chess player"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="relative h-32 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="/images/505375007_10171743785350165_6065070256048518759_n.jpg"
                  alt="Another focused chess player"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="/images/508412988_10171823093405165_6219559043861325087_n.jpg"
                  alt="Awards ceremony with certificates"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="font-heading font-bold text-3xl text-[--color-accent] text-center mb-12">
            Why Chess for Kids?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <h3 className="font-heading font-semibold text-lg text-[--color-text-primary]">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="text-[--color-text-secondary]">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex items-center justify-center gap-12">
          <div className="relative h-48 w-48">
            <Image
              src="/Logo.png"
              alt="Central NL Scholastic Chess Club Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h3 className="font-heading font-semibold text-2xl text-[--color-text-primary] mb-4">
              Ready to Join?
            </h3>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <p className="text-[--color-text-secondary] mb-6">
                  Register today and develop skills that will last a lifetime.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/register">
                    <Button variant="outline" size="lg">
                      Register Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="relative h-48 w-48">
            <Image
              src="/Logo.png"
              alt="Central NL Scholastic Chess Club Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}
