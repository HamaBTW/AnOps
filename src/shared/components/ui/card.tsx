import { cn } from "@/shared/lib/utils"

type CardVariant = "default" | "elevated" | "filled" | "interactive"
type CardSize = "default" | "sm" | "lg" | "xl"

const variantClasses: Record<CardVariant, string> = {
  default:
    "border border-border bg-card text-card-foreground shadow-sm",
  elevated:
    "border border-transparent bg-card text-card-foreground shadow-lg hover:shadow-xl",
  filled:
    "border border-muted bg-muted/50 text-card-foreground",
  interactive:
    "border border-border bg-card text-card-foreground shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5",
}

const sizeClasses: Record<CardSize, string> = {
  default: "p-6",
  sm: "p-4",
  lg: "p-8",
  xl: "p-10",
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  size?: CardSize
}

export const Card = ({
  className,
  variant = "default",
  size = "default",
  ...props
}: CardProps) => (
  <div
    className={cn(
      "rounded-lg transition-all duration-200 ease-in-out",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}
    {...props}
  />
)

Card.displayName = "Card"

export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
)
CardHeader.displayName = "CardHeader"

export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
)
CardTitle.displayName = "CardTitle"

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
)
CardDescription.displayName = "CardDescription"

export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
)
CardContent.displayName = "CardContent"

export const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
)
CardFooter.displayName = "CardFooter"