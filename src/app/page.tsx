import { HeroSection } from "@/components/sections/hero"
import { EventsPreview } from "@/components/sections/events-preview"
import { RankingsPreview } from "@/components/sections/rankings-preview"
import { RegistrationPreview } from "@/components/sections/registration-preview"
import { AboutPreview } from "@/components/sections/about-preview"

export default function Home() {
  return (
    <div>
      <HeroSection />
      <EventsPreview />
      <RankingsPreview />
      <RegistrationPreview />
      <AboutPreview />
    </div>
  )
}