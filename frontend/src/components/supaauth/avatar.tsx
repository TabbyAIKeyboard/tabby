import useUser from '@/hooks/use-user'
import { cn } from '@/lib/utils'
import React from 'react'
import { Avatar as DefaultAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
const Avatar = () => {
  const { data, isFetching } = useUser()
  return (
    <div
      className={cn(
        ' transition-all w-10 h-10',
        isFetching ? 'opacity-0 translate-y-2' : 'opacity-1 translate-y-0'
      )}
    >
      <DefaultAvatar className="h-16 w-16">
        <AvatarImage src={`https://avatar.vercel.sh/${data?.email}`} alt="avatar" />
        <AvatarFallback>{data?.email?.[0]?.toUpperCase()}</AvatarFallback>
      </DefaultAvatar>
    </div>
  )
}
export default Avatar
