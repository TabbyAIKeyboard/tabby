'use client'

import { cn } from '@/lib/utils'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { Brain, Keyboard, Monitor, Sparkles, MessageSquare, Zap, Mic, Eye } from 'lucide-react'
import React, { MouseEvent } from 'react'
import { BackgroundGrid } from './background-grid'
import { Gutter } from './gutter'

interface FeatureCard {
  title: string
  description: string
  icon: React.ReactNode
}

const features: FeatureCard[] = [
  {
    title: 'Interview Copilot',
    description:
      'Screen capture, problem analysis, and real-time code suggestions for technical interviews.',
    icon: <Monitor className="h-6 w-6" />,
  },
  {
    title: 'Action Menu',
    description:
      'Quick AI actions: fix grammar, change tone, expand text, and run custom snippets.',
    icon: <Keyboard className="h-6 w-6" />,
  },
  {
    title: 'Persistent Memory',
    description:
      'Long-term context retention using vector databases. Your AI remembers everything.',
    icon: <Brain className="h-6 w-6" />,
  },
  {
    title: 'Ghost Text',
    description:
      'Subtle IDE suggestions that appear as you type, guiding you through complex code.',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    title: 'Knowledge Graph',
    description:
      'Visualize your cognitive architecture. Discover connections between snippets and past sessions.',
    icon: <Eye className="h-6 w-6" />,
  },
  {
    title: 'Voice Agent',
    description: 'Voice-to-text and text-to-voice for hands-free, natural AI interaction.',
    icon: <Mic className="h-6 w-6" />,
  },
  {
    title: 'Intelligent Chat',
    description: 'Full context-aware conversation with tool integration and memory search.',
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    title: 'Invisible Typing',
    description:
      'Seamless AI-assisted typing. Tabby types directly into any app with human rhythm.',
    icon: <Sparkles className="h-6 w-6" />,
  },
]

function SpotlightCard({ feature, index }: { feature: FeatureCard; index: number }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative backdrop-blur-xl bg-white/5 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.1),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative flex h-full flex-col p-8">
        <div className="mb-6 inline-flex w-fit rounded-none bg-white/5 p-3 ring-1 ring-white/10 text-neutral-200">
          {feature.icon}
        </div>
        <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
        <p className="text-neutral-400 leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  )
}

export function FeatureCards() {
  return (
    <section id="features" className="relative z-[1] bg-transparent py-24   md:py-32">
      <BackgroundGrid zIndex={0} />

      <Gutter>
        <motion.div
          className="mb-16 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Powerful features
          </h2>
          <p className="text-lg text-neutral-400">
            Everything you need to supercharge your coding workflow and ace interviews.
          </p>
        </motion.div>

        <div className="border border-white/10">
          {/* Mobile: single column with horizontal dividers */}
          <div className="grid grid-cols-1 divide-y divide-white/10 md:hidden">
            {features.map((feature, index) => (
              <SpotlightCard key={index} feature={feature} index={index} />
            ))}
          </div>
          {/* Tablet/Desktop: 2-4 columns with vertical dividers */}
          <div className="hidden md:block">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 md:divide-x divide-white/10">
              {features.slice(0, 4).map((feature, index) => (
                <SpotlightCard key={index} feature={feature} index={index} />
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 md:divide-x divide-white/10 border-t border-white/10">
              {features.slice(4, 8).map((feature, index) => (
                <SpotlightCard key={index + 4} feature={feature} index={index + 4} />
              ))}
            </div>
          </div>
        </div>
      </Gutter>
    </section>
  )
}
