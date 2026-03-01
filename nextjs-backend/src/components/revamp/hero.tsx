'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { BackgroundGrid } from './background-grid'
import { Gutter } from './gutter'
import { LogoShowcase } from './logo-showcase'
import { SlideUpLink } from './slide-up-link'

export function Hero() {
  const [windowWidth, setWindowWidth] = useState(1440)

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', updateWindowSize)
    updateWindowSize()
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  const gridLineStyles =
    windowWidth >= 768
      ? {
          0: {
            background: 'linear-gradient(to bottom, transparent 80px, var(--grid-line-dark) 200px)',
          },
          1: {
            background:
              'linear-gradient(to bottom, transparent 160px, var(--grid-line-dark) 240px)',
          },
          2: {
            background:
              'linear-gradient(to bottom, transparent 200px, var(--grid-line-dark) 240px)',
          },
          3: {
            background:
              'linear-gradient(to bottom, transparent 160px, var(--grid-line-dark) 240px)',
          },
          4: {
            background: 'linear-gradient(to bottom, transparent 80px, var(--grid-line-dark) 200px)',
          },
        }
      : {
          0: { background: 'var(--grid-line-dark)' },
          1: { background: 'var(--grid-line-dark)' },
          2: { background: 'var(--grid-line-dark)' },
          3: { background: 'var(--grid-line-dark)' },
          4: { background: 'var(--grid-line-dark)' },
        }

  return (
    <section
      className="relative z-[1] flex flex-col gap-8 overflow-x-hidden bg-transparent pb-8"
      data-theme="dark"
    >
      <Gutter className="grid min-h-[80vh] grid-cols-1 items-center gap-y-12 md:min-h-[80vh] lg:grid-cols-16 lg:gap-0 pt-24 xl:pt-28 lg:pt-24 md:pt-16">
        <div className="flex flex-col gap-8 lg:col-span-6 lg:col-start-1">
          <motion.div
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          >
            <h1 className="text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl lg:text-7xl xl:text-7xl">
              The Intelligent
              <br />
              Keyboard Layer
            </h1>
            <p className="max-w-xl text-base md:text-lg">
              Tabby is a system-wide AI assistant that lives at the point of input. Transform your
              desktop into a real-time collaborator for coding, writing, and interviews.
            </p>
          </motion.div>

          <motion.ul
            className="flex w-full flex-col border-y border-[var(--grid-line-dark)] divide-y divide-[var(--grid-line-dark)] lg:w-[66.66%]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          >
            <li className="w-full">
              <SlideUpLink
                href="/register"
                label="Join Early Access"
                variant="primary"
                size="md"
                rotateText
              />
            </li>

            <li className="w-full">
              <SlideUpLink
                href="/download"
                label="Download for Windows"
                variant="secondary"
                size="md"
                rotateText
              />
            </li>
          </motion.ul>
        </div>

        <div className="hidden lg:col-span-10 lg:col-start-7 lg:block relative h-[550px] w-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-[550px]"
            style={{ width: 'calc(100% + var(--gutter-h, 160px))' }}
          >
            <motion.div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 right-0 w-[95%] z-10',
                'rounded-lg border border-white/5 bg-white/10 p-1 backdrop-blur-xl',
                'shadow-[0_4rem_6rem_-1rem_rgba(0,0,0,0.7)]'
              )}
              initial={{ opacity: 0, y: 64 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2, delay: 0.5, ease: [0, 0.2, 0.2, 1] }}
            >
              <div className="bg-[#141414] rounded overflow-hidden border border-white/5 shadow-sm">
                <Image
                  src="/landing/tabby-interview-ghost.png"
                  alt="Tabby Interview Copilot"
                  width={2400}
                  height={1600}
                  quality={100}
                  className="w-full h-auto"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="lg:hidden mt-8 mb-4 px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="rounded-lg border border-white/5 bg-white/5 p-1 backdrop-blur-sm shadow-2xl">
            <div className="rounded overflow-hidden bg-[#141414] border border-white/5 shadow-sm">
              <Image
                src="/landing/tabby-interview-ghost.png"
                alt="Tabby Interview Copilot"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </motion.div>
      </Gutter>

      <LogoShowcase />

      <BackgroundGrid gridLineStyles={gridLineStyles} zIndex={-2} />
    </section>
  )
}
