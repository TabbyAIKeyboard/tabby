'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v3'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6'
import { RiArrowRightSFill } from 'react-icons/ri'
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
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useRefreshUser } from '@/hooks/use-user'
import { onboardingPath } from '@/lib/constants'

const FormSchema = z
  .object({
    email: z.string().email({
      message: 'Invalid Email Address',
    }),
    password: z.string().min(6, {
      message: 'Password is too short',
    }),
    'confirm-pass': z.string().min(6, {
      message: 'Password is too short',
    }),
  })
  .refine((data) => data['confirm-pass'] === data.password, {
    message: "Password does't match",
    path: ['confirm-pass'],
  })

export default function SignUp({ redirectTo }: { redirectTo: string }) {
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
      'confirm-pass': '',
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
      // Creates the account on-device and generates the user UUID.
      const result = await window.electron.auth.register(data.email, data.password)

      if (!result.ok) {
        toast.error(result.error)
        setIsSubmitting(false)
        return
      }

      // Keep the legacy store key in sync for the main process consumers.
      window.electron.setUserId(result.user.id)
      refreshUser(result.user)

      // New accounts always go through onboarding, which seeds the memory API.
      router.replace(onboardingPath)
    } catch (error) {
      console.error('[SignUp] Failed:', error)
      toast.error('Something went wrong creating your account')
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`p-5 space-y-5 ${isSubmitting ? 'animate-pulse' : ''}`}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
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
          <FormField
            control={form.control}
            name="confirm-pass"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Confirm Password</FormLabel>
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
            Create Account
            <RiArrowRightSFill className=" size-4" />
          </Button>
          <div className="text-center text-sm">
            <h1>
              Already have account?{' '}
              <Link
                href={redirectTo ? `/signin?next=` + redirectTo : '/signin'}
                className="text-blue-400"
              >
                Signin
              </Link>
            </h1>
          </div>
        </form>
      </Form>
    </div>
  )
}
