# Preparacao Supabase - PDV MILLER MOTOS

Este pacote ja vem preparado para usar Supabase sem misturar com outros projetos.

## Como foi isolado

- Todas as tabelas usam prefixo `mm_pdv_`.
- Todas as tabelas possuem a coluna `project_id`.
- O ID exclusivo deste sistema e:

`9f1f4df2-5f5a-4a7d-9f34-8a9be4412026`

- As constraints e indices tambem usam esse projeto.
- As politicas RLS bloqueiam dados fora desse `project_id`.

## Passo a passo

1. Crie um projeto no Supabase.
2. Abra SQL Editor.
3. Cole e execute o arquivo `supabase/schema_miller_motos.sql`.
4. Copie `.env.example` para `.env.local`.
5. Coloque sua URL e sua anon key do Supabase.
6. Rode:

```bash
npm install
npm run dev
```

## Importante

A versao atual do app ainda mantem fallback localStorage para funcionar offline/local.
Os arquivos `src/lib/supabaseClient.js` e `src/lib/supabaseRepository.js` ja deixam o projeto preparado para trocar o armazenamento local pelo Supabase tela por tela.

## Atualizacao: produtos prioritarios no balcao

Esta versao adiciona a view `mm_pdv_produtos_prioridade_balcao`.
Ela ordena automaticamente os produtos pelo que mais saiu nas vendas, depois por estoque e nome.
No PDV, quando o campo de pesquisa estiver vazio, o balcao mostra estes produtos como atalhos rapidos.
Quando o vendedor digita `O`, `Ol`, `oleo` ou `Óleo`, a busca continua filtrando com ou sem acento.
