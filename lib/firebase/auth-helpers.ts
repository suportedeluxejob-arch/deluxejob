export function saveAuthToken() {
  // Salva um token simples no cookie para o middleware verificar
  document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}` // 7 dias
}

export function removeAuthToken() {
  // Remove o token do cookie
  document.cookie = "auth-token=; path=/; max-age=0"
}
