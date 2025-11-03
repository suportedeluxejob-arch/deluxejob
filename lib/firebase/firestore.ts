import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc, // Adicionando setDoc para criar documentos
  writeBatch,
  startAfter,
  arrayUnion, // Added arrayUnion for atomic array operations
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "./config"

// Tipos de dados
export interface UserProfile {
  uid: string
  username: string
  displayName: string
  bio: string
  profileImage: string
  level: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum" // Adicionado Bronze, Prata, Platinum
  userType: "user" | "creator"
  createdAt: any
  updatedAt: any
  lastSeen?: any
  xp?: number
  totalXp?: number
  isVerified?: boolean
  followerCount?: number
  contentCount?: number
  specialties?: string[] // Ex: ["lifestyle", "beauty", "fitness"]
  satisfaction?: number
  subscription?: {
    // Adicionado para Stripe integration
    tier: "prata" | "gold" | "platinum" | "diamante" | "bronze" // Adicionado bronze
    stripeSubscriptionId: string
    stripeCustomerId: string
    status: "active" | "canceled" | "past_due"
    currentPeriodEnd: Date
  }
  // Creator-specific fields
  coverImage?: string
  category?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  pricing?: {
    premium?: number
    diamante?: number
  }
  engagementLevel?: "iniciante" | "veterano" | "super_fa" | "embaixador" // Novo campo para nível de engajamento
  subscriptions?: Array<{
    creatorId: string
    creatorUsername: string
    creatorDisplayName: string
    tier: "prata" | "gold" | "platinum" | "diamante"
    stripeSubscriptionId: string
    status: "active" | "canceled" | "past_due"
    createdAt: Date
    currentPeriodEnd?: Date
  }>
  stripeCustomerId?: string // Novo campo para Stripe Customer ID global do usuário
}

export interface Post {
  id?: string
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorProfileImage: string
  authorUserType?: "user" | "creator" // Adicionando campo authorUserType
  content: string
  images: string[]
  videos: string[]
  likes: number
  comments: number
  retweets: number
  requiredLevel?: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum" // Adicionado Bronze, Prata, Platinum
  createdAt: any
  updatedAt: any
  tips?: number
  tipsAmount?: number
}

export interface Like {
  id?: string
  userId: string
  postId: string
  createdAt: any
}

export interface TemporaryStory {
  id?: string
  creatorId: string
  imageUrl: string
  videoUrl?: string
  caption?: string
  createdAt: any
  expiresAt: any
  duration: number // in hours: 24, 48, 72, 168 (7 days)
  views?: number
  viewedBy?: string[]
  // Removido: isTemporary - esta interface é APENAS para stories temporários
}

export interface Comment {
  id?: string
  userId: string
  postId: string
  username: string
  displayName: string
  profileImage: string
  content: string
  createdAt: any
}

export interface Retweet {
  id?: string
  userId: string
  postId: string
  originalAuthorId: string
  createdAt: any
  originalPost?: any
}

export interface Notification {
  id?: string
  userId: string
  type:
    | "message"
    | "welcome"
    | "upgrade"
    | "system"
    | "mission"
    | "level_up"
    | "xp_gained"
    | "follow"
    | "tier_upgrade"
    | "engagement_level_up"
  title: string
  message: string
  actionUrl?: string
  fromUserId?: string
  fromUsername?: string
  fromDisplayName?: string
  fromProfileImage?: string
  read: boolean // Corrigindo inconsistência no campo de leitura das notificações
  expiresAt: any
  createdAt: any
}

export interface NotificationTemplate {
  id?: string
  title: string
  message: string
  type: "welcome" | "promotion" | "announcement" | "custom" | "tier_upgrade" | "engagement_level_up"
  targetLevel: "all" | "Bronze" | "Prata" | "Gold" | "Diamante" | "Platinum" // Adicionado Platinum
  isActive: boolean
  isAutomatic?: boolean // Se é uma notificação automática
  triggerEvent?: "user_registration" | "tier_upgrade" | "engagement_level_up" // Evento que dispara a notificação
  createdAt: any
  createdBy?: string // Adicionado createdBy para rastrear quem criou o template
  scheduledFor?: string
}

interface AutomaticMessage {
  type: string
  content: string
  image?: string
  targetLevel?: string
  title?: string
}

export interface CreatorProfile extends UserProfile {
  userType: "creator"
  isVerified: boolean
  followerCount: number
  contentCount: number
  coverImage?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  pricing?: {
    premium?: number
    diamante?: number
  }
}

// Funções para Posts
export const createPost = async (postData: Omit<Post, "id" | "createdAt" | "updatedAt">) => {
  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating post:", error)
    throw error
  }
}

export const getPosts = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50))

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]
    callback(posts)
  })
}

export const getPostsByAuthor = async (authorUsername: string): Promise<Post[]> => {
  try {
    const postsRef = collection(db, "posts")
    const q = query(postsRef, where("authorUsername", "==", authorUsername))
    const querySnapshot = await getDocs(q)

    const posts = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
      }
    }) as Post[]

    const sortedPosts = posts.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    return sortedPosts
  } catch (error) {
    console.error("[v0] Error getting posts by author:", error)
    return []
  }
}

export const getPostsByAuthorPaginated = async (
  authorUsername: string,
  lastDoc?: any,
  limitCount = 15,
): Promise<{ posts: Post[]; hasMore: boolean; lastVisible: any }> => {
  // Use the existing getPostsByAuthor function that works
  const allPosts = await getPostsByAuthor(authorUsername)

  // Find the starting index based on lastDoc
  let startIndex = 0
  if (lastDoc) {
    const lastDocIndex = allPosts.findIndex((post) => post.id === lastDoc.id)
    startIndex = lastDocIndex >= 0 ? lastDocIndex + 1 : 0
  }

  // Get the slice of posts to show
  const endIndex = startIndex + limitCount
  const postsToShow = allPosts.slice(startIndex, endIndex)
  const hasMore = endIndex < allPosts.length

  const lastVisible = postsToShow.length > 0 ? postsToShow[postsToShow.length - 1] : null

  return { posts: postsToShow, hasMore, lastVisible }
}

export const getPostsPaginated = (
  callback: (posts: Post[], hasMore: boolean) => void,
  lastDoc?: any,
  limitCount = 10,
) => {
  let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount))

  if (lastDoc) {
    q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount))
  }

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    const hasMore = snapshot.docs.length === limitCount
    const lastDocument = snapshot.docs[snapshot.docs.length - 1]

    callback(posts, hasMore)
  })
}

export const getPostsPaginatedOptimized = (
  callback: (posts: Post[], hasMore: boolean) => void,
  lastDoc?: any,
  limitCount = 10,
) => {
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  let q = query(
    collection(db, "posts"),
    where("createdAt", ">=", twentyFourHoursAgo),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  )

  if (lastDoc) {
    q = query(
      collection(db, "posts"),
      where("createdAt", ">=", twentyFourHoursAgo),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(limitCount),
    )
  }

  return onSnapshot(q, async (snapshot) => {
    let posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    if (posts.length === 0 && !lastDoc) {
      const fallbackQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount))

      const fallbackSnapshot = await getDocs(fallbackQuery)
      posts = fallbackSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[]
    }

    const hasMore = snapshot.docs.length === limitCount
    callback(posts, hasMore)
  })
}

export const getPostsPaginatedImproved = (
  callback: (posts: Post[], hasMore: boolean, lastVisible: any) => void,
  lastDoc?: any,
  limitCount = 15,
) => {
  let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount + 1))

  if (lastDoc) {
    q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount + 1))
  }

  return onSnapshot(q, (snapshot) => {
    const allDocs = snapshot.docs
    const hasMore = allDocs.length > limitCount

    // Get only the requested number of posts
    const postsToShow = hasMore ? allDocs.slice(0, limitCount) : allDocs

    const posts = postsToShow.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    // The last visible document for pagination
    const lastVisible = postsToShow[postsToShow.length - 1]

    callback(posts, hasMore, lastVisible)
  })
}

export const loadMorePosts = async (
  lastDoc: any,
  limitCount = 15,
): Promise<{ posts: Post[]; hasMore: boolean; lastVisible: any }> => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount + 1))

  const snapshot = await getDocs(q)
  const allDocs = snapshot.docs
  const hasMore = allDocs.length > limitCount

  const postsToShow = hasMore ? allDocs.slice(0, limitCount) : allDocs

  const posts = postsToShow.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Post[]

  const lastVisible = postsToShow[postsToShow.length - 1]

  return { posts, hasMore, lastVisible }
}

// Funções para Perfis de Usuário
export const createUserProfile = async (profileData: Omit<UserProfile, "createdAt" | "updatedAt">) => {
  try {
    await updateDoc(doc(db, "users", profileData.uid), {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating user profile:", error)
    throw error
  }
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as UserProfile
    }
    return null
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      console.warn("[v0] Permission denied accessing user profile:", uid)
      return null
    }
    console.error("[v0] Error getting user profile:", error)
    return null
  }
}

export const getUserById = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        success: true,
        userData: { uid, ...docSnap.data() } as UserProfile,
      }
    }
    return { success: false, userData: null }
  } catch (error) {
    console.error("[v0] Error getting user by ID:", error)
    return { success: false, userData: null }
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<UserProfile, "displayName" | "bio" | "profileImage" | "level" | "xp" | "totalXp" | "satisfaction">
  > & {
    // Adicionado 'satisfaction' aqui
    coverImage?: string
    category?: string
    socialLinks?: {
      instagram?: string
      twitter?: string
      tiktok?: string
      youtube?: string
    }
    pricing?: {
      premium?: number
      diamante?: number
    }
    // Adicionado campos para atualização de assinatura global do usuário
    stripeCustomerId?: string
    // Adicionado campos para atualização de assinaturas específicas de criadores
    subscriptions?: Array<{
      creatorId: string
      creatorUsername: string
      creatorDisplayName: string
      tier: "prata" | "gold" | "platinum" | "diamante"
      stripeSubscriptionId: string
      status: "active" | "canceled" | "past_due"
      createdAt: Date
      currentPeriodEnd?: Date
    }>
  },
) {
  try {
    const userRef = doc(db, "users", uid)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })

    if (updates.displayName || updates.profileImage) {
      const postsRef = collection(db, "posts")
      const q = query(postsRef, where("authorId", "==", uid))
      const snapshot = await getDocs(q)

      if (snapshot.size > 0) {
        const batch = writeBatch(db)
        const postUpdates: any = {}

        if (updates.displayName) {
          postUpdates.authorDisplayName = updates.displayName
        }
        if (updates.profileImage) {
          postUpdates.authorProfileImage = updates.profileImage
        }

        snapshot.docs.forEach((postDoc) => {
          batch.update(postDoc.ref, postUpdates)
        })

        await batch.commit()
      }
    }
  } catch (error) {
    console.error("[v0] Error updating profile:", error)
    throw error
  }
}

