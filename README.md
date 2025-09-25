<h1 align="center">✨ ShineWardrobe API</h1>

<p align="center">
  <em>Recomendações inteligentes de roupas baseadas no clima da sua cidade usando IA.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Elysia.js-FF6F61?style=flat&logo=javascript&logoColor=white" alt="Elysia.js"/>
  <img src="https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white" alt="Bun"/>
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black" alt="Swagger"/>
</p>

---

## 📖 Sobre o Projeto

**ShineWardrobe** é uma plataforma que resolve a dúvida diária de "o que vestir?". A API utiliza **IA para gerar recomendações de outfits** com base no clima em tempo real, preferências do usuário e um catálogo de produtos.

- 🤖 Usa **IA (Ollama)** para gerar sugestões personalizadas.
- 🌤️ Analisa o **clima da sua cidade** em tempo real.
- 🐳 O projeto é **100% containerizado com Docker**, garantindo um ambiente de desenvolvimento e produção consistente e isolado.

> **⚠️ Foco Atual:** Apenas o **Backend está 100% funcional**. Toda a API pode ser explorada e testada através da documentação interativa do **Swagger**.

---

## ✨ Tecnologias Utilizadas

<details>
  <summary><strong>⚙️ Backend</strong></summary>

- 🚀 **Elysia.js**: Framework de alta performance sobre o Bun.
- ⚡ **Bun**: Runtime JavaScript ultrarrápido.
- 🛢️ **PostgreSQL**: Banco de dados relacional robusto.
- 💧 **Drizzle ORM**: ORM moderno e seguro para TypeScript.
- 🏗️ **Domain-Driven Design (DDD)**: Arquitetura focada nas regras de negócio.
</details>

<details>
  <summary><strong>🧠 Inteligência Artificial</strong></summary>

- 🤖 **Ollama com Llama 3.2**: Modelo de linguagem que roda localmente, garantindo privacidade e zero custo com APIs externas.
</details>

<details>
  <summary><strong>☁️ DevOps & Infraestrutura</strong></summary>

- 🐳 **Docker & Docker Compose**: Containerização e orquestração de todos os serviços (backend, banco de dados e IA).
</details>

---

## 🏛️ Arquitetura do Backend

A API é o núcleo do sistema, comunicando-se com o banco de dados para persistência e com o serviço da IA para gerar as recomendações.

```mermaid
flowchart TD
    A[Usuário/Cliente API] -->|Requisições HTTP| B[Backend (Elysia.js)]
    B -->|Consultas e Persistência| C[(PostgreSQL DB)]
    B -->|Geração de Recomendações| D[IA (Ollama)]
```

---

## 🚀 Como Executar

### ✅ Pré-requisitos

- Docker e Docker Compose instalados.

### 🔧 Passos de Instalação

**1. Clonar o Repositório**

```bash
git clone https://github.com/your-username/shinewardrobe.git
cd shinewardrobe
```

**2. Configurar Variáveis de Ambiente**

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione a chave da API de clima (ex: OpenWeatherMap).

```env
WEATHER_API_KEY=sua-chave-aqui
```

**3. Subir os Containers**

Este comando irá baixar as imagens necessárias (incluindo o modelo de IA) e iniciar todos os serviços.

```bash
docker-compose up --build -d
```

---

## 💻 Como Usar

**🔗 Endpoint da API:**
- http://localhost:8080

**📑 Documentação da API (Swagger):**
- Acesse http://localhost:8080/swagger para ver todos os endpoints e testá-los diretamente no navegador.

---

## 📌 Estrutura dos Serviços Docker

- **backend** ⚙️ → A API principal em Elysia.js.
- **postgres** 💾 → Banco de dados PostgreSQL com persistência de dados em um volume Docker.
- **ollama** 🧠 → Serviço da IA, que baixa e serve o modelo Llama 3.2.

---

<h3 align="center">Feito com ❤️ por <a href="https://github.com/lucasmarques594">Lucas Marques</a></h3>