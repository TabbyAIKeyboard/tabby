"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence } from "motion/react"
import { CollapsedBrain } from "./collapsed-brain"
import { ExpandedPanel } from "./expanded-panel"
import useUser from "@/hooks/use-user"

interface Memory {
  id: string
  memory: string
  created_at: string
}

const MEMORY_API_URL = process.env.NEXT_PUBLIC_MEMORY_API_URL || "http://localhost:8000"

async function fetchRecentMemories(userId: string): Promise<Memory[]> {
  const response = await fetch(`${MEMORY_API_URL}/memory/get_all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  })
  const data = await response.json()
  const results = data.memories?.results || []
  return results.slice(0, 5)
}

export function BrainPanel() {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [captureEnabled, setCaptureEnabled] = useState(false)
  const [isLearning, setIsLearning] = useState(false)
  const [recentActivity, setRecentActivity] = useState<string | null>(null)
  
  const { data: user } = useUser()
  const userId = user?.id

  const { data: memories = [], refetch } = useQuery({
    queryKey: ["recent-memories", userId],
    queryFn: () => fetchRecentMemories(userId!),
    refetchInterval: 30000,
    enabled: !!userId,
  })

  useEffect(() => {
    if (!userId) return

    window.electron?.getContextCaptureEnabled?.().then(setCaptureEnabled)

    const cleanup = window.electron?.onMemoryStored?.((memory: string) => {
      setIsLearning(true)
      setRecentActivity(memory)
      refetch()
      setTimeout(() => setIsLearning(false), 2000)
      setTimeout(() => setRecentActivity(null), 5000)
    })

    const statusCleanup = window.electron?.onCaptureStatusChanged?.(setCaptureEnabled)

    const analyzeCleanup = window.electron?.onAnalyzeScreenshot?.(async (data) => {
      console.log('[BrainPanel] Received screenshot for analysis')
      setIsLearning(true)
      setRecentActivity('Processing screenshot...')
      
      try {
        const { uploadScreenshot, deleteScreenshot } = await import('@/lib/supabase/upload-screenshot')
        
        const uploadResult = await uploadScreenshot(data.dataUrl, userId)
        console.log('[BrainPanel] Uploaded to:', uploadResult.url)
        
        const response = await fetch(`${MEMORY_API_URL}/memory/add_image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: uploadResult.url,
            context: 'Analyze this screenshot and extract key context about what the user is working on.',
            user_id: userId,
            metadata: {
              source: 'screen_capture',
              captured_at: data.timestamp,
            },
          }),
        })
        
        const result = await response.json()
        console.log('[BrainPanel] Memory result:', result)
        
        if (result.success) {
          setRecentActivity('New context captured')
          refetch()
          window.electron?.notifyAnalysisComplete?.(true)
          
          setTimeout(() => {
            // deleteScreenshot(uploadResult.path).catch(console.error)
            console.log('[BrainPanel] Deleted screenshot after delay')
          }, 30000)
        } else {
        //   await deleteScreenshot(uploadResult.path)
        }
      } catch (error) {
        console.error('[BrainPanel] Analysis failed:', error)
        setRecentActivity('Analysis failed')
        window.electron?.notifyAnalysisComplete?.(false)
      }
      
      setTimeout(() => setIsLearning(false), 2000)
      setTimeout(() => setRecentActivity(null), 5000)
    })

    return () => {
      cleanup?.()
      statusCleanup?.()
      analyzeCleanup?.()
    }
  }, [refetch, userId])

  const handleToggleCapture = (enabled: boolean) => {
    setCaptureEnabled(enabled)
    window.electron?.setContextCaptureEnabled?.(enabled)
  }

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    window.electron?.setBrainPanelCollapsed?.(newCollapsed)
  }

  return (
    <div className="h-screen w-full flex items-start justify-end p-2">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <CollapsedBrain
            key="collapsed"
            isLearning={isLearning}
            captureEnabled={captureEnabled}
            onExpand={handleToggleCollapse}
          />
        ) : (
          <ExpandedPanel
            key="expanded"
            memories={memories}
            captureEnabled={captureEnabled}
            isLearning={isLearning}
            recentActivity={recentActivity}
            onCollapse={handleToggleCollapse}
            onToggleCapture={handleToggleCapture}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