export const createCreatorProfile = async (profileData: Omit<CreatorProfile, "createdAt" | "updatedAt">) => {
  try {
    await setDoc(
      doc(db, "users", profileData.uid),
      {
        ...profileData,
        userType: "creator",
        isVerified: false,
        followerCount: 0,
        contentCount: 0,
        satisfaction: 0, // Inicializando satisfaction para criadores
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[v0] Error creating creator profile:", error)
    throw error
  }
}

export const getCreatorProfile = async (creatorId: string): Promise<CreatorProfile | null> => {
  try {
    const userProfile = await getUserProfile(creatorId)

    if (!userProfile || userProfile.userType !== "creator") {
      return null
    }

    return userProfile as CreatorProfile
  } catch (error) {
    console.error("[v0] Error getting creator profile:", error)
    return null
  }
}

export const getAllCreators = async (limitCount = 50): Promise<CreatorProfile[]> => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userType", "==", "creator"), orderBy("followerCount", "desc"), limit(limitCount))
    const querySnapshot = await getDocs(q)

    const creators = querySnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as CreatorProfile[]

    return creators
  } catch (error) {
    console.error("[v0] Error getting all creators:", error)
    return []
  }
}

export const getCreatorsPaginated = async (
  lastDoc?: any,
  limitCount = 20,
): Promise<{ creators: CreatorProfile[]; hasMore: boolean; lastVisible: any }> => {
  try {
    const usersRef = collection(db, "users")

    // Buscar mais documentos para compensar a ordenação no cliente
    const fetchLimit = limitCount * 3

    let q = query(usersRef, where("userType", "==", "creator"), limit(fetchLimit))

    if (lastDoc) {
      q = query(usersRef, where("userType", "==", "creator"), startAfter(lastDoc), limit(fetchLimit))
    }

    const querySnapshot = await getDocs(q)
    const allDocs = querySnapshot.docs

    // Ordenar por followerCount no lado do cliente
    const sortedDocs = allDocs.sort((a, b) => {
      const aCount = a.data().followerCount || 0
      const bCount = b.data().followerCount || 0
      return bCount - aCount
    })

    const hasMore = sortedDocs.length >= limitCount
    const creatorsToShow = sortedDocs.slice(0, limitCount)

    const creators = creatorsToShow.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as CreatorProfile[]

    const lastVisible = creatorsToShow[creatorsToShow.length - 1]

    return { creators, hasMore, lastVisible }
  } catch (error) {
    console.error("[v0] Error getting paginated creators:", error)
    return { creators: [], hasMore: false, lastVisible: null }
  }
}

export const isUserCreator = async (uid: string): Promise<boolean> => {
  try {
    const userProfile = await getUserProfile(uid)
    return userProfile?.userType === "creator"
  } catch (error) {
    console.error("[v0] Error checking if user is creator:", error)
    return false
  }
}

export const convertUserToCreator = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid)
    await updateDoc(userRef, {
      userType: "creator",
      isVerified: false,
      followerCount: 0,
      contentCount: 0,
      satisfaction: 0,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error converting user to creator:", error)
    throw error
  }
}

export const updateCreatorFollowerCount = async (creatorUid: string, increment: number) => {
  try {
    const creatorRef = doc(db, "users", creatorUid)
    await updateDoc(creatorRef, {
      followerCount: increment > 0 ? increment(increment) : increment(-Math.abs(increment)),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator follower count:", error)
    throw error
  }
}

export const updateCreatorContentCount = async (creatorUid: string, incrementValue: number) => {
  try {
    const creatorRef = doc(db, "users", creatorUid)
    await updateDoc(creatorRef, {
      contentCount: increment(incrementValue),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator content count:", error)
    throw error
  }
}

// Funções para Curtidas
export const toggleLike = async (userId: string, postId: string) => {
  try {
    console.log("[v0] toggleLike called with userId:", userId, "postId:", postId)

    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("Você precisa estar autenticado para curtir posts")
    }

    if (currentUser.uid !== userId) {
      throw new Error("ID do usuário não corresponde ao usuário autenticado")
    }

    console.log("[v0] Current user authenticated:", currentUser.uid)

    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado")
    }

    const userData = userDoc.data()

    if (userData.userType === "creator") {
      throw new Error("Criadoras não podem curtir posts")
    }

    // Buscar o post para obter o authorId
    const postDoc = await getDoc(doc(db, "posts", postId))
    if (!postDoc.exists()) {
      throw new Error("Post não encontrado")
    }

    const postData = postDoc.data()
    const postAuthorId = postData.authorId

    const permissionCheck = await canUserPerformActionForCreator(userId, postAuthorId, "like")

    if (!permissionCheck.canPerform) {
      throw new Error(permissionCheck.reason || "Você não tem permissão para curtir posts desta criadora")
    }

    const likesRef = collection(db, "likes")
    const q = query(likesRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("[v0] Adding like...")
      // Adicionar curtida
      const likeDoc = await addDoc(likesRef, {
        userId,
        postId,
        createdAt: serverTimestamp(),
      })
      console.log("[v0] Like added with ID:", likeDoc.id)

      await updateDoc(doc(db, "posts", postId), {
        likes: increment(1),
      })

      const hasGainedXP = await hasUserGainedXPForPost(userId, postId, "like")
      let xpGained = 0

      if (!hasGainedXP) {
        xpGained = getXPForAction("like")
        await addXP(userId, xpGained, "like")
        await trackXPGained(userId, postId, "like", xpGained)
      }

      const updatedPostDoc = await getDoc(doc(db, "posts", postId))
      const likeCount = updatedPostDoc.data()?.likes || 0

      return { liked: true, xpGained, likeCount }
    } else {
      console.log("[v0] Removing like...")
      // Remover curtida
      const likeDoc = querySnapshot.docs[0]
      await deleteDoc(likeDoc.ref)
      console.log("[v0] Like removed")

      await updateDoc(doc(db, "posts", postId), {
        likes: increment(-1),
      })

      const updatedPostDoc = await getDoc(doc(db, "posts", postId))
      const likeCount = updatedPostDoc.data()?.likes || 0

      return { liked: false, xpGained: 0, likeCount }
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    throw error
  }
}

export const checkUserLiked = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const likesRef = collection(db, "likes")
    const q = query(likesRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    return !querySnapshot.empty
  } catch (error) {
    console.error("[v0] Error checking user liked:", error)
    return false
  }
}

// Funções para Retweets
export const toggleRetweet = async (userId: string, postId: string, originalAuthorId: string) => {
  try {
    // Verificar se o usuário é criadora - criadoras não podem retuitar posts
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado")
    }

    const userData = userDoc.data()

    if (userData.userType === "creator") {
      throw new Error("Criadoras não podem retuitar posts")
    }

    const postDoc = await getDoc(doc(db, "posts", postId))
    if (!postDoc.exists()) {
      throw new Error("Post não encontrado")
    }

    const postData = postDoc.data()
    const postAuthorId = postData.authorId || originalAuthorId

    const permissionCheck = await canUserPerformActionForCreator(userId, postAuthorId, "retweet")

    if (!permissionCheck.canPerform) {
      throw new Error(permissionCheck.reason || "Você não tem permissão para retuitar posts desta criadora")
    }

    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      await addDoc(retweetsRef, {
        userId,
        postId,
        originalAuthorId: postAuthorId,
        createdAt: serverTimestamp(),
        originalPost: {
          id: postId,
          content: postData.content || "",
          images: postData.images || [],
          authorDisplayName: postData.authorDisplayName || "",
          authorUsername: postData.authorUsername || "",
          authorProfileImage: postData.authorProfileImage || "/avatars/default.jpg",
          requiredLevel: postData.requiredLevel || "bronze",
          createdAt: postData.createdAt || serverTimestamp(),
          likes: postData.likes || 0,
          comments: postData.comments || 0,
          retweets: postData.retweets || 0,
        },
      })

      // Incrementar contador no post
      await updateDoc(doc(db, "posts", postId), {
        retweets: increment(1),
      })

      const hasGainedXP = await hasUserGainedXPForPost(userId, postId, "retweet")
      let xpGained = 0

      if (!hasGainedXP) {
        xpGained = getXPForAction("retweet")
        await addXP(userId, xpGained, "retweet")
        await trackXPGained(userId, postId, "retweet", xpGained)
      }

      return { retweeted: true, xpGained }
    } else {
      // Remover retweet
      const retweetDoc = querySnapshot.docs[0]
      await deleteDoc(retweetDoc.ref)

      // Decrementar contador no post
      await updateDoc(doc(db, "posts", postId), {
        retweets: increment(-1),
      })

      return { retweeted: false, xpGained: 0 }
    }
  } catch (error) {
    console.error("[v0] Error toggling retweet:", error)
    throw error
  }
}

export const getUserRetweets = async (userId: string) => {
  try {
    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)

    const retweets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return retweets.sort((a: any, b: any) => {
      const aTime = a.createdAt?.seconds || 0
      const bTime = b.createdAt?.seconds || 0
      return bTime - aTime // ordem decrescente (mais recente primeiro)
    })
  } catch (error) {
    console.error("[v0] Error getting user retweets:", error)
    return []
  }
}

export const checkUserRetweeted = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    return !querySnapshot.empty
  } catch (error) {
    console.error("[v0] Error checking user retweeted:", error)
    return false
  }
}

// Funções para Comentários
export const addComment = async (commentData: Omit<Comment, "id" | "createdAt">) => {
  try {
    // Verificar se o usuário é criadora - criadoras não podem comentar posts
    const userDoc = await getDoc(doc(db, "users", commentData.userId))
    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado")
    }

    const userData = userDoc.data()

    if (userData.userType === "creator") {
      throw new Error("Criadoras não podem comentar posts")
    }

    // Buscar o post para obter o authorId
    const postDoc = await getDoc(doc(db, "posts", commentData.postId))
    if (!postDoc.exists()) {
      throw new Error("Post não encontrado")
    }

    const postAuthorId = postDoc.data().authorId

    // Verificar se o usuário pode comentar posts desta criadora específica
    const permissionCheck = await canUserPerformActionForCreator(commentData.userId, postAuthorId, "comment")

    if (!permissionCheck.canPerform) {
      throw new Error(permissionCheck.reason || "Você não tem permissão para comentar posts desta criadora")
    }

    const docRef = await addDoc(collection(db, "comments"), {
      ...commentData,
      createdAt: serverTimestamp(),
    })

    // Incrementar contador de comentários no post
    await updateDoc(doc(db, "posts", commentData.postId), {
      comments: increment(1),
    })

    // Adicionar XP ao usuário
    const xpGained = getXPForAction("comment")
    await addXP(commentData.userId, xpGained, "comment") // Alterado para addXP

    return { commentId: docRef.id, xpGained }
  } catch (error) {
    console.error("[v0] Error adding comment:", error)
    throw error
  }
}

export const getPostComments = (postId: string, callback: (comments: Comment[]) => void) => {
  const q = query(collection(db, "comments"), where("postId", "==", postId))

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Comment[]

    // Ordenar no lado do cliente para evitar índice composto
    const sortedComments = comments.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    callback(sortedComments)
  })
}

