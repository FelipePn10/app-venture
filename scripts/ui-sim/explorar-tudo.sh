#!/bin/bash
# Varre todas as telas em lotes, retomando de onde parou.
# Roda a partir da raiz do projeto, onde quer que ele esteja.
cd "$(dirname "$0")/../.." || exit 1

# Trava: dois laços simultâneos escrevem no MESMO arquivo de resultado e se
# sobrescrevem — foi o que fez a varredura parecer travada, com dois processos
# disputando o mesmo JSON e lançando navegadores em dobro.
exec 9>/tmp/venture-ui-sim.lock
flock -n 9 || { echo "já existe uma varredura em andamento"; exit 0; }

limpar_navegadores() {
  # Tela que estoura o tempo deixa o navegador para trás. Sem esta limpeza os
  # órfãos se acumulam entre os lotes. O padrão fica AQUI DENTRO de propósito:
  # num `pkill -f` digitado na linha de comando, o padrão casa com o próprio
  # comando e ele mata a si mesmo.
  ps -eo pid,args | grep "ms-playwright/chromium" | grep -v grep \
    | awk '{print $1}' | while read -r pid; do kill -9 "$pid" 2>/dev/null; done
}

for i in $(seq 1 40); do
  LIMITE_TELA_MS=75000 LOTE=5 node scripts/ui-sim/explorar.mjs 2>&1
  limpar_navegadores
  n=$(node -e "try{console.log(require('/tmp/venture-ui-sim/exploracao.json').length)}catch(e){console.log(0)}")
  [ "$n" -ge 131 ] && break
done
echo "EXPLORAÇÃO COMPLETA"
