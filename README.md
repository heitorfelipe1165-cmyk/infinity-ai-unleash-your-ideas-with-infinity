# Infinity AI: Your Cybernetic Assistant

Desenvolva o site completo da "Infinity AI" com Supabase ativado, contendo todas as telas, regras de negócio e integrações detalhadas a seguir:

1. IDENTIDADE VISUAL E DESIGN (TEMA DA INFRAESTRUTURA)
- Crie um layout moderno, responsivo e limpo com tema escuro (Dark Mode).
- Utilize paleta de cores focada em tons de grafite escuro, preto e detalhes brilhantes em neon azul e roxo (efeito cyberpunk/premium).
- Adicione transições suaves e efeitos de hover (passar o mouse) com bordas iluminadas nos botões principais.

2. SISTEMA DE AUTENTICAÇÃO E REGRAS DE ACESSO (DONO VS CLIENTE)
- Configure uma tela de login e cadastro integrada ao Supabase Auth usando e-mail e senha.
- REGRA CRÍTICA DE ADMINISTRAÇÃO: Se o e-mail logado for exatamente "heitorfelipe1165@gmail.com", o sistema deve atribuir automaticamente a este usuário o cargo de "Dono/Administrador". O dono tem acesso 100% gratuito e irrestrito a todas as ferramentas do site, pulando qualquer bloqueio de pagamento.
- REGRA PARA DEMAIS USUÁRIOS: Para qualquer outro e-mail, o sistema deve verificar no banco de dados se o status da assinatura está ativo. Se o usuário for novo ou estiver inadimplente, ele deve ser bloqueado e redirecionado obrigatoriamente para a tela de Paywall.

3. TELA DE PAYWALL (SISTEMA DE COBRANÇA VIA PIX)
- Exiba uma mensagem de vendas impactante: "Acesse a melhor e mais completa Inteligência Artificial por apenas R$ 30,00 por mês".
- Mostre de forma clara e destacada a Chave PIX Copia e Cola: dd43ac3b-ea9d-4f70-bc06-60a3f5f200ac.
- Adicione um botão funcional "Copiar Chave PIX" que jogue o código para a área de transferência do usuário e mostre um aviso de "Copiado!".
- Crie um formulário simples onde o usuário digita o seu nome completo e realiza a simulação de envio do comprovante.
- Ao clicar no botão "Confirmar Pagamento", o sistema deve registrar uma solicitação com status "Pendente" no banco de dados e exibir a mensagem: "Seu pagamento foi enviado! O administrador irá liberar seu acesso em instantes."

4. ESTRUTURA COMPLETA DA BARRA LATERAL (SIDEBAR) E MENU SECRETO
A barra lateral esquerda do Dashboard deve ser dividida estritamente nas seguintes seções:
- NO TOPO: Botão proeminente "+ Novo Chat" (ou "+ New Chat"). Ao ser clicado, ele limpa instantaneamente a janela de conversa ativa na tela para iniciar um diálogo do zero.
- LOGO ABAIXO: Um botão chamado "Chats" acompanhado de um ícone de pasta/balão. Ao clicar nele, o painel central deve abrir o histórico de todas as conversas anteriores do usuário salvas no Supabase.
- NO MEIO (LISTA DE CONVERSAS): Exiba os chats salvos. Quando o usuário clica em um item, o histórico completo de mensagens daquela conversa antiga é recarregado na tela. O título de cada chat deve ser gerado automaticamente usando exatamente o texto da primeiríssima mensagem que o usuário enviou naquele chat.
- NA BASE (EXCLUSIVO DO DONO): Um botão chamado "Painel Admin" (ou "Gerenciar Usuários"). Este botão SÓ PODE APARECER se o e-mail logado for "heitorfelipe1165@gmail.com". Para qualquer outro usuário, este link deve ficar 100% invisível. Crie também uma proteção de rota na URL: se um usuário comum tentar acessar manualmente a rota "/admin", ele deve ser jogado de volta para a tela inicial.
- NO RODAPÉ: Botão de "Sair" (Logout).

5. TELA DE ADMINISTRAÇÃO INTERNA (VISÃO DO DONO)
- Ao clicar no botão "Painel Admin" na lateral, abra uma interface de gerenciamento exclusiva para o Heitor Felipe.
- Esta tela deve buscar no banco de dados e listar todas as solicitações de pagamento "Pendentes". Deve exibir: Nome do usuário, E-mail, Data do pedido e Status.
- Ao lado de cada usuário cadastrado, adicione dois botões funcionais:
  * "Aprovar Acesso": Altera o status da assinatura do cliente para "Ativo" no Supabase, liberando o chat para ele na hora.
  * "Recusar Acesso": Remove ou cancela a solicitação pendente.

6. MOTOR DE INTELIGÊNCIA ARTIFICIAL REAL E STREAMING
- Conecte o chat do frontend a uma inteligência artificial real utilizando chamadas seguras de API (através de Supabase Edge Functions ou rotas seguras de servidor) para integrar modelos como OpenAI GPT-4o ou Anthropic Claude. Garanta que a estrutura oculte a API Key para que ela não fique exposta no código público.
- Configure as respostas do chat para funcionarem em formato de Streaming (efeito de digitação palavra por palavra em tempo real, igual ao ChatGPT).
- Configure o Prompt do Sistema (System Prompt) para a IA saber que seu nome é "Infinity AI", agindo como um assistente virtual de elite, altamente prestativo, rápido e capaz de executar tarefas complexas.

7. CRIAÇÃO AUTOMÁTICA E DOWNLOAD DE ARQUIVOS ÚTEIS (.DOCX, .XLSX, .PPTX, .TXT)
- Instale e integre bibliotecas Javascript de manipulação de arquivos no frontend (como 'docx', 'exceljs' e 'pptxgenjs').
- Instrua a IA a estruturar suas respostas de forma que o sistema consiga interpretá-las. Sempre que o usuário solicitar a criação de um documento, relatório, tabela ou apresentação de slides, o sistema do chat deve renderizar dinamicamente um bloco de botões de ação logo abaixo da resposta da IA.
- Os botões devem ser funcionais e permitir o download imediato:
  * "Baixar como Word (.docx)": Transforma o relatório estruturado em um documento formatado com títulos e parágrafos.
  * "Baixar como Excel (.xlsx)": Pega dados tabulares ou listas geradas e os organiza dentro de células, linhas e colunas reais de uma planilha.
  * "Baixar como PowerPoint (.pptx)": Divide o conteúdo textual sugerido pela IA e o transforma em slides sequenciais e organizados dentro de uma apresentação.
  * "Baixar como Bloco de Notas (.txt)": Salva a resposta em texto limpo e puro.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://infinity-ai-unleash-your-ideas-with-infinity.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97e6cfcb-e687-4121-8dff-12d4ea62fdb3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
