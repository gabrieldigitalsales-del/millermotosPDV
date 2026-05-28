# PDV MILLER MOTOS - Versao preparada para Supabase

Sistema PDV para venda de pecas de moto com layout classico:

- Cadastro de clientes
- Cadastro de produtos e estoque
- Cadastro de fornecedores
- Cadastro de vendedores
- Venda de balcao
- Cupom nao fiscal imprimivel
- Pix / QR Code
- Permissoes por perfil
- Relatorios
- Backup e restauracao
- Preparacao Supabase com SQL exclusivo

## Rodar local

```bash
npm install
npm run dev
```

## Preparar Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o arquivo:

```text
supabase/schema_miller_motos.sql
```

4. Copie `.env.example` para `.env.local`.
5. Preencha:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_MILLER_PROJECT_ID=9f1f4df2-5f5a-4a7d-9f34-8a9be4412026
```

## Isolamento para nao misturar com outros projetos

Este projeto usa:

- Prefixo exclusivo nas tabelas: `mm_pdv_`
- Coluna obrigatoria `project_id`
- ID exclusivo: `9f1f4df2-5f5a-4a7d-9f34-8a9be4412026`
- Chaves primarias compostas com `project_id`
- RLS ativado com politicas limitadas ao `project_id`

Assim, mesmo usando o mesmo banco para outros projetos, os dados da MILLER MOTOS ficam separados.

## Arquivos Supabase incluidos

- `supabase/schema_miller_motos.sql`: cria tabelas, indices, views, politicas e dados iniciais.
- `src/lib/supabaseClient.js`: cria a conexao com Supabase.
- `src/lib/supabaseRepository.js`: funcoes prontas para listar, salvar, excluir e finalizar venda no banco.
- `.env.example`: modelo de configuracao.

## Observacao importante

A interface atual continua funcionando localmente. O pacote ja esta preparado para Supabase com estrutura, dependencias e repositorio. Para colocar 100% online, substitua os pontos de `useLocalStorage` pelas funcoes de `src/lib/supabaseRepository.js` tela por tela.
