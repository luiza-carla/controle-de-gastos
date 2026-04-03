const { z } = require('zod');

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email é obrigatório')
  .max(160, 'Email deve ter no máximo 160 caracteres')
  .email('Email inválido')
  .transform((email) => email.toLowerCase());

const senhaCadastroSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
  .regex(/\d/, 'Senha deve conter ao menos um número');

const senhaLoginSchema = z
  .string()
  .min(1, 'Senha é obrigatória')
  .max(128, 'Senha deve ter no máximo 128 caracteres');

const nomeSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(80, 'Nome deve ter no máximo 80 caracteres');

const registrarSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaCadastroSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  senha: senhaLoginSchema,
});

module.exports = {
  registrarSchema,
  loginSchema,
};