// Funções adicionais
export const ensureUserDocument = async (uid: string, userData?: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, "users", uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      const isCreator = userData?.userType === "creator"

      const defaultUserData = {
        uid,
        username: userData?.username || `user_${uid.slice(0, 8)}`,
        displayName: userData?.displayName || userData?.username || "Usuário",
        bio: userData?.bio || "",
        profileImage: userData?.profileImage || "",
        level: "bronze", // Bronze é o nível inicial obrigatório para todos os usuários
        userType: userData?.userType || "user", // Tipo padrão é usuário normal
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        xp: 0,
        totalXp: 0,
        engagementLevel: "iniciante", // Inicializar com nível de engajamento inicial
        ...(isCreator ? { satisfaction: 0 } : {}), // Only add satisfaction for creators
      }

      await setDoc(userRef, defaultUserData, { merge: true })
    } else {
      // Se o usuário já existe e é um criador, garantir que 'satisfaction' esteja presente se não estiver
      if (userData?.userType === "creator" && userSnap.data()?.satisfaction === undefined) {
        await updateDoc(userRef, {
          satisfaction: 0,
          updatedAt: serverTimestamp(),
        })
      }

      // Garantir que 'engagementLevel' exista para todos os usuários
      if (userSnap.data()?.engagementLevel === undefined) {
        await updateDoc(userRef, {
          engagementLevel: "iniciante",
          updatedAt: serverTimestamp(),
        })
      }

      if (userData && userData.username) {
        await updateDoc(userRef, {
          username: userData.username,
          displayName: userData.displayName || userData.username,
          updatedAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
        })
      }
    }
  } catch (error) {
    console.error("[v0] Error ensuring user document:", error)
    throw error
  }
}

export const updateUserLastSeen = async (uid: string) => {
  try {
    // Primeiro garantir que o documento existe
    await ensureUserDocument(uid)

    // Depois atualizar o lastSeen
    await updateDoc(doc(db, "users", uid), {
      lastSeen: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating last seen:", error)
    // Não relançar o erro para não quebrar a aplicação
  }
}

export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    // Decodificar a URL para lidar com espaços (%20)
    const decodedUsername = decodeURIComponent(username)

    // Caso especial para o perfil da Isabelle
    if (decodedUsername === "isabellelua") {
      const isabelleProfile = await ensureIsabelleProfile()
      return {
        uid: "isabelle-lua-uid",
        username: "isabellelua",
        displayName: isabelleProfile.displayName,
        bio: isabelleProfile.bio,
        profileImage: isabelleProfile.profileImage,
        level: "diamante",
        createdAt: isabelleProfile.createdAt,
        updatedAt: isabelleProfile.updatedAt,
      } as UserProfile
    }

    const usersRef = collection(db, "users")
    const q = query(usersRef, where("username", "==", decodedUsername), limit(1))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { uid: doc.id, ...doc.data() } as UserProfile
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting user by username:", error)
    return null
  }
}

// Funções para deletar posts
export const deletePost = async (postId: string) => {
  try {
    await deleteDoc(doc(db, "posts", postId))

    const likesRef = collection(db, "likes")
    const likesQuery = query(likesRef, where("postId", "==", postId))
    const likesSnapshot = await getDocs(likesQuery)

    const deletePromises = []
    likesSnapshot.forEach((likeDoc) => {
      deletePromises.push(deleteDoc(likeDoc.ref))
    })

    // Deletar todos os comentários relacionados
    const commentsRef = collection(db, "comments")
    const commentsQuery = query(commentsRef, where("postId", "==", postId))
    const commentsSnapshot = await getDocs(commentsQuery) // <<< FIX: commentsComment -> commentsQuery

    commentsSnapshot.forEach((commentDoc) => {
      deletePromises.push(deleteDoc(commentDoc.ref))
    })

    // Deletar todos os retweets relacionados
    const retweetsRef = collection(db, "retweets")
    const retweetsQuery = query(retweetsRef, where("postId", "==", postId))
    const retweetsSnapshot = await getDocs(retweetsRef)

    retweetsSnapshot.forEach((retweetDoc) => {
      deletePromises.push(deleteDoc(retweetDoc.ref))
    })

    // Executar todas as deleções
    await Promise.all(deletePromises)

    return true
  } catch (error) {
    console.error("[v0] Error deleting post:", error)
    throw error
  }
}

// Funções para perfil específico da Isabelle
export const getIsabelleProfile = async () => {
  try {
    const docRef = doc(db, "profiles", "isabelle-lua")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data()
    }

    // Retornar dados padrão se não existir
    return {
      displayName: "Isabelle Lua",
      bio: "✨ Modelo & Influenciadora Digital\n💄 Beauty & Lifestyle Content\n🌟 Conteúdo Exclusivo Premium",
      profileImage: "/beautiful-woman-profile.png",
    }
  } catch (error) {
    console.error("[v0] Error getting Isabelle profile:", error)
    // Retornar dados padrão em caso de erro
    return {
      displayName: "Isabelle Lua",
      bio: "✨ Modelo & Influenciadora Digital\n💄 Beauty & Lifestyle Content\n🌟 Conteúdo Exclusivo Premium",
      profileImage: "/beautiful-woman-profile.png",
    }
  }
}

export const saveIsabelleProfile = async (profileData: any) => {
  try {
    await setDoc(
      doc(db, "profiles", "isabelle-lua"),
      {
        ...profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[v0] Error saving Isabelle profile:", error)
    throw error
  }
}

export const updateIsabelleStats = async (statsData: { followers: string; satisfaction: string }) => {
  try {
    await setDoc(
      doc(db, "profiles", "isabelle-lua"),
      {
        stats: {
          followers: statsData.followers,
          satisfaction: statsData.satisfaction,
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[v0] Error updating Isabelle stats:", error)
    throw error
  }
}

export const getIsabelleStats = async () => {
  try {
    const docRef = doc(db, "profiles", "isabelle-lua")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.stats || { followers: "2.1M", satisfaction: "98%" }
    }

    // Retornar dados padrão se não existir
    return { followers: "2.1M", satisfaction: "98%" }
  } catch (error) {
    console.error("[v0] Error getting Isabelle stats:", error)
    // Retornar dados padrão em caso de erro
    return { followers: "2.1M", satisfaction: "98%" }
  }
}

export const ensureIsabelleProfile = async () => {
  try {
    const docRef = doc(db, "profiles", "isabelle-lua")
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      const defaultIsabelleProfile = {
        displayName: "Isabelle Lua",
        bio: "✨ Modelo & Influenciadora Digital\n💄 Beauty & Lifestyle Content\n🌟 Conteúdo Exclusivo Premium",
        profileImage: "/beautiful-woman-profile.png",
        stats: {
          followers: "2.1M",
          satisfaction: "98%",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(docRef, defaultIsabelleProfile)
      return defaultIsabelleProfile
    }

    return docSnap.data()
  } catch (error) {
    console.error("[v0] Error ensuring Isabelle profile:", error)
    throw error
  }
}

export const ensureIsabelleUserDocument = async () => {
  try {
    const isabelleUid = "isabelle-lua-uid"
    const userRef = doc(db, "users", isabelleUid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      const isabelleProfile = await getIsabelleProfile()

      const isabelleUserData = {
        uid: isabelleUid,
        username: "isabellelua",
        displayName: isabelleProfile.displayName,
        bio: isabelleProfile.bio,
        profileImage: isabelleProfile.profileImage,
        level: "Gold",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        xp: 0,
        totalXp: 0,
        engagementLevel: "embaixador", // Isabelle's engagement level
      }

      await setDoc(userRef, isabelleUserData)
      return isabelleUserData
    }

    return { uid: isabelleUid, ...userSnap.data() }
  } catch (error) {
    console.error("[v0] Error ensuring Isabelle user document:", error)
    throw error
  }
}

export const createWelcomeNotificationWithTierInfo = async (userId: string) => {
  try {
    await createNotificationWithExpiry({
      userId,
      type: "welcome",
      title: "Bem-vindo à DeLuxe Job! 🎉",
      message:
        "Você começou no tier Bronze! Curta posts, comente e interaja para ganhar XP e subir de nível. Faça upgrade para Prata, Gold, Platinum ou Diamante para desbloquear conteúdos exclusivos!",
      fromUserId: "deluxe-platform",
      fromUsername: "DeLuxe Job",
      fromDisplayName: "DeLuxe Job",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("[v0] Error creating welcome notification with tier info:", error)
  }
}

export const createIsabelleMessageNotification = async (userId: string) => {
  try {
    await createNotificationWithExpiry({
      userId,
      type: "message",
      title: "Nova mensagem da DeLuxe Job! 💎",
      message: "A plataforma DeLuxe Job acabou de te enviar uma mensagem especial!",
      fromUserId: "deluxe-platform",
      fromUsername: "DeLuxe Job",
      fromDisplayName: "DeLuxe Job",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("[v0] Error creating DeLuxe Job message notification:", error)
  }
}

export const createNotificationWithExpiry = async (notificationData: {
  userId: string
  type:
    | "message"
    | "welcome"
    | "upgrade"
    | "system"
    | "mission"
    | "level_up"
    | "xp_gained"
    | "follow"
    | "tier_upgrade"
    | "engagement_level_up"
  title: string
  message: string
  fromUserId?: string
  fromUsername?: string
  fromDisplayName?: string
  fromProfileImage?: string
}) => {
  try {
    // Calcular data de expiração (24 horas a partir de agora)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: false, // Corrigindo inconsistência no campo de leitura das notificações
      expiresAt: expiresAt,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating notification:", error)
    throw error
  }
}

// export const cleanExpiredNotifications = async () => { ... }

export const getActiveUserNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), limit(50))

  return onSnapshot(q, (snapshot) => {
    const now = new Date()
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[]

    const activeNotifications = notifications
      .filter((notification) => {
        if (!notification.expiresAt) return false
        const expiresDate = notification.expiresAt.toDate
          ? notification.expiresAt.toDate()
          : new Date(notification.expiresAt)
        return expiresDate > now
      })
      .sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 10)

    callback(activeNotifications)
  })
}

export const createNotification = async (notificationData: {
  userId: string
  type: string
  message: string
  fromUserId?: string
  fromUsername?: string
  fromDisplayName?: string
  fromProfileImage?: string
}) => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: false, // Corrigindo inconsistência no campo de leitura das notificações
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating notification:", error)
    throw error
  }
}

export const getUserNotifications = (userId: string, callback: (notifications: any[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), limit(20))

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const sortedNotifications = notifications.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    callback(sortedNotifications)
  })
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true, // Mudando de isRead para read para consistência
    })
  } catch (error) {
    console.error("[v0] Error marking notification as read:", error)
    throw error
  }
}

export const deleteNotification = async (notificationId: string) => {
  try {
    await deleteDoc(doc(db, "notifications", notificationId))
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
  }
}

export const deleteIsabelleNotifications = async (userId?: string) => {
  try {
    const notificationsRef = collection(db, "notifications")
    let q

    if (userId) {
      // Remove notificações da DeLuxe para um usuário específico
      q = query(notificationsRef, where("userId", "==", userId), where("fromUserId", "==", "deluxe-platform-uid"))
    } else {
      // Remove todas as notificações da DeLuxe
      q = query(notificationsRef, where("fromUserId", "==", "deluxe-platform-uid"))
    }

    const querySnapshot = await getDocs(q)
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))

    await Promise.all(deletePromises)
    return querySnapshot.docs.length
  } catch (error) {
    console.error("[v0] Error deleting DeLuxe notifications:", error)
    throw error
  }
}

