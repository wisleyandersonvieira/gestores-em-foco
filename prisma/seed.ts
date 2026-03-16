import { PrismaClient, Role, NodeType, ModelStatus, LinkStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const clientPasswordHash = await bcrypt.hash("Cliente@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gestoresemfoco.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@gestoresemfoco.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      companyName: "Gestores em Foco",
      segment: "Educação empresarial",
      employeesCount: 12,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "cliente@exemplo.com" },
    update: {},
    create: {
      name: "Mariana Costa",
      email: "cliente@exemplo.com",
      passwordHash: clientPasswordHash,
      role: Role.CLIENT,
      companyName: "Costa Consultoria",
      segment: "Consultoria",
      employeesCount: 8,
    },
  });

  const model = await prisma.diagnosticModel.upsert({
    where: { id: "demo-diagnostic-model" },
    update: {},
    create: {
      id: "demo-diagnostic-model",
      name: "Diagnostico de Maturidade Empresarial",
      description: "Modelo inicial para validar a jornada do produto.",
      category: "Empreendedorismo",
      status: ModelStatus.ACTIVE,
    },
  });

  const startNode = await prisma.diagnosticNode.upsert({
    where: { id: "demo-start-node" },
    update: {},
    create: {
      id: "demo-start-node",
      modelId: model.id,
      nodeType: NodeType.START,
      label: "Inicio",
      positionX: 120,
      positionY: 120,
      config: {},
    },
  });

  const questionNode = await prisma.diagnosticNode.upsert({
    where: { id: "demo-question-node" },
    update: {},
    create: {
      id: "demo-question-node",
      modelId: model.id,
      nodeType: NodeType.QUESTION_SCALE,
      label: "Gestao financeira",
      questionText: "De 1 a 5, quao previsivel esta o caixa do seu negocio?",
      category: "Gestao Financeira",
      weight: 1.5,
      positionX: 420,
      positionY: 120,
      config: {
        scaleMin: 1,
        scaleMax: 5,
      },
    },
  });

  const endNode = await prisma.diagnosticNode.upsert({
    where: { id: "demo-end-node" },
    update: {},
    create: {
      id: "demo-end-node",
      modelId: model.id,
      nodeType: NodeType.END,
      label: "Conclusao",
      positionX: 720,
      positionY: 120,
      config: {
        message: "Parabens por concluir seu primeiro diagnostico.",
      },
    },
  });

  await prisma.diagnosticEdge.upsert({
    where: { id: "demo-edge-start-question" },
    update: {},
    create: {
      id: "demo-edge-start-question",
      modelId: model.id,
      sourceNodeId: startNode.id,
      targetNodeId: questionNode.id,
    },
  });

  await prisma.diagnosticEdge.upsert({
    where: { id: "demo-edge-question-end" },
    update: {},
    create: {
      id: "demo-edge-question-end",
      modelId: model.id,
      sourceNodeId: questionNode.id,
      targetNodeId: endNode.id,
    },
  });

  await prisma.diagnosticLink.upsert({
    where: { token: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      modelId: model.id,
      token: "11111111-1111-1111-1111-111111111111",
      label: "Turma Summit SP - Marco",
      assignedUserId: client.id,
      status: LinkStatus.PENDING,
    },
  });

  console.log({
    adminEmail: admin.email,
    clientEmail: client.email,
    sampleToken: "11111111-1111-1111-1111-111111111111",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
