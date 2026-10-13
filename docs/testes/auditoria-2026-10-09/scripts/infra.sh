#!/bin/bash
# Testes de infraestrutura da 2ª rodada. uso: bash infra.sh <scratchpad>
S=$1; O=$S/out2; cd $S
API=/home/joao/development/projetos/PI-2026.2-auditoria/api
export PGPASSWORD=$(grep ^DB_PASSWORD $API/.env | cut -d= -f2) PGUSER=$(grep ^DB_USER $API/.env | cut -d= -f2) PGHOST=localhost

echo "== 1) resiliência: derruba todas as conexões da API no Postgres aos 10 s de carga"
python3 -I -c "import json; c=json.load(open('$S/scen2/load-25.json')); c['duration']=40; c['keepSamples']=True; json.dump(c,open('$S/scen2/resiliencia.json','w'))"
date +%s.%N > $O/resil-start.txt
node loadtest.mjs scen2/resiliencia.json $O/resiliencia.json &
LT=$!
sleep 10
date +%s.%N > $O/resil-kill.txt
psql -d soufer_v2 -tAc "SELECT count(pg_terminate_backend(pid)) FROM pg_stat_activity WHERE usename='soufer_audit_app' AND datname='soufer_v2'" > $O/resil-mortas.txt
wait $LT
echo "conexões derrubadas: $(cat $O/resil-mortas.txt)"
curl -s localhost:3998/v1/health | head -c 120; echo

echo "== 2) backup e restauração"
T0=$(date +%s.%N); pg_dump -Fc -d soufer_v2 -f $O/soufer_v2.dump; T1=$(date +%s.%N)
psql -d postgres -qc "DROP DATABASE IF EXISTS soufer_v2_restore" -c "CREATE DATABASE soufer_v2_restore"
T2=$(date +%s.%N); pg_restore -d soufer_v2_restore $O/soufer_v2.dump 2> $O/restore.err; T3=$(date +%s.%N)
Q="SELECT string_agg(t || '=' || n, ' ' ORDER BY t) FROM (SELECT 'ferramentas' t, count(*) n FROM ferramentas UNION ALL SELECT 'colaboradores', count(*) FROM colaboradores UNION ALL SELECT 'emprestimos', count(*) FROM emprestimos UNION ALL SELECT 'ocorrencias', count(*) FROM ocorrencias UNION ALL SELECT 'usuarios', count(*) FROM usuarios UNION ALL SELECT 'gatilhos', count(*) FROM pg_trigger WHERE NOT tgisinternal UNION ALL SELECT 'indices', count(*) FROM pg_indexes WHERE schemaname='public') x"
ORIG=$(psql -d soufer_v2 -tAc "$Q"); REST=$(psql -d soufer_v2_restore -tAc "$Q")
python3 -I -c "import json,sys; json.dump({'dump_s': round($T1-$T0,2), 'restore_s': round($T3-$T2,2), 'dump_kb': $(stat -c %s $O/soufer_v2.dump)//1024, 'original': sys.argv[1], 'restaurado': sys.argv[2], 'iguais': sys.argv[1]==sys.argv[2], 'erros_restore': open('$O/restore.err').read()[:300]}, open('$O/backup.json','w'))" "$ORIG" "$REST"
cat $O/backup.json; echo

echo "== 3) 10 exportações CSV simultâneas do histórico (50 mil linhas)"
T=$(cat $O/.admintoken)
node -e "
const t=process.argv[1];(async()=>{const s=performance.now();const r=await Promise.all(Array.from({length:10},async()=>{const a=performance.now();const x=await fetch('http://localhost:3998/v1/exportacoes/emprestimos',{headers:{authorization:'Bearer '+t}});const b=await x.arrayBuffer();return {st:x.status,ms:performance.now()-a,kb:b.byteLength/1024}}));
require('fs').writeFileSync('$O/exportacao.json',JSON.stringify({total_ms:Math.round(performance.now()-s),reqs:r.map(x=>({st:x.st,ms:Math.round(x.ms),kb:Math.round(x.kb)}))}));console.log(JSON.stringify(r.map(x=>x.st+' '+Math.round(x.ms)+'ms '+Math.round(x.kb)+'KB')))})()" "$T"
