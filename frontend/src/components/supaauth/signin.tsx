'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v3'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useRefreshUser } from '@/hooks/use-user'
import { onboardingPath, postAuthPath } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const FormSchema = z.object({
  email: z.string().email({
    message: 'Invalid Email Address',
  }),
  password: z.string().min(6, {
    message: 'Password is too short',
  }),
})

export default function SignIn() {
  const queryString = typeof window !== 'undefined' ? window?.location.search : ''
  const urlParams = new URLSearchParams(queryString)
  const appName = process.env.NEXT_PUBLIC_APP_NAME!
  const appIcon = process.env.NEXT_PUBLIC_APP_ICON!

  // '/' is the frameless overlay window, never a landing page for this window.
  const nextParam = urlParams.get('next')
  const next = nextParam && nextParam !== '/' ? nextParam : postAuthPath
  return (
    <div className="w-full sm:w-[26rem] shadow sm:p-5  border dark:border-zinc-800 rounded-md">
      <div className="p-5 space-y-5">
        <div className="text-center space-y-3">
          <Image
            src={appIcon}
            alt={`${appName} Logo`}
            width={50}
            height={50}
            className=" rounded-full mx-auto"
          />
          <h1 className="font-bold">Sign in to {appName}</h1>
          <p className="text-sm">Welcome back! Your account is stored on this device.</p>
        </div>
        <SignInForm redirectTo={next} />
      </div>
    </div>
  )
}

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const [passwordReveal, setPasswordReveal] = useState(false)
  // Plain state rather than useTransition: tying the spinner to a router
  // transition leaves it spinning forever if the guard redirects mid-flight.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const refreshUser = useRefreshUser()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (isSubmitting) return

    if (!window.electron?.auth) {
      toast.error('Local auth is only available in the desktop app')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await window.electron.auth.signIn(data.email, data.password)

      if (!result.ok) {
        toast.error(result.error)
        setIsSubmitting(false)
        return
      }

      // Keep the legacy store key in sync for the main process consumers.
      window.electron.setUserId(result.user.id)
      refreshUser(result.user)

      // Leave the spinner up through navigation - the component unmounts.
      router.replace(result.user.onboardingComplete ? redirectTo || postAuthPath : onboardingPath)
    } catch (error) {
      console.error('[SignIn] Failed:', error)
      toast.error('Something went wrong signing in')
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className=" font-semibold  test-sm">Email Address</FormLabel>
              <FormControl>
                <Input className="h-8" placeholder="example@gmail.com" type="email" {...field} />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Password</FormLabel>
              <FormControl>
                <div className=" relative">
                  <Input className="h-8" type={passwordReveal ? 'text' : 'password'} {...field} />
                  <div
                    className="absolute right-2 top-[30%] cursor-pointer group"
                    onClick={() => setPasswordReveal(!passwordReveal)}
                  >
                    {passwordReveal ? (
                      <FaRegEye className=" group-hover:scale-105 transition-all" />
                    ) : (
                      <FaRegEyeSlash className=" group-hover:scale-105 transition-all" />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full h-8 bg-indigo-500 hover:bg-indigo-600 transition-all text-white flex items-center gap-2"
        >
          <AiOutlineLoading3Quarters
            className={cn(!isSubmitting ? 'hidden' : 'block animate-spin')}
          />
          Continue
        </Button>
      </form>
      <div className="text-center text-sm">
        <h1>
          Don&apos;t have an account yet?{' '}
          <Link
            href={redirectTo ? `/register?next=` + redirectTo : '/register'}
            className="text-blue-400"
          >
            Register
          </Link>
        </h1>
      </div>
    </Form>
  )
}
