export function validatePassword(password: string, confirmation: string) {
  if (!password || !confirmation) {
    return "Preencha a nova senha e a confirmacao.";
  }

  if (password.length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return "A senha precisa conter ao menos uma letra e um numero.";
  }

  if (password !== confirmation) {
    return "A confirmacao precisa ser igual a nova senha.";
  }

  return null;
}

