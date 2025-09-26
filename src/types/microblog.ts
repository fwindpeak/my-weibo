export interface MicroblogImage {
  id: string
  url: string
  altText?: string
}

export interface MicroblogUser {
  id: string
  username: string
  email: string
  isAdmin: boolean
}

export interface MicroblogLike {
  id: string
}

export interface MicroblogComment {
  id: string
  content: string
  createdAt: string
  user?: MicroblogUser
  guestName?: string
  guestEmail?: string
}

export interface Microblog {
  id: string
  content: string
  images: MicroblogImage[]
  likes: MicroblogLike[]
  comments: MicroblogComment[]
  createdAt: string
  user?: MicroblogUser
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
