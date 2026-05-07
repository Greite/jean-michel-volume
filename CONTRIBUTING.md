# Contributing to Jean-Michel Volume

Thank you for your interest in this project! All contributions are welcome.

## 🐛 Reporting a bug

If you find a bug, please open an [issue](https://github.com/greite/jean-michel-volume/issues) including:

- A clear description of the problem
- Steps to reproduce the bug
- Expected vs. actual behavior
- Your environment (browser, OS, Node version, etc.)
- Screenshots if relevant

## ✨ Proposing a feature

Before opening a pull request for a new feature, please open an issue first to discuss it. This avoids working on something that wouldn't be accepted.

## 🔧 Development workflow

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/jean-michel-volume.git
cd jean-michel-volume
```

### 2. Install dependencies

```bash
nvm use
pnpm install
```

### 3. Create a branch

Name your branch following the project convention:

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-fix
```

### 4. Develop

- Start the development server: `pnpm dev`
- Follow the existing code style (Biome is configured)
- Run linting + type check: `pnpm lint` (runs `tsc` then Biome check/format)
- Auto-fix formatting and lint issues: `pnpm biome:write`

### 5. Commits

Follow the project's commit convention:

```
<Type> - #<TicketId> - <Description>
```

Examples:
- `Feature - #JMV-NoId - Add dark mode toggle`
- `Fix - #JMV-NoId - Fix volume sync issue`
- `Chore - #JMV-NoId - Update dependencies`

### 6. Pull Request

- Push your branch to your fork
- Open a pull request against `main`
- Clearly describe the changes
- Link the related issue if applicable
- Make sure CI passes

## 📋 Pre-PR checklist

- [ ] Code compiles without errors (`pnpm build`)
- [ ] Linting and type check pass (`pnpm lint`)
- [ ] Application works locally
- [ ] Documentation is updated if necessary
- [ ] Commits follow the project convention

## 📜 Code of conduct

Be respectful and kind to other contributors. Toxic behavior will not be tolerated.

## 📝 License

By contributing, you agree that your contributions will be distributed under the project's [MIT](./LICENSE.md) license.
