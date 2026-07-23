import { DEFAULT_AVATAR_SRC } from "../lib/avatar";

type UserAvatarSize = "sm" | "md" | "lg";

type UserAvatarProps = {
  size?: UserAvatarSize;
  className?: string;
  alt?: string;
};

const SIZE_PX: Record<UserAvatarSize, number> = {
  sm: 32,
  md: 64,
  lg: 120,
};

/** Renders the Squad Me default avatar image at sm / md / lg sizes. */
export function UserAvatar({ size = "sm", className = "", alt = "" }: UserAvatarProps) {
  const px = SIZE_PX[size];
  return (
    <span
      className={`user-avatar user-avatar--${size}${className ? ` ${className}` : ""}`}
      aria-hidden={alt ? undefined : true}
    >
      <img src={DEFAULT_AVATAR_SRC} alt={alt} width={px} height={px} decoding="async" />
    </span>
  );
}
