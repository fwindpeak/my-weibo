export interface MicroblogImage {
  id: string
  url: string
  altText?: string | null
  createdAt?: string
}

export interface MicroblogUser {
  id: string
  username: string
  email: string
  isAdmin: boolean
}

export interface MicroblogLike {
  id: string
  userId: string
  createdAt?: string
}

export interface MicroblogComment {
  id: string
  content: string
  createdAt: string
  user?: MicroblogUser | null
  guestName?: string | null
  guestEmail?: string | null
}

export interface Microblog {
  id: string
  content: string
  images: MicroblogImage[]
  likes: MicroblogLike[]
  comments: MicroblogComment[]
  createdAt: string
  updatedAt?: string
  user?: MicroblogUser | null
}

export interface AppUser {
  id: string
  username: string
  email: string
  isAdmin: boolean
}

export interface GuestIdentity {
  name: string
  email: string
}
