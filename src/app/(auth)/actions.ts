"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type RegisterActionState = {
  success: boolean;
  message: string;
};

const registerSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo."),
  email: z.string().email("Digite um email valido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .regex(/[A-Z]/, "Inclua ao menos uma letra maiuscula.")
    .regex(/[0-9]/, "Inclua ao menos um numero."),
  companyName: z.string().min(2, "Informe o nome da empresa."),
  segment: z.string().min(2, "Informe o segmento de atuacao."),
  employeesCount: z.coerce.number().int().min(1, "Informe ao menos 1 colaborador."),
});

export async function registerUser(
  _previousState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
    segment: formData.get("segment"),
    employeesCount: formData.get("employeesCount"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Nao foi possivel validar o formulario.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existingUser) {
    return {
      success: false,
      message: "Ja existe uma conta com este email.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      companyName: parsed.data.companyName,
      segment: parsed.data.segment,
      employeesCount: parsed.data.employeesCount,
    },
  });

  redirect("/entrar?cadastro=sucesso");
}
