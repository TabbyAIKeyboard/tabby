'use client'

import { motion } from 'framer-motion'
import { Gutter } from '@/components/revamp/gutter'
import { BackgroundGrid } from '@/components/revamp/background-grid'
import { BackgroundGradient } from '@/components/revamp/background-gradient'
import { SlideUpLink } from '@/components/revamp/slide-up-link'
import { Monitor, Info, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function DownloadPage() {
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
    <main className="relative min-h-screen overflow-hidden bg-black text-white pt-32 pb-24">
      <BackgroundGradient />
      <BackgroundGrid gridLineStyles={gridLineStyles} zIndex={1} />
      
      <Gutter className="relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-7xl font-medium tracking-tight mb-6">
              Get Tabby for <span className="text-blue-500 font-serif italic">Windows</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto">
              Start your journey with the intelligent keyboard layer. Experience real-time AI assistance across all your applications.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-medium"><span className="text-blue-500 font-serif italic">Windows</span> Desktop</h3>
                <p className="text-neutral-500">Latest Stable Version • .exe</p>
              </div>
            </div>

            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-white mt-1" />
                <div>
                  <h4 className="font-medium text-white">Universal Support</h4>
                  <p className="text-neutral-400 text-sm">Works seamlessly with Windows 10 and 11 (64-bit).</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-white mt-1" />
                <div>
                  <h4 className="font-medium text-white">System-Wide Integration</h4>
                  <p className="text-neutral-400 text-sm">Access AI from any code editor, browser, or document.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-white mt-1" />
                <div>
                  <h4 className="font-medium text-white">Secure by Design</h4>
                  <p className="text-neutral-400 text-sm">Your data and context stay locally processed when possible.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8">
              <SlideUpLink
                href="https://github.com/CubeStar1/ai-keyboard/releases/latest"
                label="Download Installer"
                variant="primary"
                size="lg"
                rotateText
              />
              <p className="text-neutral-500 text-xs mt-4 text-center">
                By downloading, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative group lg:block hidden"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-white/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative h-145 rounded-[2rem] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl">
              <Image
                src="/landing/tabby-actions.png"
                alt="Tabby in action"
                fill
                className="object-cover opacity-90 transition duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-32 max-w-4xl mx-auto px-4"
        >
          <div className="flex items-center gap-3 mb-12 justify-center">
            <Info className="w-6 h-6 text-neutral-400" />
            <h2 className="text-2xl font-medium tracking-tight">Installation Walkthrough</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Download',
                desc: 'Click the download button above to get the latest installer for Windows.'
              },
              {
                step: '02',
                title: 'Install',
                desc: 'Run the .exe file and follow the simple on-screen instructions to set up Tabby.'
              },
              {
                step: '03',
                title: 'Activate',
                desc: 'Sign in and use Ctrl + \\ to open the action panel'
              }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-4 relative">
                <div className="text-white/10 text-6xl font-mono absolute -top-8 -left-2 select-none z-0">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                  <p className="text-neutral-400 leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </Gutter>
    </main>
  )
}
