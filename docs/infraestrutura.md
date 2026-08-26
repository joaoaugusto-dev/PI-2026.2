# Infraestrutura

## Arquitetura prevista

| Componente | Serviço | Objetivo |
|---|---|---|
| Banco | Supabase/PostgreSQL | Persistência |
| API | AWS EC2 t3.micro | Execução do Node.js |
| Front | AWS S3 + CloudFront | Hospedagem estática/CDN |
| Monitoramento | CloudWatch | Logs, métricas e alarmes |

## API

A API será executada com Node 20, PM2 e Nginx.

O Nginx funciona como reverse proxy e será configurado com HTTPS.

## Disponibilidade

- `pm2 startup`
- `pm2 save`
- healthcheck em `/v1/health`
- CloudWatch Alarm

## Ambientes

O desenvolvimento e os testes acontecem localmente primeiro.

Na etapa final:

- ambiente de desenvolvimento;
- ambiente de produção.

Para Supabase, estão previstos:

```text
soufer-dev
soufer-prod
```

Caso seja adotado PostgreSQL próprio, os bancos equivalentes deverão ser separados conforme a estratégia definida.

## Plano B

Se houver impedimento na AWS, o plano alternativo previsto é Render ou Railway.

## Custos

A documentação de custos deve comparar o mesmo desenho arquitetural nas calculadoras:

- AWS;
- Azure;
- GCP.

Equivalências previstas:

| AWS | Azure | GCP |
|---|---|---|
| EC2 | Virtual Machines | Compute Engine |
| RDS | Azure Database for PostgreSQL | Cloud SQL |
| S3 | Blob Storage | Cloud Storage |
| CloudFront | Front Door | Cloud CDN |
| Lambda | Functions | Cloud Functions |
| CloudWatch | Monitor | Cloud Monitoring |
