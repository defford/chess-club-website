"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

const images = [
  {
    src: "/images/508412988_10171823093405165_6219559043861325087_n.jpg",
    alt: "Chess club with digital board and engaged students",
    caption: `${"Celebrating achievements!"}`,
    textStyle: "large",
    textPosition: "bottom-left"
  },
  {
    src: "/images/491381142_10171354577070165_4202854025260736222_n.jpg",
    alt: "Chess club with digital board and engaged students",
    caption: `${"Learning with \n modern technology"}`,
    textStyle: "large",
    textPosition: "top-left"
  },
  {
    src: "/images/Screenshot 2025-09-07 at 9.37.01 PM.png",
    alt: "Chess club with digital board and engaged students",
    caption: `${"Fun competition at every meetup!"}`,
    textStyle: "large",
    textPosition: "bottom-left"
  },
  {
    src: "/images/494048825_10171329719060333_6260764482363970501_n.jpg",
    alt: "One-on-one chess instruction",
    caption: "Personalized learning and mentorship",
    textStyle: "large",
    textPosition: "bottom-left"
  },
  {
    src: "/images/505372629_10171743782260165_4080742372682182885_n.jpg",
    alt: "Tournament play with digital clocks",
    caption: "Competitive tournament play",
    textStyle: "large",
    textPosition: "bottom-right"
  },
  {
    src: "/images/505370465_10171743782025165_7321635704409433236_n.jpg",
    alt: "Focused young chess player",
    caption: `${"Developing \n concentration \n and focus"}`,
    textStyle: "large",
    textPosition: "top-right"
  }
]

export function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(timer)
  }, [])

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const getTextStyle = (style: string, position: string) => {
    const baseStyle = style === "giant" 
      ? "text-4xl md:text-6xl lg:text-7xl font-black leading-tight whitespace-pre-line"
      : style === "extra-large"
      ? "text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight whitespace-pre-line"
      : style === "large"
      ? "text-2xl md:text-4xl lg:text-5xl font-bold leading-tight whitespace-pre-line"
      : "text-2xl font-bold whitespace-pre-line"

    // Add text alignment based on position
    if (position.includes("left")) {
      return baseStyle + " text-left"
    } else if (position.includes("right")) {
      return baseStyle + " text-right"
    } else {
      return baseStyle + " text-center"
    }
  }

  const getTextPosition = (position: string) => {
    switch (position) {
      case "top-right":
        return "absolute top-0 right-0 p-6 flex flex-col justify-start bg-black/70"
      case "bottom-left":
        return "absolute bottom-0 left-0 p-6 flex flex-col justify-end bg-black/70"
      case "bottom-right":
        return "absolute bottom-0 right-0 p-6 flex flex-col justify-end bg-black/70"
      case "top-left":
        return "absolute top-0 left-0 p-6 flex flex-col justify-start bg-black/70"
      default:
        return "absolute bottom-0 right-0 p-6 flex flex-col justify-end bg-black/70"
    }
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[--color-accent] mb-4">
            Our Club in Action
          </h2>
          <p className="text-lg text-[--color-text-secondary] max-w-2xl mx-auto">
            See what makes our chess club special - from learning and tournaments to celebrations and achievements.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Main Image */}
          <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden shadow-lg">
            <Image
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              fill
              className="object-cover"
              priority={currentIndex === 0}
            />
            
            {/* Caption Overlay */}
            <div className={getTextPosition(images[currentIndex].textPosition)}>
              <p className={`text-white ${getTextStyle(images[currentIndex].textStyle, images[currentIndex].textPosition)}`}>
                {images[currentIndex].caption}
              </p>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-[--color-primary]' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
