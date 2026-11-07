# Energy Credit Manager

![Node.js 24](https://img.shields.io/badge/Node.js-24-339933)
![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)
![Express 5](https://img.shields.io/badge/Express-5-000000)
![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-4169E1)
![Prisma 7](https://img.shields.io/badge/Prisma-7-2D3748)
![Vitest 5](https://img.shields.io/badge/Vitest-5-6E9F18)

## Descrição

API REST para gerenciar geração de energia e alocação de créditos energéticos entre usinas,
distribuidoras e empresas clientes.

O projeto atende ao controle operacional de geração e rateio mensal de energia. Os lançamentos
usam MWh, e os saldos são consolidados por distribuidora, mês e ano. O backend é desenvolvido
em módulos de domínio, com foco na consistência dos saldos, no controle de acesso e na
verificação automatizada das regras de negócio.

Entre suas principais características estão a autenticação JWT, as permissões por perfil,
a validação das requisições e a persistência transacional no PostgreSQL.

## Tecnologias utilizadas

| Tecnologia | Versão | Função no projeto |
| --- | --- | --- |
| Node.js | 24 | Ambiente de execução da API e das ferramentas de desenvolvimento. |
| TypeScript | 7.0.2 | Tipagem estática estrita e organização do código com módulos ESM. |
| Express | 5.2.1 | Servidor HTTP, rotas e middlewares. |
| PostgreSQL | 18 | Banco relacional para cadastros, lançamentos e saldos mensais. |
| Prisma ORM | 7.10.0 | Modelagem, cliente tipado e migrações do banco. |
| @prisma/adapter-pg | 7.10.0 | Integração do Prisma com o driver PostgreSQL. |
| Zod | 4.5.4 | Validação dos corpos, parâmetros e queries das requisições. |
| jsonwebtoken | 9.0.3 | Emissão e verificação dos tokens JWT. |
| bcrypt | 6.0.0 | Hash e verificação das senhas. |
| Vitest | 5.0.5 | Execução dos testes de integração. |
| Supertest | 7.3.1 | Requisições HTTP e verificações das respostas nos testes. |
| Biome | 2.5.12 | Lint, formatação e organização dos imports. |
| tsx | 4.23.13 | Execução de TypeScript no desenvolvimento e no seed. |

As versões das dependências são as registradas em `package-lock.json`. Node.js 24 e PostgreSQL 18
são as versões de referência utilizadas no ambiente de integração contínua.

## Estrutura do projeto

```text
energy_credit_manager/
├── .github/
│   └── workflows/
│       └── ci.yml             # Pipeline de integração contínua
├── prisma/
├── src/
│   ├── config/                # Configuração das variáveis de ambiente
│   ├── errors/                # Erros HTTP da aplicação
│   ├── middlewares/           # Autenticação, autorização, limites e erros
│   ├── modules/               # Funcionalidades organizadas por domínio
│   ├── shared/                # Schemas compartilhados
│   ├── app.ts                 # Configuração do Express e das rotas
│   └── server.ts              # Inicialização do servidor na porta 3000
├── test/
│   ├── integration/           # Casos de teste da API
│   ├── support/               # Banco isolado, fixtures e servidor de testes
│   ├── README.md              # Preparação e funcionamento da suíte
│   └── route-coverage.md      # Matriz de cenários por rota
├── docs/                      # Documentação técnica do projeto
├── .env.example               # Modelo de configuração da aplicação
├── .env.test.example          # Modelo de configuração dos testes
├── package.json               # Dependências e comandos npm
├── prisma.config.ts           # Conexão, migrações e seed do Prisma
├── vitest.config.ts           # Seleção e execução dos testes
└── README.md                  # Apresentação e instruções do projeto
```

## Funcionalidades

- Cadastro e manutenção de usuários, distribuidoras, usinas e empresas clientes.
- Registro de geração mensal por usina.
- Alocação de energia para empresas, com percentual explícito ou padrão da empresa.
- Atualização dos saldos ao criar, alterar, movimentar ou excluir lançamentos.
- Autenticação JWT, permissões por perfil e proteção por limites de requisições.
- Validação de entrada, paginação e tratamento de conflitos de persistência e concorrência.

### Fluxo de energia

1. Cadastre uma distribuidora.
2. Cadastre as usinas e as empresas clientes vinculadas a essa distribuidora.
3. Registre a geração da usina no mês e ano desejados.
4. Aloque a energia para as empresas clientes na mesma competência.
5. Consulte os lançamentos e faça as correções necessárias pelas respectivas rotas.

## Funcionalidades e diferenciais

### Segurança e validações

- Senhas armazenadas como hash bcrypt e tokens JWT com expiração.
- Verificação do perfil e do status atuais do usuário a cada requisição protegida.
- Permissões específicas por operação e limites de requisições por IP.
- Validação de UUIDs, paginação e corpos de requisição; PATCH exige um campo reconhecido.
- Tratamento de erros de entrada, autorização e persistência com respostas HTTP apropriadas.
- Credenciais locais em arquivos ignorados pelo Git e configuração de exemplo versionada.

### Testes e boas práticas

A suíte usa a aplicação, a autenticação, os serviços e o PostgreSQL reais. Além dos contratos
das rotas, verifica rejeições sem alterações no banco, rollback e integridade dos saldos.
Os cenários de concorrência observam transações sobrepostas no PostgreSQL antes de liberar
a execução das operações.

O banco de testes é exclusivo e validado antes de migrações ou limpeza. A configuração
TypeScript dos testes é separada do build da aplicação. Lint e formatação são verificados
com o Biome, e as migrações permanecem versionadas.

### Integração contínua

O [workflow de CI](.github/workflows/ci.yml) executa em pull requests, pushes na `main` e
acionamentos manuais. Ele prepara Ubuntu 24.04, Node.js 24 e um PostgreSQL 18 temporário.

A pipeline instala as dependências, gera o cliente Prisma, verifica tipos, compila a API,
executa lint e verificações do Biome e roda os testes de integração.

A verificação global de formatação gera aviso quando encontra problemas. A infraestrutura
de testes e os arquivos suportados alterados no PR passam por verificações obrigatórias.

## Como executar o projeto

Tenha Node.js 24, npm e PostgreSQL 18 instalados. Execute os comandos a seguir na raiz do projeto.

### 1. Instalar as dependências

```sh
npm ci
```

A instalação usa as versões registradas em `package-lock.json`.

### 2. Criar o banco da aplicação

Com o PostgreSQL em execução, crie um banco e configure um usuário com permissões para aplicar
migrações e manipular suas tabelas. Exemplo usando o usuário administrativo local `postgres`:

```sh
createdb -h 127.0.0.1 -p 5432 -U postgres energy_credit_manager
```

O mesmo banco pode ser criado pelo pgAdmin. O comando `createdb` precisa estar disponível no PATH
ou ser executado a partir da pasta de binários do PostgreSQL.

### 3. Configurar as variáveis de ambiente

Copie [`.env.example`](.env.example) para `.env` e preencha os valores locais.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```sh
cp .env.example .env
```

### 4. Gerar o cliente Prisma e aplicar as migrações

```sh
npx prisma generate
npx prisma migrate deploy
```

O cliente é gerado em `src/db/generated/prisma/`. O segundo comando aplica as migrações existentes
ao banco indicado por `DATABASE_URL`.

### 5. Criar o primeiro administrador

Preencha as variáveis `BOOTSTRAP_ADMIN_*` e execute:

```sh
npx prisma db seed
```

### 6. Iniciar a API

```sh
npm run dev
```

A API fica disponível em `http://localhost:3000`. A porta está definida em `src/server.ts`.

Para executar o código compilado:

```sh
npm run build
npm start
```

No PowerShell, se a política de execução bloquear `npm.ps1`, use `npm.cmd` e `npx.cmd` nos comandos
equivalentes.

### Executar os testes

A suíte usa Vitest e Supertest com a aplicação e o PostgreSQL reais. Ela verifica contratos HTTP,
autenticação, autorização, validações, integridade dos saldos, rollback, concorrência e o fluxo
mensal completo.

Crie um banco local exclusivo chamado `energy_credit_manager_test` e copie
[`.env.test.example`](.env.test.example) para `.env.test`. Configure `TEST_DATABASE_URL` com o
usuário, a senha e a porta dessa instalação.

PowerShell:

```powershell
Copy-Item .env.test.example .env.test
```

Linux/macOS:

```sh
cp .env.test.example .env.test
```

```sh
npm run test:integration
```

`npm test` também executa a suíte completa na configuração atual. Para executar somente um arquivo:

```sh
npx vitest run test/integration/users.test.ts
```

O suporte dos testes gera o cliente Prisma, aplica as migrações e inicia um servidor HTTP
temporário. Ele limpa as tabelas de negócio entre os casos e encerra as conexões ao final.
Use exclusivamente o banco de testes: a limpeza remove seus dados de negócio.

O PostgreSQL precisa estar em execução antes do comando. Os testes geram um segredo JWT novo
por execução e não precisam que `npm run dev` esteja ativo.

Consulte o [guia de testes](test/README.md) para os requisitos de isolamento e as instruções completas.
