'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { BackgroundGrid } from './background-grid'
import { Gutter } from './gutter'

export function Architecture() {
  return (
    <section className="relative z-[1] bg-transparent py-24 md:py-32">
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
            System Architecture
          </h2>
          <p className="text-lg text-neutral-400">
            A high-level overview of how Tabby integrates AI with your workflow across devices and
            platforms.
          </p>
        </motion.div>

        <motion.div
          className={cn(
            'relative w-full z-10',
            'rounded-lg border border-white/5 bg-white/10 p-1 backdrop-blur-xl',
            'shadow-[0_4rem_6rem_-1rem_rgba(0,0,0,0.7)]'
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <div className="bg-[#141414] rounded overflow-hidden border border-white/5 shadow-sm">
            <Image
              src="/landing/tabby-architecture.png"
              alt="Tabby Architecture"
              width={2400}
              height={1600}
              quality={100}
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </Gutter>
    </section>
  )
}
