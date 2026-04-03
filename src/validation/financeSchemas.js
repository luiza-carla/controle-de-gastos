const { z } = require('zod');

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'Id inválido');

const tituloSchema = z
  .string()
  .trim()
  .min(1, 'Título é obrigatório')
  .max(120, 'Título deve ter no máximo 120 caracteres');

const nomeSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório')
  .max(80, 'Nome deve ter no máximo 80 caracteres');

const moedaSchema = z.coerce.number().finite('Valor inválido');

const moedaPositivaSchema = moedaSchema.positive(
  'Valor deve ser maior que zero'
);

const moedaNaoNegativaSchema = moedaSchema.min(
  0,
  'Valor não pode ser negativo'
);

const moedaDiferenteDeZeroSchema = moedaSchema.refine(
  (value) => value !== 0,
  'Valor deve ser diferente de zero'
);

const dataOpcionalSchema = z.coerce.date('Data inválida').optional();

const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Tag inválida')
      .max(30, 'Cada tag deve ter no máximo 30 caracteres')
  )
  .max(3, 'Máximo de 3 tags')
  .transform((tags) => [...new Set(tags.map((tag) => tag.trim()))]);

const tipoDespesaSchema = z.enum(['essencial', 'eventual', 'opcional']);
const statusTransacaoSchema = z.enum(['pendente', 'pago']);
const recorrenciaSchema = z.enum(['nenhuma', 'mensal']);
const frequenciaSchema = z.enum([
  'mensal',
  'semanal',
  'diario',
  'anual',
  'hora',
  'outra',
]);
const tipoContaSchema = z.enum(['corrente', 'credito', 'investimento']);
const tipoTransacaoSchema = z.enum(['entrada', 'saida']);
const historicoEntidadeSchema = z.enum([
  'transacao',
  'conta',
  'carteira',
  'salario',
  'listaDesejo',
]);
const historicoAcaoSchema = z.enum([
  'criacao',
  'edicao',
  'delecao',
  'transferencia',
  'realizacao',
]);

const contaRefSchema = z.union([objectIdSchema, z.literal('carteira')]);

const subcategoriaOpcionalSchema = z
  .union([objectIdSchema, z.literal(''), z.null()])
  .optional();

const tipoDespesaOpcionalSchema = z
  .union([tipoDespesaSchema, z.literal(''), z.null()])
  .optional();

const parcelamentoSchema = z
  .object({
    totalParcelas: z.coerce
      .number()
      .int('Total de parcelas inválido')
      .min(1, 'Total de parcelas deve ser de pelo menos 1')
      .max(360, 'Total de parcelas deve ter no máximo 360'),
    parcelaAtual: z.coerce
      .number()
      .int('Parcela atual inválida')
      .min(1, 'Parcela atual deve ser de pelo menos 1')
      .max(360, 'Parcela atual deve ter no máximo 360'),
  })
  .refine(
    (parcelamento) => parcelamento.parcelaAtual <= parcelamento.totalParcelas,
    {
      message: 'Parcela atual não pode ser maior que o total de parcelas',
      path: ['parcelaAtual'],
    }
  );

const contaCriacaoSchema = z.object({
  nome: nomeSchema,
  tipo: tipoContaSchema,
  saldo: moedaNaoNegativaSchema.optional().default(0),
});

const contaAtualizacaoSchema = z
  .object({
    nome: nomeSchema.optional(),
    tipo: tipoContaSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

const contaTransferenciaSchema = z.object({
  contaDestinoId: objectIdSchema,
  valor: moedaPositivaSchema,
});

const transacaoBaseSchema = z.object({
  conta: contaRefSchema,
  titulo: tituloSchema,
  valor: moedaPositivaSchema,
  tipo: tipoTransacaoSchema,
  categoria: objectIdSchema,
  subcategoria: subcategoriaOpcionalSchema,
  data: dataOpcionalSchema,
  status: statusTransacaoSchema.optional(),
  recorrencia: recorrenciaSchema.optional(),
  parcelamento: parcelamentoSchema.optional(),
  tags: tagsSchema.optional(),
  tipoDespesa: tipoDespesaOpcionalSchema,
});

const transacaoCriacaoSchema = transacaoBaseSchema.superRefine((data, ctx) => {
  if (data.tipo !== 'saida' && data.tipoDespesa && data.tipoDespesa !== '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tipoDespesa só pode ser informado para transações de saída',
      path: ['tipoDespesa'],
    });
  }
});

