import useUser from '@/hooks/use-user'
import { cn } from '@/lib/utils'
import React from 'react'
import Image from 'next/image'
import { Avatar as DefaultAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
const Avatar = () => {
  const { data, isFetching } = useUser()
  const imageUrl = data?.user_metadata?.avatar_url
  return (
    <div
      className={cn(
        ' transition-all w-10 h-10',
        isFetching ? 'opacity-0 translate-y-2' : 'opacity-1 translate-y-0'
      )}
    >
      {!imageUrl ? (
        <DefaultAvatar className="h-16 w-16">
          <AvatarImage src={`https://avatar.vercel.sh/${data?.email}`} alt="avatar" />
          <AvatarFallback>{data?.email?.[0].toUpperCase()}</AvatarFallback>
        </DefaultAvatar>
      ) : (
        <Image
          src={imageUrl}
          alt=""
          width={50}
          height={50}
          className={cn(
            ' rounded-full border p-1 hover:scale-105 transition-all duration-500',
            isFetching ? 'opacity-0 translate-y-2' : 'opacity-1 translate-y-0'
          )}
        />
      )}
    </div>
  )
}
export default Avatar
