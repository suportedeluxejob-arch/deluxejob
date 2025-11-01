// Sistema de avatares predefinidos para usuários
export const AVATAR_OPTIONS = [
  {
    id: "avatar-1",
    name: "Cyber Verde",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-1-13PZl1c1WZsQMGr9g4Tst1B7snZaMs.jpg",
    color: "bg-emerald-600",
  },
  {
    id: "avatar-2",
    name: "Luxo Diamante",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-2-u3sXDfSnjbZYy2mHjwIyf3kKKZ94lm.jpg",
    color: "bg-amber-600",
  },
  {
    id: "avatar-3",
    name: "Executivo",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-3-sO8jSd5V4sO2Db7aMFWc5Mi0JLxq1Z.jpg",
    color: "bg-blue-600",
  },
  {
    id: "avatar-4",
    name: "Tech Roxo",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-4-zum6Ty4UOFgXBBwOSZNrWA7H4qd2Av.jpg",
    color: "bg-purple-600",
  },
  {
    id: "avatar-5",
    name: "Cyber Smiley",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-5-d82jKunU7quq6w3TPSvEol7mGot7CL.jpg",
    color: "bg-cyan-600",
  },
  {
    id: "avatar-6",
    name: "Urbano",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-6-YpeCCjFzKafTOopqAfAH54P6VRz4Ym.jpg",
    color: "bg-slate-600",
  },
  {
    id: "avatar-7",
    name: "Anime Dark",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-7-iya583j3rWHr7kkPhJIsWA4W9spNVf.jpg",
    color: "bg-violet-600",
  },
  {
    id: "avatar-8",
    name: "Máscara Rosa",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-8-K9rzfs4H0AoWRTg7DXhLkUzw2NbxPX.jpg",
    color: "bg-pink-600",
  },
]

export const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length)
  return AVATAR_OPTIONS[randomIndex]
}

export const getAvatarById = (id: string) => {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === id) || AVATAR_OPTIONS[0]
}
