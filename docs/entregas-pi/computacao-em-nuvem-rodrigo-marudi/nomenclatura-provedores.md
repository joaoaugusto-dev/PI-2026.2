# Plano de Infraestrutura

## Comparação de Serviços entre Provedores

### Objetivo

Comparar os serviços dos provedores de nuvem que podem ser utilizados na infraestrutura do projeto.

### Serviços Considerados

| Serviço | AWS | Microsoft Azure | Google Cloud (GCP) | Utilização no Projeto |
| --- | --- | --- | --- | --- |
| **Computação / API (IaaS)** | Amazon EC2 (`t3.micro`) | Azure Virtual Machines (`B1s`) | Compute Engine (`e2-micro`) | Execução da API Node.js/Express, Nginx e PM2 |
| **Armazenamento de objetos** | Amazon S3 | Azure Blob Storage | Cloud Storage | Hospedagem da SPA React compilada (estáticos) |
| **Banco de dados relacional** | Amazon RDS PostgreSQL | Azure Database for PostgreSQL Flexible | Cloud SQL for PostgreSQL | Banco relacional gerenciado com conformidade ACID |
| **CDN & Aceleração** | Amazon CloudFront | Azure CDN Standard / Front Door | Cloud CDN + External LB | Distribuição global de baixa latência e HTTPS |
| **Monitoramento & Logs** | Amazon CloudWatch | Azure Monitor (Log Analytics) | Cloud Logging & Monitoring | Coleta de telemetria, logs PM2/Nginx e alarmes |

### Possível Operação Futura

O **AWS Lambda** (Azure Functions / Cloud Functions) foi analisado como uma possível opção para operações futuras (ex: processamento de relatórios assíncronos ou webhooks de importação). O serviço permite executar funções sem a necessidade de manter servidores diretamente, porém **não é um requisito para a implementação atual do projeto**.

| Serviço | AWS | Azure | GCP | Status |
| --- | --- | --- | --- | --- |
| **Função Serverless** | AWS Lambda | Azure Functions | Cloud Functions | Possível uso futuro |

### Conclusão & Referência de Custos

Após a revisão arquitetural e simulação financeira detalhada na planilha [`/docs/entregas-pi/computacao-em-nuvem-rodrigo-marudi/custos-nuvem.xlsx`](custos-nuvem.xlsx) e no documento [`/docs/entregas-pi/computacao-em-nuvem-rodrigo-marudi/custos-nuvem.md`](custos-nuvem.md):
- A **AWS** foi selecionada como provedora primária recomendada devido ao menor custo total mensal (**$29.51/mês** no cenário base com banco gerenciado), impulsionada pelo *Always Free Tier* do CloudFront (1 TB/mês incluso) e facilidade de integração dos serviços.
- **Azure** e **GCP** foram validadas com paridade funcional para cenários de contingência ou migração futura.

