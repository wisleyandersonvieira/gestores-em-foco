# Revisão de Performance - Gestor DRE

Data: 2026-05-20

## Resumo

Esta revisão focou nos fluxos mais pesados do Gestor DRE: Dashboard, Análise de DRE, Análise Detalhada, carregamento inicial e exportações.

## Problemas Encontrados e Correções

| Área | Onde estava | Impacto | Correção aplicada |
| --- | --- | --- | --- |
| N+1 de DREs detalhadas | `DreDashboardPage` e `DreAnalysisPage` chamavam `getDreEntry` para cada competência selecionada | Cada mês selecionado disparava novas consultas para entrada, itens, categorias, subcategorias e linhas do modelo | Criada `getDreEntriesWithItems(userId, entryIds)` em `src/lib/dre-service.ts`, buscando entradas e itens em lote |
| Consultas duplicadas de enriquecimento | `getDreEntry` repetia consultas de categorias, subcategorias e linhas financeiras por entrada | Custo crescia linearmente com o número de períodos | Extraído `enrichItemsByEntry`, reutilizado por carregamento batch e recálculo de resumos |
| Recarregamento de estrutura estável | Categorias, subcategorias e modelos eram buscados a cada navegação | Latência extra em telas de cadastro/modelos/análise | Cache em memória para categorias, subcategorias, lista de modelos e modelo com linhas, com invalidação em salvar/excluir/inativar |
| Bundle inicial monolítico | `App.tsx` importava todas as páginas diretamente | Gráficos, páginas admin, DRE e PDF entravam cedo no grafo de carregamento | Rotas convertidas para `React.lazy` + `Suspense` |
| Modal detalhada carregada antes do uso | Páginas DRE importavam `DreAdvancedAnalysisModal` estaticamente | Recharts e seções pesadas podiam carregar antes do clique em “Análise Detalhada” | Modal carregada com `lazy()` nas páginas de Dashboard e Análise |
| PDF avançado no bundle da modal | `DreAdvancedAnalysisModal` importava `dre-advanced-pdf` estaticamente | `jsPDF`/autotable entravam antes do clique em exportar | Exportação avançada passou a usar `await import("@/lib/dre-advanced-pdf")` |
| Abas pesadas da modal | Todas as seções eram declaradas dentro dos `TabsContent` | Gráficos e tabelas de abas inativas podiam ser montados cedo | Conteúdo das abas passou a renderizar somente quando `activeTab` corresponde |
| Clique duplo em exportações | Exportações PDF/Excel da Análise não tinham trava visual | Possibilidade de gerar múltiplos arquivos/janelas | Adicionado `exportingFormat` e disabled/loading nos itens de exportação |

## Medições Locais Antes/Depois

Ambiente: build local Vite, sem conexão instrumentada com Supabase de produção.

| Métrica | Antes | Depois |
| --- | ---: | ---: |
| Maior chunk JS antes do code splitting | `index-HCQQumD5.js` 2.154,13 kB, gzip 624,34 kB | maior chunk comum `index-BRx4UCIB.js` 412,20 kB, gzip 121,85 kB |
| Chunk da rota Dashboard DRE | dentro do bundle principal | `DreDashboardPage-CTmMO_MG.js` 17,65 kB, gzip 6,33 kB |
| Chunk da rota Análise DRE | dentro do bundle principal | `DreAnalysisPage-DJijp2w3.js` 42,08 kB, gzip 12,44 kB |
| Modal de Análise Detalhada | carregada junto da rota | `DreAdvancedAnalysisModal-CSSNn9aB.js` 69,80 kB, gzip 17,79 kB, carregada sob demanda |
| PDF avançado | carregado junto da modal | `dre-advanced-pdf-D8cCZMp_.js` 14,02 kB, gzip 4,47 kB, carregado sob demanda |
| Testes automatizados | 70 passando | 70 passando |

## Queries Otimizadas

### Dashboard e Análise de DRE

Antes, para `N` competências selecionadas:

- Listagem de DREs com recálculo: consultas para entradas, itens, categorias, subcategorias e linhas financeiras.
- Detalhamento: `N` chamadas a `getDreEntry`, cada uma com entrada, itens e enriquecimentos.
- Modelo: consulta separada.

Depois:

- `getDreEntriesWithItems` busca todas as entradas selecionadas em lote.
- Itens são buscados com `.in("dre_entry_id", entryIds)`.
- Categorias, subcategorias e linhas financeiras são buscadas uma vez por lote.
- O modelo com linhas usa cache em memória após a primeira leitura.

## Índices Criados

Migration: `supabase/migrations/20260520170000_optimize_dre_performance_indexes.sql`

- `dre_entries_user_model_status_competence_idx`
- `dre_entries_user_status_competence_idx`
- `dre_entry_items_user_entry_display_idx`
- `dre_entry_items_user_category_idx`
- `dre_entry_items_user_subcategory_idx`
- `dre_model_lines_user_model_display_idx`
- `dre_model_lines_user_model_financial_idx`
- `dre_model_lines_user_category_idx`
- `dre_model_lines_user_subcategory_idx`
- `dre_categories_user_display_name_idx`
- `dre_subcategories_user_display_name_idx`

## Componentes Otimizados

- `App.tsx`: code splitting por rota.
- `DreAnalysisPage`: modal detalhada carregada sob demanda e exportações com estado de loading.
- `DreDashboardPage`: modal detalhada carregada sob demanda; carregamento batch de DREs detalhadas.
- `DreAdvancedAnalysisModal`: abas com montagem condicional; PDF carregado sob demanda.

## Cache Implementado

Em `src/lib/dre-service.ts`:

- `listDreCategories(userId)`
- `listDreSubcategories(userId)`
- `listDreModels(userId, status)`
- `getDreModelWithLines(userId, modelId)`

Invalidação:

- `saveDreCategory`
- `deleteOrDeactivateDreCategory`
- `saveDreSubcategory`
- `deleteOrDeactivateDreSubcategory`
- `saveDreModel`
- `deleteOrDeactivateDreModel`

## Pontos Não Medidos Neste Ambiente

Não foi possível medir tempos reais de endpoint Supabase, React Profiler ou geração de PDF/Excel com dados de produção neste workspace. As metas de 500 ms/2 s/5 s/3 s devem ser validadas com:

- Supabase logs ou tracing no projeto de produção/staging.
- React DevTools Profiler em navegador.
- Datasets reais com 12+ competências e modelos grandes.

## Verificação de Regressão

Executado:

```bash
npm run test
npm run build
```

Resultado:

- 4 arquivos de teste passaram.
- 70 testes passaram.
- Build Vite concluído.
- Warning remanescente: Browserslist/caniuse-lite desatualizado. Não é regressão funcional.