export const deleteFollowNotifications = async (userId: string) => {
  try {
    const notificationsRef = collection(db, "notifications")
    const q = query(notificationsRef, where("userId", "==", userId), where("type", "==", "follow"))
    const querySnapshot = await getDocs(q)

    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))

    await Promise.all(deletePromises)
  } catch (error) {
    console.error("[v0] Error deleting follow notifications:", error)
  }
}

export const updatePostCounters = async (
  postId: string,
  counters: {
    likes?: number
    comments?: number
    retweets?: number
  },
) => {
  try {
    const updateData: any = {}

    if (counters.likes !== undefined) {
      updateData.likes = Math.max(0, counters.likes)
    }
    if (counters.comments !== undefined) {
      updateData.comments = Math.max(0, counters.comments)
    }
    if (counters.retweets !== undefined) {
      updateData.retweets = Math.max(0, counters.retweets)
    }

    updateData.updatedAt = serverTimestamp()

    await updateDoc(doc(db, "posts", postId), updateData)
    return true
  } catch (error) {
    console.error("[v0] Error updating post counters:", error)
    throw error
  }
}

export const incrementPostCounter = async (
  postId: string,
  counterType: "likes" | "comments" | "retweets",
  amount = 1,
) => {
  try {
    const updateData: any = {
      [counterType]: increment(amount),
      updatedAt: serverTimestamp(),
    }

    await updateDoc(doc(db, "posts", postId), updateData)
    return true
  } catch (error) {
    console.error("[v0] Error incrementing post counter:", error)
    throw error
  }
}

export const createTierUpgradeNotification = async (userId: string, newTier: string) => {
  try {
    const tierMessages: Record<string, string> = {
      Prata:
        "Parabéns! 🥈 Você agora é Prata! Desbloqueou acesso a conteúdos exclusivos e pode ganhar mais XP nas missões.",
      Gold: "Incrível! 🥇 Você subiu para Gold! Agora tem acesso a stories exclusivos, conteúdos premium e missões especiais.",
      Platinum:
        "Fantástico! 💎 Você é Platinum agora! Acesso VIP a todo conteúdo, chat prioritário e recompensas exclusivas.",
      Diamante:
        "Extraordinário! 💎✨ Você alcançou o tier Diamante! Acesso total, benefícios exclusivos e status de membro elite!",
    }

    const message = tierMessages[newTier] || `Parabéns! Você subiu para o tier ${newTier}!`

    await createNotificationWithExpiry({
      userId,
      type: "tier_upgrade",
      title: `Upgrade para ${newTier}! 🎉`,
      message,
      fromUserId: "deluxe-platform",
      fromUsername: "DeLuxe",
      fromDisplayName: "DeLuxe",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("[v0] Error creating tier upgrade notification:", error)
  }
}

export const createEngagementLevelUpNotification = async (userId: string, newLevel: string) => {
  try {
    const levelMessages: Record<string, string> = {
      veterano:
        "Parabéns! ⭐ Seu status de engajamento subiu para Veterano! Continue interagindo para alcançar Super Fã.",
      super_fa: "Incrível! 💜 Você é agora um Super Fã! Seu engajamento é excepcional. Próximo nível: Embaixador!",
      embaixador:
        "Extraordinário! 👑 Você alcançou o status de Embaixador! Você é um dos membros mais engajados da plataforma!",
    }

    const message = levelMessages[newLevel] || `Parabéns! Seu status de engajamento subiu para ${newLevel}!`

    await createNotificationWithExpiry({
      userId,
      type: "engagement_level_up",
      title: `Status de Engajamento: ${newLevel}! 🎉`,
      message,
      fromUserId: "deluxe-platform",
      fromUsername: "DeLuxe",
      fromDisplayName: "DeLuxe",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("[v0] Error creating engagement level up notification:", error)
  }
}

// Função para atualizar nível do usuário
export const updateUserLevel = async (
  userId: string,
  newLevel: "Bronze" | "Prata" | "Gold" | "Platinum" | "Diamante",
) => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const currentLevel = userSnap.data().level

      // Atualizar o nível
      await updateDoc(userRef, {
        level: newLevel,
        updatedAt: serverTimestamp(),
      })

      // Se o nível mudou e não é Bronze (tier inicial), enviar notificação
      if (currentLevel !== newLevel && newLevel !== "Bronze") {
        await createTierUpgradeNotification(userId, newLevel)
      }
    }
  } catch (error) {
    console.error("[v0] Error updating user level:", error)
    throw error
  }
}

export const getCurrentUserLevel = async (
  uid: string,
): Promise<"Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum"> => {
  try {
    const userProfile = await getUserProfile(uid)
    return userProfile?.level || "bronze" // Default to bronze
  } catch (error) {
    console.error("[v0] Error getting current user level:", error)
    return "bronze"
  }
}

// Funções adicionais para sistema de XP e verificação de níveis
export const addXP = async (userId: string, xpAmount: number, reason: string) => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      console.error("[v0] User not found:", userId)
      return
    }

    const userData = userSnap.data()
    const currentTotalXp = userData.totalXp || 0
    const newTotalXp = currentTotalXp + xpAmount

    // Calcular nível de engajamento anterior e novo
    const oldEngagementLevel = calculateEngagementLevelFromXp(currentTotalXp)
    const newEngagementLevel = calculateEngagementLevelFromXp(newTotalXp)

    await updateDoc(userRef, {
      totalXp: newTotalXp,
      xp: increment(xpAmount),
      engagementLevel: newEngagementLevel,
    })

    // Se o nível de engajamento mudou, enviar notificação
    if (oldEngagementLevel !== newEngagementLevel) {
      await createEngagementLevelUpNotification(userId, newEngagementLevel)
    }

    // Notificação de XP ganho
    await addNotification(userId, {
      title: "XP Ganho! 🎉",
      message: `Você ganhou ${xpAmount} XP por ${reason}`,
      type: "xp_gained",
    })
  } catch (error) {
    console.error("[v0] Error adding XP:", error)
    throw error
  }
}

export const calculateEngagementLevelFromXp = (totalXP: number): string => {
  if (totalXP >= 7000) return "embaixador"
  if (totalXP >= 3000) return "super_fa"
  if (totalXP >= 1000) return "veterano"
  return "iniciante"
}

export const calculateLevelFromXP = (totalXP: number): string => {
  // This function is deprecated and should only be used for reference
  // Subscription tiers should only be updated through Stripe webhooks
  if (totalXP >= 6000) return "diamante"
  if (totalXP >= 3000) return "platinum"
  if (totalXP >= 1500) return "gold"
  if (totalXP >= 500) return "prata"
  return "bronze"
}

export const canUserPerformAction = (userLevel: string, action: "like" | "comment" | "retweet"): boolean => {
  const levelOrder = {
    bronze: 1,
    prata: 2,
    gold: 3,
    platinum: 4,
    diamante: 5,
  }
  const userLevelIndex = levelOrder[userLevel.toLowerCase() as keyof typeof levelOrder]

  switch (action) {
    case "like":
      return userLevelIndex >= 1 // Bronze can like
    case "comment":
      return userLevelIndex >= 3 // Gold can comment
    case "retweet":
      return userLevelIndex >= 2 // Silver can retweet
    default:
      return false
  }
}

export const getXPForAction = (action: "like" | "comment" | "retweet"): number => {
  switch (action) {
    case "like":
      return 100
    case "comment":
      return 200
    case "retweet":
      return 150
    default:
      return 0
  }
}

export const addNotification = async (
  userId: string,
  notification: {
    title: string
    message: string
    type: "mission" | "level_up" | "xp_gained" | "tier_upgrade" | "engagement_level_up" // Adicionado novos tipos
    actionUrl?: string
  },
) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      ...notification,
      read: false, // Corrigindo inconsistência no campo de leitura das notificações
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error adding notification:", error)
  }
}

export const hasUserGainedXPForPost = async (userId: string, postId: string, action: string): Promise<boolean> => {
  try {
    const xpTrackingRef = collection(db, "xp_tracking")
    const q = query(
      xpTrackingRef,
      where("userId", "==", userId),
      where("postId", "==", postId),
      where("action", "==", action),
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error("[v0] Error checking XP tracking:", error)
    return false
  }
}

export const trackXPGained = async (userId: string, postId: string, action: string, xpAmount: number) => {
  try {
    const xpTrackingRef = collection(db, "xp_tracking")
    await addDoc(xpTrackingRef, {
      userId,
      postId,
      action,
      xpAmount,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error tracking XP:", error)
  }
}

export const removeXPTracking = async (userId: string, postId: string, action: string) => {
  try {
    const xpTrackingRef = collection(db, "xp_tracking")
    const q = query(
      xpTrackingRef,
      where("userId", "==", userId),
      where("postId", "==", postId),
      where("action", "==", action),
    )
    const querySnapshot = await getDocs(q)

    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref)
    }
  } catch (error) {
    console.error("[v0] Error removing XP tracking:", error)
  }
}

// Funções para gerenciamento de stories
export interface Story {
  id?: string
  name: string
  coverImage: string
  requiredLevel: "Bronze" | "Prata" | "Gold" | "Diamante" | "Platinum" // Adicionado Bronze, Prata, Platinum
  images: string[]
  createdAt: any
  updatedAt: any
}

// These were specific to one creator and have been replaced by temporaryStories functions that work for ALL creators

// Função para limpar mensagens de um usuário
export const clearOldMessages = async (userId: string) => {
  try {
    const messagesRef = collection(db, "chatMessages")
    const q = query(messagesRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)

    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error("[v0] Error clearing old messages:", error)
    throw error
  }
}

// Use this function instead of createWelcomeNotification
export const createWelcomeNotification = async (userId: string) => {
  try {
    // Usar a nova função que inclui informações sobre o tier Bronze
    await createWelcomeNotificationWithTierInfo(userId)
  } catch (error) {
    console.error("[v0] Error creating welcome notification:", error)
  }
}

// Função para criar uma mensagem de boas-vindas para um usuário
export const createWelcomeMessage = async (userId: string) => {
  try {
    await clearOldMessages(userId)

    let welcomeMessage =
      "Olá! 💕 Bem-vindo(a) ao DeLuxe Isa! Sou a Isabelle e estou muito feliz em te ter aqui comigo! ✨"
    let welcomeImage = ""

    try {
      const configRef = doc(db, "config", "autoWelcomeMessage")
      const configSnap = await getDoc(configRef)

      if (configSnap.exists()) {
        const configData = configSnap.data()
        if (configData.message) {
          welcomeMessage = configData.message
        }
        if (configData.image) {
          welcomeImage = configData.image
        }
      }
    } catch (configError) {
      // Use default message
    }

    const messageData = {
      userId,
      userName: "Usuário",
      userLevel: "Gold",
      message: welcomeMessage,
      timestamp: serverTimestamp(),
      isRead: false,
      adminReply: null,
      isWelcomeMessage: true,
      ...(welcomeImage && { image: welcomeImage }),
    }

    await addDoc(collection(db, "chatMessages"), messageData)
  } catch (error) {
    console.error("[v0] Error creating welcome message:", error)
    throw error
  }
}

// Função para recriar mensagem de boas-vindas para usuários existentes
export const recreateWelcomeMessage = async (userId: string) => {
  try {
    await createWelcomeMessage(userId)
  } catch (error) {
    console.error("[v0] Error recreating welcome message:", error)
  }
}

// Funções para templates de notificação
export const createNotificationTemplate = async (templateData: Omit<NotificationTemplate, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "notificationTemplates"), {
      ...templateData,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating notification template:", error)
    throw error
  }
}

