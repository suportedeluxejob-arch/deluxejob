"use server"

// Server action for admin authentication
export async function authenticateAdmin(username: string, password: string) {
  const adminUsername = "anoxqui"
  const adminPassword = "3313Gl@9"

  if (username === adminUsername && password === adminPassword) {
    return { success: true }
  }

  return { success: false, error: "Credenciais inválidas" }
}
