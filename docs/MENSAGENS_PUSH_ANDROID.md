# GESPOOL — notificações push Android (preparação)

Estado: **parcial, NÃO ATIVAR AINDA**. A base de dados e a API para associar
telemóveis aos utilizadores foram preparadas na branch de desenvolvimento.
Os avisos push e os sons **ainda não foram implementados**.

## O que já existe

- Dependência `react-native-notifications` 5.1.0 no `package.json`.
- Nova migração `migrations/20261116_dispositivos_push.sql` (não executada).
- `PUT /mensagens-internas/dispositivos` para associar um token FCM Android
  ao utilizador autenticado via JWT.
- `DELETE /mensagens-internas/dispositivos` para desassociar o token desse utilizador.
- A API não permite ao telemóvel escolher `empresaid` ou `usuario_id` dessas rotas.
- Os valores dos tokens não aparecem nas respostas nem devem ir para os logs.
- Os ficheiros de configuração e chaves Firebase estão excluídos de Git.

## O que ainda falta

1. Criar ou identificar o projeto Firebase que servirá a app GESPOOL e registar
   a aplicação Android com o identificador `com.gespoolapp`.
2. Colocar **localmente** o `google-services.json` em `android/app/`.
   **Nunca** enviar este ficheiro nem uma chave de conta de serviço para o GitHub.
3. Configurar o plugin Google Services e verificar a integração nativa Android
   da biblioteca `react-native-notifications` para a versão de React Native em uso.
4. Declarar/pedir autorização `POST_NOTIFICATIONS` em Android 13+ e criar
   um canal de notificações com som padrão (respeitar silêncio e preferências do utilizador).
5. Registar o token FCM ao iniciar sessão, atualizar quando o token mudar e
   desassociá-lo no logout; garantir que uma mudança de utilizador do mesmo
   dispositivo não entrega mensagens à conta anterior.
6. Preparar credenciais FCM HTTP v1 na Render em variáveis/ficheiros secretos,
   nunca em código. Implementar envio a cada destinatário autorizado (equipa
   e Administração), excluindo o autor. Remover tokens expirados/inválidos.
7. Enviar apenas um aviso genérico, por exemplo: "GESPOOL — Nova mensagem",
   sem texto privado, nome de cliente ou fotografias no ecrã bloqueado.
8. Testar num telefone Android real: app aberta, em segundo plano e fechada;
   permissões concedidas/negadas; som e modo silencioso; mudança de conta,
   equipas e empresa; duplicados e comunicação a todos.

## Sequência segura para ativação

- Verificar `JWT_SECRET` na Render **sem divulgar o valor**.
- Validar testes automáticos e a configuração native/Gradle Android.
- Numa base de dados de testes, aplicar primeiro as migrações
  `20261116_mensagens_internas.sql` e `20261116_dispositivos_push.sql`.
- Verificar o envio/receção real antes de tocar na versão estável.
- Só depois preparar novo APK e plano de deploy. Não instalar APK de testes
  sobre a versão estável usada no trabalho sem precauções.

## Referências técnicas

- https://firebase.google.com/docs/cloud-messaging/android/get-started
- https://firebase.google.com/docs/cloud-messaging/send/v1-api
- https://github.com/wix/react-native-notifications

**Nenhuma alteração a este documento ou às rotas, por si só, faz tocar
uma notificação no telemóvel.**