export const getNotificationTemplates = async (): Promise<NotificationTemplate[]> => {
  try {
    const q = query(collection(db, "notificationTemplates"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NotificationTemplate[]
  } catch (error) {
    console.error("[v0] Error getting notification templates:", error)
    return []
  }
}

export const deleteNotificationTemplate = async (templateId: string) => {
  try {
    await deleteDoc(doc(db, "notificationTemplates", templateId))
  } catch (error) {
    console.error("[v0] Error deleting notification template:", error)
  }
}

export const sendBulkNotifications = async (template: NotificationTemplate) => {
  try {
    // Buscar usuários baseado no nível alvo
    const usersRef = collection(db, "users")
    let usersQuery = query(usersRef)

    if (template.targetLevel !== "all") {
      usersQuery = query(usersRef, where("level", "==", template.targetLevel))
    }

    const usersSnapshot = await getDocs(usersQuery)
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    // Filtrar usuário da Isabelle
    const targetUsers = users.filter((user) => user.id !== "isabelle-lua-uid")

    // Criar notificações em lote
    const batch = writeBatch(db)
    const notificationsRef = collection(db, "notifications")

    targetUsers.forEach((user) => {
      const notificationRef = doc(notificationsRef)
      batch.set(notificationRef, {
        userId: user.id,
        title: template.title,
        message: template.message,
        type: template.type,
        read: false, // Corrigindo inconsistência no campo de leitura das notificações
        createdAt: serverTimestamp(),
        senderName: "DeLuxe",
        senderImage: "/deluxe-logo.png",
        fromUserId: "deluxe-platform-uid",
        fromUsername: "deluxe",
        fromDisplayName: "DeLuxe",
        fromProfileImage: "/deluxe-logo.png",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
    })

    await batch.commit()

    return targetUsers.length
  } catch (error) {
    console.error("[v0] Error sending bulk notifications:", error)
    throw error
  }
}

export const forceDeleteIsabelleNotifications = async (): Promise<{
  success: boolean
  removedCount: number
  message: string
}> => {
  try {
    const notificationsRef = collection(db, "notifications")
    const allNotificationsSnapshot = await getDocs(notificationsRef)

    const deluxeNotifications: any[] = []

    allNotificationsSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const title = data.title?.toLowerCase() || ""
      const message = data.message?.toLowerCase() || ""
      const fromDisplayName = data.fromDisplayName?.toLowerCase() || ""

      if (
        title.includes("deluxe") ||
        message.includes("deluxe") ||
        fromDisplayName.includes("deluxe") ||
        data.fromUserId === "deluxe-platform-uid" ||
        data.fromUsername === "deluxe"
      ) {
        deluxeNotifications.push(doc)
      }
    })

    const deletePromises = deluxeNotifications.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

    return {
      success: true,
      removedCount: deluxeNotifications.length,
      message: `${deluxeNotifications.length} notificações da DeLuxe foram removidas com sucesso!`,
    }
  } catch (error) {
    console.error("[v0] Erro durante a limpeza das notificações:", error)
    return {
      success: false,
      removedCount: 0,
      message: "Erro ao remover notificações da DeLuxe",
    }
  }
}

// Funções otimizadas para verificar likes em batch
export const checkUserLikedBatch = async (userId: string, postIds: string[]): Promise<Set<string>> => {
  if (postIds.length === 0) return new Set()

  try {
    const likesRef = collection(db, "likes")
    const q = query(likesRef, where("userId", "==", userId), where("postId", "in", postIds.slice(0, 10))) // Firestore limit
    const querySnapshot = await getDocs(q)

    const likedSet = new Set<string>()
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      likedSet.add(data.postId)
    })

    return likedSet
  } catch (error) {
    console.error("[v0] Error checking liked posts in batch:", error)
    return new Set()
  }
}

// Funções otimizadas para verificar retweets em batch
export const checkUserRetweetedBatch = async (userId: string, postIds: string[]): Promise<Set<string>> => {
  if (postIds.length === 0) return new Set()

  try {
    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId), where("postId", "in", postIds.slice(0, 10))) // Firestore limit
    const querySnapshot = await getDocs(q)

    const retweetedSet = new Set<string>()
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      retweetedSet.add(data.postId)
    })

    return retweetedSet
  } catch (error) {
    console.error("[v0] Error checking retweeted posts in batch:", error)
    return new Set()
  }
}

// Funções adicionais para sistema de XP e verificação de níveis
export const checkContentAccess = (userLevel: string, requiredLevel: string): boolean => {
  // Hierarquia correta dos níveis
  const levelOrder = {
    bronze: 1,
    prata: 2,
    gold: 3, // Nível gratuito mais alto
    platinum: 4, // Nível pago
    diamante: 5, // Nível premium
  }

  const userLevelNormalized = userLevel.toLowerCase()
  const requiredLevelNormalized = requiredLevel.toLowerCase()

  // Se o conteúdo é "gold gratuito", qualquer nível prata ou superior pode acessar
  if (requiredLevelNormalized === "gold") {
    return levelOrder[userLevelNormalized as keyof typeof levelOrder] >= levelOrder.prata
  }

  return (
    levelOrder[userLevelNormalized as keyof typeof levelOrder] >=
    levelOrder[requiredLevelNormalized as keyof typeof levelOrder]
  )
}

// Funções adicionais
export const getCurrentUser = async () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

// Função para limpar mensagens de boas-vindas antigas
export const clearOldWelcomeMessages = async () => {
  try {
    const messagesRef = collection(db, "chatMessages")
    const q = query(messagesRef, where("isWelcomeMessage", "==", true))
    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
  } catch (error) {
    console.error("[v0] Error clearing old welcome messages:", error)
    throw error
  }
}

// Função para remover notificações antigas
export const removeOldNotifications = async (daysOld = 7) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const q = query(collection(db, "notifications"), where("createdAt", "<", cutoffDate))

    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    return querySnapshot.size
  } catch (error) {
    console.error("[v0] Error removing old notifications:", error)
    throw error
  }
}

// Função para remover todas as notificações
export const removeAllNotifications = async () => {
  try {
    const q = query(collection(db, "notifications"))
    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    return querySnapshot.size
  } catch (error) {
    console.error("[v0] Error removing all notifications:", error)
    throw error
  }
}

export const sendAutomaticMessage = async (messageData: AutomaticMessage) => {
  try {
    let targetUsers: any[] = []

    if (messageData.targetLevel === "all") {
      const usersSnapshot = await getDocs(collection(db, "users"))
      targetUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } else {
      const usersQuery = query(collection(db, "users"), where("level", "==", messageData.targetLevel))
      const usersSnapshot = await getDocs(usersQuery)
      targetUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }

    targetUsers = targetUsers.filter((user) => user.id !== "isabelle-lua-uid")

    const batch = writeBatch(db)
    const messagesRef = collection(db, "chatMessages")

    targetUsers.forEach((user) => {
      const messageRef = doc(messagesRef)
      batch.set(messageRef, {
        userId: user.id,
        userName: user.displayName || user.username || "Usuário",
        userLevel: user.level || "Bronze",
        message: messageData.content,
        timestamp: serverTimestamp(),
        messageType: messageData.type,
        isFromIsabelle: true,
        senderName: "Isabelle Lua",
        senderImage: messageData.image || "/beautiful-woman-profile.png",
        read: false,
        adminReply: null,
      })
    })

    await batch.commit()
    return targetUsers.length
  } catch (error) {
    console.error("[v0] Error sending automatic message:", error)
    throw error
  }
}

export const clearAllOldMessages = async () => {
  try {
    const messagesQuery = query(collection(db, "chatMessages"))
    const messagesSnapshot = await getDocs(messagesQuery)

    const batch = writeBatch(db)
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
  } catch (error) {
    console.error("[v0] Error clearing old messages:", error)
    throw error
  }
}

export interface CreatorHighlight {
  id?: string
  creatorId: string
  creatorUsername: string
  name: string
  coverImage: string
  requiredLevel: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum"
  images: string[]
  // Removido: isTemporary e expiresAt - highlights são SEMPRE permanentes
  createdAt: any
  updatedAt: any
}

export interface CreatorService {
  id?: string
  creatorId: string
  creatorUsername: string
  serviceProductId: string // Reference to SERVICE_PRODUCTS
  isActive: boolean // Creator can enable/disable services
  customDescription?: string // Optional custom description
  coverImage?: string // Optional custom cover image
  isBestSeller?: boolean // Mark as best seller
  isExclusive?: boolean // Mark as exclusive/VIP
  displayOrder?: number // Custom ordering
  createdAt: any
  updatedAt: any
}

// Função para criar um novo destaque
export const createCreatorHighlight = async (
  highlightData: Omit<CreatorHighlight, "id" | "createdAt" | "updatedAt">,
) => {
  try {
    const docRef = await addDoc(collection(db, "creator-highlights"), {
      ...highlightData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating creator highlight:", error)
    throw error
  }
}

// Função para obter destaques de uma criadora específica
// Highlights são permanentes, não precisam de filtro de expiração
export const getCreatorHighlights = async (creatorId: string): Promise<CreatorHighlight[]> => {
  try {
    const highlightsRef = collection(db, "creator-highlights")
    // Apenas filtra por creatorId, sem orderBy para evitar necessidade de índice composto
    const q = query(highlightsRef, where("creatorId", "==", creatorId))
    const querySnapshot = await getDocs(q)

    const highlights = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorHighlight[]

    // Ordena no cliente por data de criação (mais recente primeiro)
    return highlights.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return dateB - dateA
    })
  } catch (error) {
    console.error("[v0] Error getting creator highlights:", error)
    return []
  }
}

