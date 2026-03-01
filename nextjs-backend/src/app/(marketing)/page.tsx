import { BackgroundGradient } from '@/components/revamp/background-gradient'
import { Hero } from '@/components/revamp/hero'
import { HoverHighlights } from '@/components/revamp/hover-highlights'
import { GettingStarted } from '@/components/revamp/getting-started'
import { FeatureCards } from '@/components/revamp/feature-cards'
import { CallToAction } from '@/components/revamp/call-to-action'
import { Architecture } from '@/components/revamp/architecture'

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <BackgroundGradient />

      <Hero />

      <HoverHighlights />

      <Architecture />

      <GettingStarted />

      <FeatureCards />

      <CallToAction />

      {/* <OpenSourceSection /> */}
    </main>
  )
}
