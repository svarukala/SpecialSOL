interface Props {
  email: string
  name?: string | null
}

export function UserAvatar({ email, name }: Props) {
  const initial = (name ?? email).charAt(0).toUpperCase()
  const displayName = name ?? email

  return (
    <div className="relative group flex items-center">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0 cursor-default select-none">
        {initial}
      </div>
      {/* Tooltip */}
      <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover:block">
        <div className="bg-popover border rounded-lg shadow-md px-3 py-2 text-xs whitespace-nowrap">
          <div className="font-medium text-foreground truncate max-w-[200px]">{displayName}</div>
          {name && <div className="text-muted-foreground truncate max-w-[200px]">{email}</div>}
        </div>
      </div>
    </div>
  )
}
