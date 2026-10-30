# Contributing to Sakkhi (সাক্ষী)

Thank you for your interest in contributing to Sakkhi! We welcome contributions that advance transparency, financial safety, and humane technology for community aid.

---

## Code of Conduct
We treat all contributors, volunteers, and community members with dignity, respect, and kindness. We do not tolerate harassment, discrimination, or abusive behavior.

---

## Local Development Workflow

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/SakkhiAI.git
   cd SakkhiAI
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env.local
   ```
   *Note: For local development and testing, you do not need external API keys. Set `AI_PROVIDER=mock` and `DEMO_MODE=true`.*

4. **Initialize Database**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```

---

## Development Standards

- **TypeScript Strictness**: No implicit `any`. All API boundaries must be validated using [Zod](https://zod.dev/).
- **Financial Precision**: Never use JavaScript floating-point numbers for money calculations. All monetary values must be represented as integer Poisha ($1\text{ BDT} = 100\text{ poisha}$) or USD cents.
- **Testing**: Before submitting a pull request, ensure all tests pass:
  ```bash
  npm test
  npm run lint
  npm run build
  ```
- **Commit Messages**: Write concise, descriptive commit messages in imperative tense (e.g. `feat: add CSV export to campaign ledger table`).

---

## Submitting Pull Requests
1. Create a feature branch: `git checkout -b feature/your-feature-name`.
2. Commit your changes with clear messages.
3. Open a pull request against `main` with a clear explanation of what was changed and how it was tested.

