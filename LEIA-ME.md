# CestaCusto no GitHub Pages

1. Extraia o ZIP de entrega no computador. Não envie apenas o ZIP fechado.
2. Envie os arquivos extraídos para a raiz do repositório cestacusto. O index.html deve ficar na raiz, não dentro de uma pasta extra.
3. No GitHub, abra Settings > Pages. Em Source, escolha Deploy from a branch, branch main e pasta / (root). Salve.
4. Aguarde a publicação. Para a conta atual, o endereço é https://enzo34433443.github.io/cestacusto/.

Os arquivos HTML, CSS e JavaScript na raiz são o site pronto, sem instalação ou compilação. O arquivo projeto-completo.zip contém todo o código-fonte versionado, incluindo o servidor, esquema do banco, dependências declaradas e arquivos originais. Não contém dependências instaladas, credenciais nem dados pessoais cadastrados.

## Sincronização entre aparelhos

O GitHub Pages hospeda os arquivos do site, mas não executa o servidor de sincronização. Esta cópia conserva a ligação com https://cestacusto-calculadora.bistro43emporio.chatgpt.site/api/sync. O servidor atual permite acesso da origem https://enzo34433443.github.io. Portanto, a sincronização nessa conta depende de o site original e seu servidor continuarem disponíveis. Outro usuário GitHub ou domínio próprio exige ajustar a origem permitida no servidor. Não há migração do banco dentro deste ZIP.

Sem o servidor, é possível usar o cadastro, cálculo, receitas e importação localmente no navegador, mas não sincronizar aparelhos. Para independência completa, o servidor worker/index.js e o banco D1 devem ser hospedados separadamente, com a tabela sync_sessions da migração drizzle; configure também a origem permitida e o endereço SYNC_API em app.js. O GitHub Pages sozinho não executa esse servidor.

## Seus produtos atuais

Os dados salvos no navegador do site original não aparecem automaticamente no domínio do GitHub. Antes de mudar, faça Backup nas configurações e use Restaurar no novo endereço; ou conecte a mesma chave de sincronização. Guarde esse backup fora de um repositório público.

Este pacote reproduz a versão atual do site, sem revisão geral de suas funcionalidades.

Documentação: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
