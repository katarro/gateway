## Ingresar a redis con su cli

```bash
docker exec -it redis redis-cli
```

### Listar todas las llaves

```bash
KEYS *
```

### Ver TTL

```bash
TTL mykey
```

### Autenticación

```bash
AUTH 'PASSWORD'
```

### Eliminar claves de la bd actual

```bash
FLUSHDB
```

### Conocer los valores de un SET

```bash
SMEMBERS queue:b493844c-e2e4-4ec3-a40f-72f58b92f423
```
