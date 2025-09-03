import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Users, Award, Calendar, BookOpen, Target, Heart, Star, Trophy } from "lucide-react"

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
            Founded in 2019, the Central NL Scholastic Chess Club has become a cornerstone of youth chess education in Newfoundland and Labrador.
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
                <strong className="text-[--color-primary]">Founded in 2019</strong> by a group of passionate educators 
                and chess enthusiasts, we've grown from a small group of 8 students meeting in a church basement to a 
                thriving community of over <strong className="text-[--color-primary]">50 active members</strong> with 
                our own dedicated space at the Community Center.
              </p>
              <p>
                Our approach combines structured learning with fun, competitive play. Whether your child is a complete 
                beginner or an experienced tournament player, we have programs designed to meet them where they are 
                and help them reach their full potential.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[--color-primary] to-[--color-accent] rounded-lg h-40 flex items-center justify-center text-white text-6xl">
                ♛
              </div>
              <div className="bg-gradient-to-br from-[--color-secondary] to-orange-400 rounded-lg h-40 flex items-center justify-center text-[--color-accent] text-6xl">
                ♞
              </div>
            </div>
            <div className="bg-gradient-to-r from-[--color-neutral-light] to-gray-200 rounded-lg h-24 flex items-center justify-center text-[--color-text-secondary] text-lg font-medium">
              Students in Action - Tournament Day 2024
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-lg h-20 flex items-center justify-center text-white text-2xl">
                ♜
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg h-20 flex items-center justify-center text-white text-2xl">
                ♝
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg h-20 flex items-center justify-center text-white text-2xl">
                ♟
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
                    <div className="w-10 h-10 bg-[--color-primary] text-white rounded-lg flex items-center justify-center mr-3">
                      {benefit.icon}
                    </div>
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

        {/* Achievements */}
        <div className="bg-[--color-neutral-light] rounded-lg p-8 mb-16">
          <h2 className="font-heading font-bold text-3xl text-[--color-accent] text-center mb-8">
            Our Achievements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-heading font-bold text-[--color-primary] mb-2">
                  {achievement.number}
                </div>
                <div className="font-semibold text-[--color-text-primary] mb-1">
                  {achievement.label}
                </div>
                <div className="text-sm text-[--color-text-secondary]">
                  {achievement.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructors */}
        <div className="mb-16">
          <h2 className="font-heading font-bold text-3xl text-[--color-accent] text-center mb-12">
            Meet Our Instructors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {instructors.map((instructor, index) => (
              <Card key={index}>
                <CardHeader className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[--color-primary] to-[--color-accent] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {instructor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <CardTitle className="text-lg">{instructor.name}</CardTitle>
                  <CardDescription>{instructor.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Experience:</strong> {instructor.experience}</p>
                    <p><strong>Credentials:</strong> {instructor.credentials}</p>
                    <p className="text-[--color-text-secondary] italic">{instructor.bio}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Programs */}
        <div className="mb-16">
          <h2 className="font-heading font-bold text-3xl text-[--color-accent] text-center mb-12">
            Our Programs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-[--color-primary]" />
                  Beginner Program (K-6)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[--color-text-secondary]">
                  <li>• Learn basic rules and piece movements</li>
                  <li>• Fun games and puzzles to reinforce learning</li>
                  <li>• Small group instruction (max 8 students)</li>
                  <li>• Focus on fun and building confidence</li>
                  <li>• Weekly 90-minute sessions</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-[--color-primary]" />
                  Intermediate Program (Grades 4-8)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[--color-text-secondary]">
                  <li>• Opening principles and basic strategy</li>
                  <li>• Tactical pattern recognition</li>
                  <li>• Introduction to tournament play</li>
                  <li>• Ladder system for friendly competition</li>
                  <li>• Weekly 2-hour sessions</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-[--color-primary]" />
                  Advanced Program (Grades 6-12)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[--color-text-secondary]">
                  <li>• Advanced opening theory and preparation</li>
                  <li>• Complex tactical and strategic concepts</li>
                  <li>• Tournament preparation and analysis</li>
                  <li>• Individual coaching available</li>
                  <li>• Flexible scheduling for serious players</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-[--color-primary]" />
                  Special Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[--color-text-secondary]">
                  <li>• Summer chess camps</li>
                  <li>• Parent-child workshops</li>
                  <li>• School visit programs</li>
                  <li>• Birthday party chess instruction</li>
                  <li>• Private and semi-private lessons</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="font-heading font-semibold text-2xl text-[--color-text-primary] mb-4">
                Ready to Join Our Chess Family?
              </h3>
              <p className="text-[--color-text-secondary] mb-6">
                Give your child the gift of chess. Register today and watch them develop skills that will last a lifetime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button variant="secondary" size="lg">
                    Register Your Child
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="outline" size="lg">
                    View Upcoming Events
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
