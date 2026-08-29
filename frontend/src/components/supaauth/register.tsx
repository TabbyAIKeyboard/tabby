'use client'

import React from 'react'
import SignUp from './signup'
import { postAuthPath } from '@/lib/constants'
import Image from 'next/image'
export default function Register() {
  const queryString = typeof window !== 'undefined' ? window?.location.search : ''
  const urlParams = new URLSearchParams(queryString)
  const appName = process.env.NEXT_PUBLIC_APP_NAME!
  const appIcon = process.env.NEXT_PUBLIC_APP_ICON!

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
          <h1 className="font-bold">Create Account</h1>
          <p className="text-sm">
            Your account lives on this device only - no email verification needed.
          </p>
        </div>
      </div>
      <SignUp redirectTo={next} />
    </div>
  )
}
