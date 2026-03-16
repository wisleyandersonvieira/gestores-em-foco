const rawAdminEmails = import.meta.env.VITE_ADMIN_EMAILS ?? "";

export function getAllowedAdminEmails() {
  return rawAdminEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails.length === 0) {
    return false;
  }

  return allowedEmails.includes(email.trim().toLowerCase());
}

export function getAdminAccessError(email: string | null | undefined) {
  if (!email) {
    return "Sua conta nao possui um email valido para acesso administrativo.";
  }

  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails.length === 0) {
    return "A lista de emails administrativos ainda nao foi configurada no ambiente.";
  }

  return `O email ${email} nao esta autorizado para acessar o painel administrativo.`;
}