const transacaoAtualizacaoSchema = z
  .object({
    conta: contaRefSchema.optional(),
    titulo: tituloSchema.optional(),
    valor: moedaPositivaSchema.optional(),
    tipo: tipoTransacaoSchema.optional(),
    categoria: objectIdSchema.optional(),
    subcategoria: subcategoriaOpcionalSchema,
    data: dataOpcionalSchema,
    status: statusTransacaoSchema.optional(),
    recorrencia: recorrenciaSchema.optional(),
    parcelamento: parcelamentoSchema.optional(),
    tags: tagsSchema.optional(),
    tipoDespesa: tipoDespesaOpcionalSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })
  .superRefine((data, ctx) => {
    if (data.tipo && data.tipo !== 'saida' && data.tipoDespesa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tipoDespesa só pode ser informado para transações de saída',
        path: ['tipoDespesa'],
      });
    }
  });

const salarioCriacaoSchema = z.object({
  titulo: tituloSchema.optional(),
  valor: moedaPositivaSchema,
  conta: contaRefSchema,
  diaRecebimento: z.coerce
    .number()
    .int('Dia de recebimento inválido')
    .min(1, 'Dia de recebimento deve estar entre 1 e 31')
    .max(31, 'Dia de recebimento deve estar entre 1 e 31'),
  frequencia: frequenciaSchema.optional(),
});

const salarioAtualizacaoSchema = z
  .object({
    titulo: tituloSchema.optional(),
    valor: moedaPositivaSchema.optional(),
    conta: contaRefSchema.optional(),
    diaRecebimento: z.coerce
      .number()
      .int('Dia de recebimento inválido')
      .min(1, 'Dia de recebimento deve estar entre 1 e 31')
      .max(31, 'Dia de recebimento deve estar entre 1 e 31')
      .optional(),
    frequencia: frequenciaSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

const listaDesejoCriacaoSchema = z.object({
  titulo: tituloSchema,
  valor: moedaPositivaSchema,
  categoria: objectIdSchema,
  subcategoria: subcategoriaOpcionalSchema,
  tags: tagsSchema.optional(),
  tipoDespesa: tipoDespesaOpcionalSchema,
});

const listaDesejoAtualizacaoSchema = z
  .object({
    titulo: tituloSchema.optional(),
    valor: moedaPositivaSchema.optional(),
    categoria: objectIdSchema.optional(),
    subcategoria: subcategoriaOpcionalSchema,
    tags: tagsSchema.optional(),
    tipoDespesa: tipoDespesaOpcionalSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

const listaDesejoRealizarSchema = z.object({
  conta: contaRefSchema,
  valor: moedaPositivaSchema.optional(),
  status: statusTransacaoSchema.optional(),
  data: dataOpcionalSchema,
});

const carteiraAtualizarSaldoSchema = z.object({
  valor: moedaDiferenteDeZeroSchema,
});

const carteiraTransferenciaSchema = z.object({
  contaId: objectIdSchema,
  valor: moedaPositivaSchema,
  direcao: z.enum(['carteira-para-conta', 'conta-para-carteira']),
});

const idParamsSchema = z.object({
  id: objectIdSchema,
});

const historicoEntidadeParamsSchema = z.object({
  entidade: historicoEntidadeSchema,
  entidadeId: objectIdSchema,
});

const historicoListagemQuerySchema = z.object({
  entidade: historicoEntidadeSchema.optional(),
  acao: historicoAcaoSchema.optional(),
  desfeito: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  ordenarPor: z.enum(['data', 'nome']).optional(),
  sortBy: z.enum(['data', 'nome']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).max(10000).optional(),
});

const listagemOrdenadaQuerySchema = z.object({
  ordenarPor: z.enum(['data', 'nome']).optional(),
  sortBy: z.enum(['data', 'nome']).optional(),
});

module.exports = {
  idParamsSchema,
  contaCriacaoSchema,
  contaAtualizacaoSchema,
  contaTransferenciaSchema,
  transacaoCriacaoSchema,
  transacaoAtualizacaoSchema,
  salarioCriacaoSchema,
  salarioAtualizacaoSchema,
  listaDesejoCriacaoSchema,
  listaDesejoAtualizacaoSchema,
  listaDesejoRealizarSchema,
  carteiraAtualizarSaldoSchema,
  carteiraTransferenciaSchema,
  historicoEntidadeParamsSchema,
  historicoListagemQuerySchema,
  listagemOrdenadaQuerySchema,
};