// Função para atualizar um destaque
export const updateCreatorHighlight = async (highlightId: string, updates: Partial<CreatorHighlight>) => {
  try {
    await updateDoc(doc(db, "creator-highlights", highlightId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator highlight:", error)
    throw error
  }
}

// Função para deletar um destaque
export const deleteCreatorHighlight = async (highlightId: string) => {
  try {
    await deleteDoc(doc(db, "creator-highlights", highlightId))
  } catch (error) {
    console.error("[v0] Error deleting creator highlight:", error)
    throw error
  }
}

// Função para obter um destaque específico
export const getCreatorHighlightById = async (highlightId: string): Promise<CreatorHighlight | null> => {
  try {
    const docRef = doc(db, "creator-highlights", highlightId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CreatorHighlight
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting creator highlight by ID:", error)
    return null
  }
}

// Função para verificar se uma criadora pode editar um destaque
export const canCreatorEditHighlight = async (creatorId: string, highlightId: string): Promise<boolean> => {
  try {
    const highlight = await getCreatorHighlightById(highlightId)
    return highlight?.creatorId === creatorId
  } catch (error) {
    console.error("[v0] Error checking creator highlight permissions:", error)
    return false
  }
}

export const createCreatorService = async (serviceData: Omit<CreatorService, "id" | "createdAt" | "updatedAt">) => {
  try {
    const docRef = await addDoc(collection(db, "creator-services"), {
      ...serviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating creator service:", error)
    throw error
  }
}

export const getCreatorServices = async (creatorId: string): Promise<CreatorService[]> => {
  try {
    const servicesRef = collection(db, "creator-services")
    const q = query(servicesRef, where("creatorId", "==", creatorId))
    const querySnapshot = await getDocs(q)

    const services = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorService[]

    return services.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
  } catch (error) {
    console.error("[v0] Error getting creator services:", error)
    return []
  }
}

export const updateCreatorService = async (serviceId: string, updates: Partial<CreatorService>) => {
  try {
    await updateDoc(doc(db, "creator-services", serviceId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator service:", error)
    throw error
  }
}

export const deleteCreatorService = async (serviceId: string) => {
  try {
    await deleteDoc(doc(db, "creator-services", serviceId))
  } catch (error) {
    console.error("[v0] Error deleting creator service:", error)
    throw error
  }
}

// MLM network functions for financial office
import type { ReferralCode, CreatorNetwork, Transaction, CreatorFinancials } from "./types"

// Generate unique referral code
export const generateReferralCode = async (creatorUsername: string): Promise<string> => {
  const baseCode = creatorUsername
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8)
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${baseCode}${randomSuffix}`
}

// Create referral code for creator
export const createReferralCode = async (creatorId: string, creatorUsername: string): Promise<string> => {
  try {
    const code = await generateReferralCode(creatorUsername)

    await setDoc(doc(db, "referral_codes", code), {
      code,
      creatorId,
      creatorUsername,
      createdAt: serverTimestamp(),
      isActive: true,
    })

    return code
  } catch (error) {
    console.error("[v0] Error creating referral code:", error)
    throw error
  }
}

// Get referral code for creator
export const getCreatorReferralCode = async (creatorId: string): Promise<string | null> => {
  try {
    const codesRef = collection(db, "referral_codes")
    const q = query(codesRef, where("creatorId", "==", creatorId), where("isActive", "==", true))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().code
    }

    return null
  } catch (error) {
    console.error("[v0] Error getting referral code:", error)
    return null
  }
}

// Validate and get referral code info
export const validateReferralCode = async (code: string): Promise<ReferralCode | null> => {
  try {
    const codeDoc = await getDoc(doc(db, "referral_codes", code))

    if (codeDoc.exists() && codeDoc.data().isActive) {
      return { id: codeDoc.id, ...codeDoc.data() } as ReferralCode
    }

    return null
  } catch (error) {
    console.error("[v0] Error validating referral code:", error)
    return null
  }
}

// Add creator to network
export const addCreatorToNetwork = async (
  creatorId: string,
  creatorUsername: string,
  referralCode: string,
  referredByUsername: string,
): Promise<void> => {
  try {
    // Get the referrer's network info to determine level
    const referrerNetworkRef = collection(db, "creator_network")
    const referrerQuery = query(referrerNetworkRef, where("creatorUsername", "==", referredByUsername))
    const referrerSnapshot = await getDocs(referrerQuery)

    let level = 1 // Direct referral by default

    if (!referrerSnapshot.empty) {
      const referrerData = referrerSnapshot.docs[0].data()
      level = (referrerData.level || 0) + 1
    }

    await addDoc(collection(db, "creator_network"), {
      creatorId,
      creatorUsername,
      referredBy: referredByUsername,
      referralCode,
      level,
      joinedAt: serverTimestamp(),
      isActive: true,
      totalEarnings: 0,
      monthlyEarnings: 0,
      subscriberCount: 0,
    })
  } catch (error) {
    console.error("[v0] Error adding creator to network:", error)
    throw error
  }
}

// Get creator's network (all creators they referred)
export const getCreatorNetwork = async (creatorUsername: string): Promise<CreatorNetwork[]> => {
  try {
    const networkRef = collection(db, "creator_network")
    const q = query(networkRef, where("referredBy", "==", creatorUsername))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorNetwork[]
  } catch (error) {
    console.error("[v0] Error getting creator network:", error)
    return []
  }
}

// Get creator's full network tree (recursive)
export const getCreatorNetworkTree = async (creatorUsername: string, maxDepth = 3): Promise<any[]> => {
  try {
    const getNetworkLevel = async (username: string, currentDepth: number): Promise<any[]> => {
      if (currentDepth > maxDepth) return []

      const networkRef = collection(db, "creator_network")
      const q = query(networkRef, where("referredBy", "==", username))
      const querySnapshot = await getDocs(q)

      const creators = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data()
          const children = await getNetworkLevel(data.creatorUsername, currentDepth + 1)

          return {
            id: doc.id,
            ...data,
            children,
            depth: currentDepth,
          }
        }),
      )

      return creators
    }

    return await getNetworkLevel(creatorUsername, 1)
  } catch (error) {
    console.error("[v0] Error getting network tree:", error)
    return []
  }
}

// Create transaction
export const createTransaction = async (transactionData: Omit<Transaction, "id" | "createdAt">): Promise<void> => {
  try {
    await addDoc(collection(db, "transactions"), {
      ...transactionData,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating transaction:", error)
    throw error
  }
}

// Get creator transactions
export const getCreatorTransactions = async (creatorId: string, limitCount = 50): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, "transactions")
    const q = query(transactionsRef, where("creatorId", "==", creatorId), limit(limitCount))
    const querySnapshot = await getDocs(q)

    const transactions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[]

    // Sort in memory to avoid composite index requirement
    return transactions.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - a.getTime() // Corrected to compare dates
    })
  } catch (error) {
    console.error("[v0] Error getting transactions:", error)
    return []
  }
}

// Get or create creator financials
export const getCreatorFinancials = async (creatorId: string): Promise<CreatorFinancials> => {
  try {
    const financialsDoc = await getDoc(doc(db, "creator_financials", creatorId))

    if (financialsDoc.exists()) {
      return financialsDoc.data() as CreatorFinancials
    }

    // Create default financials
    const defaultFinancials: CreatorFinancials = {
      creatorId,
      availableBalance: 0,
      totalEarnings: 0,
      monthlyRevenue: 0,
      directEarnings: 0,
      networkEarnings: 0,
      totalWithdrawals: 0,
      lastUpdated: serverTimestamp(),
    }

    await setDoc(doc(db, "creator_financials", creatorId), defaultFinancials)

    return defaultFinancials
  } catch (error) {
    console.error("[v0] Error getting creator financials:", error)
    throw error
  }
}

// Update creator financials
export const updateCreatorFinancials = async (
  creatorId: string,
  updates: Partial<CreatorFinancials>,
): Promise<void> => {
  try {
    await updateDoc(doc(db, "creator_financials", creatorId), {
      ...updates,
      lastUpdated: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator financials:", error)
    throw error
  }
}

// Process MLM commissions when a creator earns money
export const processMLMCommissions = async (
  creatorId: string,
  grossAmountCents: number,
  fromUserId: string,
): Promise<number> => {
  try {
    // Get the creator's network info to find their upline
    const networkRef = collection(db, "creator_network")
    const creatorQuery = query(networkRef, where("creatorId", "==", creatorId))
    const creatorSnapshot = await getDocs(creatorQuery)

    if (creatorSnapshot.empty) {
      return 0
    }

    const creatorData = creatorSnapshot.docs[0].data()
    const creatorUsername = creatorData.creatorUsername
    let currentReferrer = creatorData.referredBy

    const commissionRates = [0.1, 0.05, 0.03, 0.02]
    const levelNames = ["Nível 1", "Nível 2", "Nível 3", "Nível 4"]
    let totalCommissionsPaidCents = 0

    // Process up to 4 levels of commissions
    for (let level = 0; level < 4 && currentReferrer; level++) {
      // Find the referrer's user ID
      const referrerQuery = query(networkRef, where("creatorUsername", "==", currentReferrer))
      const referrerSnapshot = await getDocs(referrerQuery)

      if (referrerSnapshot.empty) {
        break
      }

      const referrerData = referrerSnapshot.docs[0].data()
      const referrerId = referrerData.creatorId

      const commissionAmountCents = Math.floor(grossAmountCents * commissionRates[level])
      totalCommissionsPaidCents += commissionAmountCents

      // Create commission transaction
      await createTransaction({
        creatorId: referrerId,
        type: `commission_level_${level + 1}`,
        amount: commissionAmountCents,
        description: `Comissão ${levelNames[level]} de @${creatorUsername}`,
        status: "completed",
        fromUserId,
        relatedCreatorId: creatorId,
        relatedCreatorUsername: creatorUsername,
        createdAt: serverTimestamp(),
      })

      const referrerFinancials = await getCreatorFinancials(referrerId)
      await updateCreatorFinancials(referrerId, {
        availableBalance: (referrerFinancials.availableBalance || 0) + commissionAmountCents,
        networkEarnings: (referrerFinancials.networkEarnings || 0) + commissionAmountCents,
        totalEarnings: (referrerFinancials.totalEarnings || 0) + commissionAmountCents,
      })

      // Move up to the next level
      currentReferrer = referrerData.referredBy
    }

    return totalCommissionsPaidCents
  } catch (error) {
    console.error("[v0] Error processing MLM commissions:", error)
    throw error
  }
}

export const addCreatorToNetworkWithCode = async (
  creatorId: string,
  creatorUsername: string,
  referralCode: string,
): Promise<void> => {
  try {
    // Validate referral code
    const codeData = await validateReferralCode(referralCode)

    if (!codeData) {
      throw new Error("Código de indicação inválido ou inativo")
    }

    // Get referrer's username
    const referrerUsername = codeData.creatorUsername

    // Get the referrer's network info to determine level
    const referrerNetworkRef = collection(db, "creator_network")
    const referrerQuery = query(referrerNetworkRef, where("creatorUsername", "==", referrerUsername))
    const referrerSnapshot = await getDocs(referrerQuery)

    let level = 1 // Direct referral by default

    if (!referrerSnapshot.empty) {
      const referrerData = referrerSnapshot.docs[0].data()
      level = (referrerData.level || 0) + 1
    }

    // Add to network
    await addDoc(collection(db, "creator_network"), {
      creatorId,
      creatorUsername,
      referredBy: referrerUsername,
      referralCode,
      level,
      joinedAt: serverTimestamp(),
      isActive: true,
      totalEarnings: 0,
      monthlyEarnings: 0,
      subscriberCount: 0,
    })
  } catch (error) {
    console.error("[v0] Error adding creator to network:", error)
    throw error
  }
}

export const updateUserSubscription = async (
  userId: string,
  subscriptionData: Partial<{
    tier: "prata" | "gold" | "platinum" | "diamante" | "bronze"
    stripeSubscriptionId: string
    stripeCustomerId: string
    status: "active" | "canceled" | "past_due"
    currentPeriodEnd: Date
  }>,
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)

    if (subscriptionData.stripeCustomerId) {
      await updateDoc(userRef, {
        stripeCustomerId: subscriptionData.stripeCustomerId,
        updatedAt: serverTimestamp(),
      })
    }
  } catch (error) {
    console.error("[v0] Error updating user subscription:", error)
    throw error
  }
}

export const deleteOldWelcomeNotifications = async (userId?: string) => {
  try {
    const notificationsRef = collection(db, "notifications")
    let q

    if (userId) {
      q = query(notificationsRef, where("userId", "==", userId), where("type", "==", "welcome"))
    } else {
      q = query(notificationsRef, where("type", "==", "welcome"))
    }

    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)
    let deletedCount = 0
    querySnapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data()
      // If it doesn't have fromUserId or it's not from DeLuxe, delete it (old notifications)
      if (!data.fromUserId || data.fromUserId !== "deluxe-platform") {
        batch.delete(docSnapshot.ref)
        deletedCount++
      }
    })

    await batch.commit()
    return deletedCount
  } catch (error) {
    console.error("[v0] Error deleting old welcome notifications:", error)
    throw error
  }
}

export const createCreatorWithoutReferral = async (
  username: string,
  password: string,
  displayName: string,
  bio: string,
): Promise<{ user: any | null; error: string | null }> => {
  try {
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return { user: null, error: "Nome de usuário já está em uso" }
    }

    const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth")
    const email = `${username}@deluxeisa.app`

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    await updateProfile(userCredential.user, {
      displayName: displayName,
    })

    const creatorProfile = {
      uid: userCredential.user.uid,
      username,
      displayName,
      bio,
      profileImage: "/placeholder.svg?height=100&width=100",
      email,
      userType: "creator" as const,
      isVerified: false,
      followerCount: 0,
      contentCount: 0,
      level: "bronze" as const,
    }

    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        ...creatorProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    await createWelcomeNotification(userCredential.user.uid)

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("[v0] Error creating first creator:", error)
    if (error.code === "auth/email-already-in-use") {
      return { user: null, error: "Nome de usuário já está em uso" }
    }
    if (error.code === "auth/weak-password") {
      return { user: null, error: "Senha muito fraca. Use pelo menos 6 caracteres" }
    }
    return { user: null, error: "Erro ao criar criadora. Tente novamente." }
  }
}

export const getAllBronzePosts = async (): Promise<Array<Post & { creatorProfile: UserProfile }>> => {
  try {
    const postsRef = collection(db, "posts")
    const q = query(postsRef, where("requiredLevel", "==", "Bronze"), limit(50))
    const querySnapshot = await getDocs(q)

    const posts = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    return posts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
  } catch (error) {
    console.error("[v0] Error getting all bronze posts:", error)
    return []
  }
}

export const getAllBronzeHighlights = async (
  limitCount = 100,
): Promise<Array<CreatorHighlight & { creatorProfile: CreatorProfile }>> => {
  try {
    const highlightsRef = collection(db, "creator-highlights")
    const q = query(
      highlightsRef,
      where("requiredLevel", "==", "Bronze"),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    )
    const querySnapshot = await getDocs(q)

    const highlights = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorHighlight[]

    const uniqueCreatorIds = Array.from(new Set(highlights.map((h) => h.creatorId)))

    const profilesMap = new Map<string, CreatorProfile>()
    const batchSize = 3

    for (let i = 0; i < uniqueCreatorIds.length; i += batchSize) {
      const batch = uniqueCreatorIds.slice(i, i + batchSize)
      const profiles = await Promise.all(
        batch.map(async (creatorId) => {
          try {
            const profile = await getUserProfile(creatorId)
            return { creatorId, profile }
          } catch (error) {
            console.error(`[v0] Error loading profile for ${creatorId}:`, error)
            return { creatorId, profile: null }
          }
        }),
      )

      profiles.forEach(({ creatorId, profile }) => {
        if (profile) {
          profilesMap.set(creatorId, profile)
        }
      })
    }

    return highlights
      .map((highlight) => {
        const creatorProfile = profilesMap.get(highlight.creatorId)
        if (!creatorProfile) return null
        return { ...highlight, creatorProfile }
      })
      .filter((item): item is CreatorHighlight & { creatorProfile: CreatorProfile } => item !== null)
  } catch (error) {
    console.error("[v0] Error getting bronze highlights:", error)
    return []
  }
}

export const addCreatorSubscription = async (
  userId: string,
  subscription: {
    creatorId: string
    creatorUsername: string
    creatorDisplayName: string
    tier: "prata" | "gold" | "platinum" | "diamante"
    stripeSubscriptionId: string
    status: "active" | "canceled" | "past_due"
    currentPeriodEnd?: Date
  },
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error("User not found")
    }

    const userData = userSnap.data() as UserProfile
    const currentSubscriptions = userData.subscriptions || []

    const existingIndex = currentSubscriptions.findIndex((sub: any) => sub.creatorId === subscription.creatorId)

    const newSubscription = {
      ...subscription,
      createdAt: new Date(),
      currentPeriodEnd: subscription.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }

    if (existingIndex >= 0) {
      currentSubscriptions[existingIndex] = newSubscription
    } else {
      currentSubscriptions.push(newSubscription)
    }

    const tierHierarchy = { bronze: 0, prata: 1, gold: 2, platinum: 3, diamante: 4 }
    const activeSubscriptions = currentSubscriptions.filter((sub: any) => sub.status === "active")

    let highestTier: "Bronze" | "Prata" | "Gold" | "Platinum" | "Diamante" = "Bronze"
    let highestTierValue = 0

    for (const sub of activeSubscriptions) {
      const tierValue = tierHierarchy[sub.tier as keyof typeof tierHierarchy] || 0
      if (tierValue > highestTierValue) {
        highestTierValue = tierValue
        // Converter para Title Case
        highestTier = (sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)) as any
      }
    }

    await updateDoc(userRef, {
      subscriptions: currentSubscriptions,
      level: highestTier,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error adding creator subscription:", error)
    throw error
  }
}

export const cancelCreatorSubscription = async (userId: string, creatorId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error("User not found")
    }

    const userData = userSnap.data() as UserProfile // Cast to UserProfile for type safety
    const currentSubscriptions = userData.subscriptions || []

    // Atualiza status da assinatura para canceled
    const updatedSubscriptions = currentSubscriptions.map((sub: any) => {
      if (sub.creatorId === creatorId) {
        return { ...sub, status: "canceled" }
      }
      return sub
    })

    await updateDoc(userRef, {
      subscriptions: updatedSubscriptions,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error canceling creator subscription:", error)
    throw error
  }
}

export const getUserActiveSubscriptions = async (userId: string): Promise<any[]> => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return []
    }

    const userData = userSnap.data() as UserProfile // Cast to UserProfile for type safety
    const subscriptions = userData.subscriptions || []

    return subscriptions.filter((sub: any) => sub.status === "active")
  } catch (error) {
    console.error("[v0] Error getting user subscriptions:", error)
    return []
  }
}

export const createTip = async (tipData: {
  postId: string
  senderId: string
  senderUsername: string
  senderDisplayName: string
  creatorId: string
  creatorUsername: string
  amount: number
  message?: string
  stripePaymentIntentId: string
}) => {
  try {
    const platformFee = Math.floor(tipData.amount * 0.15 * 100) / 100 // 15%
    const creatorAmount = Math.floor(tipData.amount * 0.85 * 100) / 100 // 85%

    const tipDoc = await addDoc(collection(db, "tips"), {
      ...tipData,
      platformFee,
      creatorAmount,
      status: "pending",
      createdAt: serverTimestamp(),
    })

    return tipDoc.id
  } catch (error) {
    console.error("[v0] Error creating tip:", error)
    throw error
  }
}

export const updateTipStatus = async (tipId: string, status: "completed" | "failed") => {
  try {
    await updateDoc(doc(db, "tips", tipId), {
      status,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating tip status:", error)
    throw error
  }
}

export const incrementPostTips = async (postId: string, amount: number) => {
  try {
    const postRef = doc(db, "posts", postId)
    await updateDoc(postRef, {
      tips: increment(1),
      tipsAmount: increment(amount),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error incrementing post tips:", error)
    throw error
  }
}

export const getPostTips = async (postId: string) => {
  try {
    const tipsQuery = query(
      collection(db, "tips"),
      where("postId", "==", postId),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
    )

    const snapshot = await getDocs(tipsQuery)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("[v0] Error getting post tips:", error)
    return []
  }
}

export const getUserTipsSent = async (userId: string) => {
  try {
    const tipsQuery = query(
      collection(db, "tips"),
      where("senderId", "==", userId),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
      limit(50),
    )

    const snapshot = await getDocs(tipsQuery)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("[v0] Error getting user tips sent:", error)
    return []
  }
}

export const getCreatorTipsReceived = async (creatorId: string) => {
  try {
    const tipsQuery = query(
      collection(db, "tips"),
      where("creatorId", "==", creatorId),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
      limit(100),
    )

    const snapshot = await getDocs(tipsQuery)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("[v0] Error getting creator tips received:", error)
    return []
  }
}

// CHANGE: Adding creditCreatorBalance function for tip processing
export const creditCreatorBalance = async (creatorId: string, amountCents: number): Promise<void> => {
  try {
    const financials = await getCreatorFinancials(creatorId)
    await updateCreatorFinancials(creatorId, {
      availableBalance: (financials.availableBalance || 0) + amountCents,
      totalEarnings: (financials.totalEarnings || 0) + amountCents,
      directEarnings: (financials.directEarnings || 0) + amountCents,
    })
  } catch (error) {
    console.error("[v0] Error crediting creator balance:", error)
    throw error
  }
}

// CHANGE: Nova função para atualizar o nível do usuário baseado em suas assinaturas ativas
/**
 * Atualiza o nível global do usuário baseado no maior tier entre suas assinaturas ativas
 * Esta função deve ser chamada sempre que uma assinatura for criada, atualizada ou cancelada
 *
 * @param userId - ID do usuário
 * @returns Promise<void>
 */
export const updateUserLevelFromSubscriptions = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      console.error("[v0] User not found:", userId)
      return
    }

    const userData = userSnap.data() as UserProfile
    const subscriptions = userData.subscriptions || []

    const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === "active")

    // Hierarquia de tiers (lowercase como no tipo SubscriptionTier)
    const tierHierarchy: Array<"bronze" | "prata" | "gold" | "platinum" | "diamante"> = [
      "bronze",
      "prata",
      "gold",
      "platinum",
      "diamante",
    ]

    // Mapeamento de lowercase para Title Case (como esperado no campo level)
    const tierToLevelMap: Record<string, "Bronze" | "Prata" | "Gold" | "Platinum" | "Diamante"> = {
      bronze: "Bronze",
      prata: "Prata",
      gold: "Gold",
      platinum: "Platinum",
      diamante: "Diamante",
    }

    // Determinar o maior tier entre as assinaturas ativas
    let maxTierIndex = 0 // Bronze é o padrão (índice 0)

    for (const subscription of activeSubscriptions) {
      const tierIndex = tierHierarchy.indexOf(subscription.tier)
      if (tierIndex > maxTierIndex) {
        maxTierIndex = tierIndex
      }
    }

    const newTierLowercase = tierHierarchy[maxTierIndex]
    const newLevel = tierToLevelMap[newTierLowercase]
    const currentLevel = userData.level

    if (currentLevel !== newLevel) {
      await updateUserLevel(userId, newLevel)
    }
  } catch (error) {
    console.error("[v0] Error updating user level from subscriptions:", error)
    throw error
  }
}

// CHANGE: Adicionando função para deletar temporary stories
export const deleteTemporaryStory = async (storyId: string, creatorId: string): Promise<void> => {
  try {
    const storyRef = doc(db, "temporaryStories", storyId)
    const storyDoc = await getDoc(storyRef)

    if (!storyDoc.exists()) {
      throw new Error("Story not found")
    }

    const storyData = storyDoc.data() as TemporaryStory

    // Verify that the user is the creator of the story
    if (storyData.creatorId !== creatorId) {
      throw new Error("Unauthorized: You can only delete your own stories")
    }

    await deleteDoc(storyRef)
  } catch (error) {
    console.error("[v0] Error deleting temporary story:", error)
    throw error
  }
}

// CHANGE: Adicionando função para verificar se o usuário tem stories não vistos
export const hasUnviewedStories = async (creatorId: string, userId: string): Promise<boolean> => {
  try {
    const activeStories = await getCreatorActiveStories(creatorId)

    // If no active stories, return false
    if (activeStories.length === 0) return false

    // Check if any story hasn't been viewed by this user
    const hasUnviewed = activeStories.some((story) => {
      const viewedBy = story.viewedBy || []
      return !viewedBy.includes(userId)
    })

    return hasUnviewed
  } catch (error) {
    console.error("[v0] Error checking unviewed stories:", error)
    return false
  }
}

// CHANGE: Adicionando função para verificar permissões por criadora específica
export const canUserPerformActionForCreator = async (
  userId: string,
  creatorId: string,
  action: "like" | "comment" | "retweet",
): Promise<{ canPerform: boolean; reason?: string }> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      return { canPerform: false, reason: "Usuário não encontrado" }
    }

    const userData = userDoc.data()

    if (action === "like") {
      return { canPerform: true }
    }

    const subscriptions = userData.subscriptions || []

    // Procura assinatura ativa para essa criadora específica
    const creatorSubscription = subscriptions.find((sub: any) => sub.creatorId === creatorId && sub.status === "active")

    if (!creatorSubscription) {
      return {
        canPerform: false,
        reason: "Você precisa assinar esta criadora para realizar esta ação",
      }
    }

    // Verifica se o tier da assinatura permite a ação
    const levelOrder = {
      bronze: 1,
      prata: 2,
      gold: 3,
      platinum: 4,
      diamante: 5,
    }

    const userTierIndex = levelOrder[creatorSubscription.tier.toLowerCase() as keyof typeof levelOrder]

    switch (action) {
      case "retweet":
        if (userTierIndex >= 2) {
          return { canPerform: true }
        }
        return {
          canPerform: false,
          reason: "Você precisa ser assinante Prata ou superior para retuitar",
        }
      case "comment":
        if (userTierIndex >= 3) {
          return { canPerform: true }
        }
        return {
          canPerform: false,
          reason: "Você precisa ser assinante Gold ou superior para comentar",
        }
      default:
        return { canPerform: false }
    }
  } catch (error) {
    console.error("[v0] Error checking user permissions:", error)
    return { canPerform: false, reason: "Erro ao verificar permissões" }
  }
}

export const syncUserLevel = async (userId: string): Promise<void> => {
  try {
    await updateUserLevelFromSubscriptions(userId)
  } catch (error) {
    console.error("[v0] Error syncing user level:", error)
  }
}

export const hasActiveStories = async (creatorId: string): Promise<boolean> => {
  try {
    const activeStories = await getCreatorActiveStories(creatorId)
    return activeStories.length > 0
  } catch (error) {
    console.error("[v0] Error checking active stories:", error)
    return false
  }
}

const storiesCache = new Map<string, { stories: TemporaryStory[]; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minuto

// Kept only this optimized version with cache for getCreatorActiveStories
export const getCreatorActiveStories = async (creatorId: string): Promise<TemporaryStory[]> => {
  try {
    // Verifica cache
    const cached = storiesCache.get(creatorId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.stories
    }

    const storiesRef = collection(db, "temporaryStories")
    const now = new Date()

    // A ordenação será feita no cliente
    const q = query(
      storiesRef,
      where("creatorId", "==", creatorId),
      limit(50), // Aumentado limite para garantir que pegamos todos os stories ativos
    )

    const querySnapshot = await getDocs(q)

    const stories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TemporaryStory[]

    const activeStories = stories
      .filter((story) => {
        const expiresAt = story.expiresAt?.toDate ? story.expiresAt.toDate() : new Date(story.expiresAt)
        return expiresAt > now
      })
      .sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return bDate.getTime() - aDate.getTime() // Ordem decrescente (mais recente primeiro)
      })
      .slice(0, 10) // Limita a 10 stories após ordenação

    // Atualiza cache
    storiesCache.set(creatorId, { stories: activeStories, timestamp: Date.now() })

    return activeStories
  } catch (error) {
    console.error("[v0] Error getting creator active stories:", error)
    return []
  }
}

export const clearStoriesCache = (creatorId?: string) => {
  if (creatorId) {
    storiesCache.delete(creatorId)
  } else {
    storiesCache.clear()
  }
}

export const saveStoryToHighlight = async (storyId: string, highlightId: string): Promise<void> => {
  try {
    const storyRef = doc(db, "temporaryStories", storyId)
    const storyDoc = await getDoc(storyRef)

    if (!storyDoc.exists()) {
      throw new Error("Story not found")
    }

    const storyData = storyDoc.data() as TemporaryStory

    // Add the story image to the highlight
    const highlightRef = doc(db, "creatorHighlights", highlightId)
    const highlightDoc = await getDoc(highlightRef)

    if (highlightDoc.exists()) {
      const highlightData = highlightDoc.data()
      const images = highlightData.images || []

      await updateDoc(highlightRef, {
        images: [...images, storyData.imageUrl],
        updatedAt: serverTimestamp(),
      })
    }
  } catch (error) {
    console.error("[v0] Error saving story to highlight:", error)
    throw error
  }
}

export const deleteExpiredStories = async (): Promise<number> => {
  try {
    const storiesRef = collection(db, "temporaryStories")
    const now = new Date()

    const querySnapshot = await getDocs(storiesRef)

    const expiredStories = querySnapshot.docs.filter((doc) => {
      const story = doc.data() as TemporaryStory
      const expiresAt = story.expiresAt?.toDate ? story.expiresAt.toDate() : new Date(story.expiresAt)
      return expiresAt <= now
    })

    // Deleta as imagens do Blob Storage primeiro
    const imageDeletePromises = expiredStories.map(async (doc) => {
      const story = doc.data() as TemporaryStory
      if (story.imageUrl) {
        try {
          await fetch(`/api/blob/delete?url=${encodeURIComponent(story.imageUrl)}`, {
            method: "DELETE",
          })
        } catch (error) {
          console.error("[v0] Error deleting story image:", error)
        }
      }
      if (story.videoUrl) {
        try {
          await fetch(`/api/blob/delete?url=${encodeURIComponent(story.videoUrl)}`, {
            method: "DELETE",
          })
        } catch (error) {
          console.error("[v0] Error deleting story video:", error)
        }
      }
    })

    await Promise.all(imageDeletePromises)

    // Depois deleta os documentos do Firestore
    const docDeletePromises = expiredStories.map((doc) => deleteDoc(doc.ref))
    await Promise.all(docDeletePromises)

    console.log(`[v0] Deleted ${expiredStories.length} expired stories and their media`)
    return expiredStories.length
  } catch (error) {
    console.error("[v0] Error deleting expired stories:", error)
    return 0
  }
}

export const createTemporaryStory = async (
  creatorId: string,
  imageUrl: string,
  duration = 24,
  caption?: string,
  videoUrl?: string,
): Promise<string> => {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + duration * 60 * 60 * 1000) // duration in hours

    const storyData = {
      creatorId,
      imageUrl,
      videoUrl: videoUrl || null,
      caption: caption || "",
      createdAt: serverTimestamp(),
      expiresAt,
      duration,
      views: 0,
      viewedBy: [],
    }

    const docRef = await addDoc(collection(db, "temporaryStories"), storyData)
    console.log("[v0] Created temporary story:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating temporary story:", error)
    throw error
  }
}

export const markStoryAsViewed = async (storyId: string, userId: string): Promise<void> => {
  try {
    const storyRef = doc(db, "temporaryStories", storyId)
    const storyDoc = await getDoc(storyRef)

    if (storyDoc.exists()) {
      const storyData = storyDoc.data() as TemporaryStory
      const viewedBy = storyData.viewedBy || []

      // Only update if user hasn't viewed yet
      if (!viewedBy.includes(userId)) {
        await updateDoc(storyRef, {
          views: increment(1),
          viewedBy: arrayUnion(userId), // Use arrayUnion for atomic operation
        })
      }
    }
  } catch (error) {
    console.error("[v0] Error marking story as viewed:", error)
  }
}

export const getBronzeHighlightsPaginated = async (
  lastDoc?: any,
  limitCount = 20,
): Promise<{
  highlights: Array<CreatorHighlight & { creatorProfile: CreatorProfile }>
  hasMore: boolean
  lastVisible: any
}> => {
  try {
    const highlightsRef = collection(db, "creator-highlights")
    let q = query(
      highlightsRef,
      where("requiredLevel", "==", "Bronze"),
      orderBy("createdAt", "desc"),
      limit(limitCount + 1),
    )

    if (lastDoc) {
      q = query(
        highlightsRef,
        where("requiredLevel", "==", "Bronze"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(limitCount + 1),
      )
    }

    const querySnapshot = await getDocs(q)
    const allDocs = querySnapshot.docs
    const hasMore = allDocs.length > limitCount

    const highlightsToShow = hasMore ? allDocs.slice(0, limitCount) : allDocs
    const highlights = highlightsToShow.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorHighlight[]

    const uniqueCreatorIds = Array.from(new Set(highlights.map((h) => h.creatorId)))

    const profilesMap = new Map<string, CreatorProfile>()
    const batchSize = 3

    for (let i = 0; i < uniqueCreatorIds.length; i += batchSize) {
      const batch = uniqueCreatorIds.slice(i, i + batchSize)
      const profiles = await Promise.all(
        batch.map(async (creatorId) => {
          try {
            const profile = await getUserProfile(creatorId)
            return { creatorId, profile }
          } catch (error) {
            return { creatorId, profile: null }
          }
        }),
      )

      profiles.forEach(({ creatorId, profile }) => {
        if (profile) {
          profilesMap.set(creatorId, profile)
        }
      })
    }

    const highlightsWithProfiles = highlights
      .map((highlight) => {
        const creatorProfile = profilesMap.get(highlight.creatorId)
        if (!creatorProfile) return null
        return { ...highlight, creatorProfile }
      })
      .filter((item): item is CreatorHighlight & { creatorProfile: CreatorProfile } => item !== null)

    const lastVisible = highlightsToShow[highlightsToShow.length - 1]

    return { highlights: highlightsWithProfiles, hasMore, lastVisible }
  } catch (error) {
    console.error("[v0] Error getting paginated highlights:", error)
    return { highlights: [], hasMore: false, lastVisible: null }
  }
}
