import { HeroSection } from "@/components/sections/hero"
import { EventsPreview } from "@/components/sections/events-preview"
import { RankingsPreview } from "@/components/sections/rankings-preview"
import { RegistrationPreview } from "@/components/sections/registration-preview"
import { AboutPreview } from "@/components/sections/about-preview"
import { ImageCarousel } from "@/components/sections/image-carousel"

// ISR configuration - revalidate every 5 minutes
export const revalidate = 300;

export default function Home() {
  return (
    <div>
      <HeroSection />
      <ImageCarousel />
      <EventsPreview />
      {/* <RankingsPreview /> */}
      {/* <RegistrationPreview /> */}
      <AboutPreview />
    </div>
  )
}