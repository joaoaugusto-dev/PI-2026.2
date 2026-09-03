# Plano de Infraestrutura

## Comparação de Serviços entre Provedores

### Objetivo

Comparar os serviços dos provedores de nuvem que podem ser utilizados na infraestrutura do projeto.

### Serviços Considerados

| Serviço                   | AWS               | Utilização no Projeto                          |
| ------------------------- | ----------------- | ---------------------------------------------- |
| Armazenamento de objetos  | Amazon S3         | Armazenamento de arquivos e objetos            |
| Banco de dados relacional | Amazon RDS        | Banco de dados relacional gerenciado           |
| CDN                       | Amazon CloudFront | Distribuição de conteúdo                       |
| Monitoramento             | Amazon CloudWatch | Monitoramento da infraestrutura e dos serviços |

### Possível Operação Futura

O **AWS Lambda** foi analisado como uma possível opção para operações futuras. O serviço permite executar funções sem a necessidade de manter servidores diretamente, porém **não é um requisito para a implementação atual do projeto**.

| Serviço           | AWS        | Status              |
| ----------------- | ---------- | ------------------- |
| Função serverless | AWS Lambda | Possível uso futuro |

### Conclusão

Após a revisão, foram considerados como principais serviços da AWS o **Amazon S3**, **Amazon RDS**, **Amazon CloudFront** e **Amazon CloudWatch**.

O **AWS Lambda** permanece apenas como uma possibilidade para futuras necessidades do sistema, não sendo necessário para a implementação atual.
