// Regex for the set of accepted special characters
const SPECIAL_CHAR_REGEX = /[!@#$%&*()\-_+={}\[\]:;?/.,~]/;

export type PasswordRule = {
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "Mínimo de 8 caracteres",    test: (p) => p.length >= 8 },
  { label: "Uma letra maiúscula",        test: (p) => /[A-Z]/.test(p) },
  { label: "Uma letra minúscula",        test: (p) => /[a-z]/.test(p) },
  { label: "Um número",                  test: (p) => /\d/.test(p) },
  { label: "Um caractere especial",      test: (p) => SPECIAL_CHAR_REGEX.test(p) },
];

export function validatePassword(password: string, confirmation: string): string | null {
  if (!password || !confirmation) {
    return "Preencha a nova senha e a confirmação.";
  }

  if (password.length < 8) {
    return "A senha deve ter no mínimo 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Use pelo menos uma letra maiúscula.";
  }
  if (!/[a-z]/.test(password)) {
    return "Use pelo menos uma letra minúscula.";
  }
  if (!/\d/.test(password)) {
    return "Use pelo menos um número.";
  }
  if (!SPECIAL_CHAR_REGEX.test(password)) {
    return "Use pelo menos um caractere especial, como @, #, ! ou $.";
  }
  if (password !== confirmation) {
    return "As senhas informadas não coincidem.";
  }

  return null;
}
