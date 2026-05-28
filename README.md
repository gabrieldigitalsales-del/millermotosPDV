# PDV MILLER MOTOS - Layout clássico + Supabase direto

Esta versão preserva o layout clássico anterior e usa Supabase direto para sincronizar os dados entre dispositivos.

## Rodar localmente

```bash
npm install
npm run dev
```

## Configurar Supabase

1. Execute `supabase/schema_miller_motos.sql` no SQL Editor do Supabase.
2. Configure `.env.local` no PC ou as variáveis no Vercel:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
VITE_MM_PROJECT_ID=9f1f4df2-5f5a-4a7d-9f34-8a9be4412026
```

## Login inicial

- Admin: `admin` / `admin123`
- Financeiro: `financeiro` / `fin123`
- Vendedor: `vendedor` / `venda123`

## Importante

Os dados comerciais não usam mais `localStorage`. Eles são carregados e salvos no Supabase.

## Correção Vercel - dependências

Esta versão usa versões fixas e compatíveis:

- vite ^5.4.21
- @vitejs/plugin-react ^4.3.4
- react ^18.3.1

Se o Vercel continuar usando dependências antigas, apague `package-lock.json` do repositório, faça commit novamente e rode o deploy limpando o cache.

## Correção importante: erro id NULL

Se aparecer o erro `null value in column "id" of relation "mm_pdv_produtos" violates not-null constraint`, rode no Supabase:

`supabase/correcao_id_default_not_null.sql`

Depois faça redeploy no Vercel com Clear Build Cache.
