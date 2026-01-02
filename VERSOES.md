# 📘 Histórico de Versões — GESPOOL APP
## 🟢 v0.9.0-notificacoes — 2025-12-31
- Workflow completo de notificações (automáticas e manuais)
- Suporte a assunto + mensagem
- Mini-card e card completo estabilizados
- Homes de Orçamentação, Contabilidade e Equipa Técnica
- Build Android OK (debug)

## 🔵 Versão atual — pronta para commit
- **Branch:** versao-estavel-gespool
- **Data:** 2025-12-30
- **Estado:** Estável (build OK em emulador)

### Alterações principais
- Workflow de notificações (Modelo B com responsável)
- Limpeza do ReceberNotificacoesScreen
- Build Android validado

---

## 🔵 Versão atual (em desenvolvimento)
- **Branch:** `versao-estavel-gespool`
- **Data:** 2025-11-22
- **Estado:** Estável (build debug OK em emulador e telemóvel)

### Alterações principais
- Logo da empresa:
  - Guardado na coluna `logo` da tabela `empresas`.
  - Carregado no header através do `HeaderLogo` usando `AsyncStorage`.
- Substituída a lib `react-native-document-picker` por `@react-native-documents/picker`.
- Corrigida compatibilidade com React Native 0.78.2.
- Gradle atualizado para `8.12` e JDK para `17.0.17`.
- Emulador configurado (Pixel 9 / API 35) com virtualização ativa (SVM Mode + HAXM/Hypervisor OK).
- Base de dados Render (`piscina_app`) ligada no pgAdmin4.
- Backup completo do Render criado e restaurado numa base local (`piscina_app_local`).

---

## 🟢 v-estavel-pos-format — 2025-10-25
- **Tag:** `v-estavel-pos-format`
- Primeira versão estável após formatar o PC.
- Upload de fotos funcional (conversão para base64 corrigida).
- Endpoint `/notificacoes` corrigido (campo `assunto` e duplicação de notificações).
- `.env` removido do repositório e adicionado ao `.gitignore`.

---

## 🟢 versao-estavel-gespool (antes do upgrade de hoje)
- Build e login OK na altura.
- API a correr em Render.
- Funcionalidade principal:
  - Login de administração e equipas
  - Gestão de clientes / equipas / dias da semana
  - Reportar avarias com foto
  - Manutenção com parâmetros químicos básicos.

---

## 📝 Notas
- **Regra de ouro:** Sempre que tiveres uma versão que *instala e faz login nos dois perfis*, regista aqui:
  - Data
  - Branch
  - O que foi feito
  - Se fizeste APK release para telemóvel.
- Para versões importantes, cria também uma **tag** no Git:
  - `git tag -a vX.Y -m "Descrição"`
  - `git push origin vX.Y`
