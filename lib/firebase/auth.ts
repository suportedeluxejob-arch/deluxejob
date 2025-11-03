import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "./config"
import {
  ensureUserDocument,
  getUserByUsername,
  createWelcomeNotification,
  createCreatorProfile,
  isUserCreator,
  addCreatorToNetworkWithCode,
} from "./firestore"
import { getRandomAvatar } from "@/lib/avatars"

export interface UserProfile {
  uid: string
  username: string
  email: string
  displayName: string
  bio: string
  profileImage: string
  createdAt: Date
}

export const useAuth = () => {
  const [user, loading, error] = useAuthState(auth)
  return { user, loading, error }
}

export { auth }

export const createUser = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return { user: null, error: "Nome de usuário já está em uso" }
    }

    const email = `${username}@deluxeisa.app`
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    await updateProfile(userCredential.user, {
      displayName: username,
    })

    const userProfile = {
      username,
      displayName: username,
      bio: "",
      profileImage: getRandomAvatar(),
      email,
      createdAt: new Date(),
    }

    await ensureUserDocument(userCredential.user.uid, userProfile)
    await createWelcomeNotification(userCredential.user.uid)

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      return { user: null, error: "Nome de usuário já está em uso" }
    }
    if (error.code === "auth/weak-password") {
      return { user: null, error: "Senha muito fraca. Use pelo menos 6 caracteres" }
    }
    if (error.code === "auth/invalid-email") {
      return { user: null, error: "Nome de usuário inválido" }
    }
    return { user: null, error: "Erro ao criar conta. Tente novamente." }
  }
}

export const createCreator = async (
  username: string,
  password: string,
  displayName: string,
  bio: string,
  referralCode?: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return { user: null, error: "Nome de usuário já está em uso" }
    }

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
      profileImage: getRandomAvatar(),
      email,
      userType: "creator" as const,
      isVerified: false,
      followerCount: 0,
      contentCount: 0,
    }

    await createCreatorProfile(creatorProfile)

    if (referralCode) {
      await addCreatorToNetworkWithCode(userCredential.user.uid, username, referralCode)
    }

    await createWelcomeNotification(userCredential.user.uid)

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      return { user: null, error: "Nome de usuário já está em uso" }
    }
    if (error.code === "auth/weak-password") {
      return { user: null, error: "Senha muito fraca. Use pelo menos 6 caracteres" }
    }
    if (error.code === "auth/invalid-email") {
      return { user: null, error: "Nome de usuário inválido" }
    }
    return { user: null, error: "Erro ao criar conta de criadora. Tente novamente." }
  }
}

export const signInUser = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const email = `${username}@deluxeisa.app`
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    if (!userCredential.user.displayName) {
      await updateProfile(userCredential.user, {
        displayName: username,
      })
    }

    await ensureUserDocument(userCredential.user.uid, {
      username,
      displayName: username,
      bio: "",
      profileImage: getRandomAvatar(),
      email,
      createdAt: new Date(),
    })

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: "Usuário ou senha incorretos" }
  }
}

export const signInNormalUser = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const email = `${username}@deluxeisa.app`
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    const isCreator = await isUserCreator(userCredential.user.uid)

    if (isCreator) {
      await signOut(auth)
      return { user: null, error: "Esta é uma conta de criadora. Use o login de criadora." }
    }

    if (!userCredential.user.displayName) {
      await updateProfile(userCredential.user, {
        displayName: username,
      })
    }

    await ensureUserDocument(userCredential.user.uid, {
      username,
      displayName: username,
      bio: "",
      profileImage: getRandomAvatar(),
      email,
      createdAt: new Date(),
    })

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: "Usuário ou senha incorretos" }
  }
}

export const signInCreator = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const email = `${username}@deluxeisa.app`
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    const isCreator = await isUserCreator(userCredential.user.uid)

    if (!isCreator) {
      await signOut(auth)
      return { user: null, error: "Esta conta não é de criadora. Use o login normal ou cadastre-se como criadora." }
    }

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: "Usuário ou senha incorretos" }
  }
}

export const signOutUser = async (): Promise<{ error: string | null }> => {
  try {
    await signOut(auth)
    return { error: null }
  } catch (error: any) {
    return { error: "Erro ao sair da conta" }
  }
}
