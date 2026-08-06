# Bot de Reddit Automatizado

Bot de Reddit construido con PRAW (Python Reddit API Wrapper) que incluye sistema de almacenamiento local, respuestas aleatorias y manejo de rate limits.

## Características

- ✅ **Autenticación segura** con variables de entorno usando python-dotenv
- ✅ **Almacenamiento local JSON** para registrar posts/comentarios ya respondidos
- ✅ **Respuestas aleatorias** con 10 plantillas predefinidas para evitar spam
- ✅ **Manejo de Rate Limits** con backoff exponencial (hasta 10 minutos de espera)
- ✅ **Logging completo** a archivo y consola
- ✅ **Monitoreo de subreddits** por palabras clave
- ✅ **Estadísticas** del bot (posts respondidos, plantillas, etc.)

## Instalación

### 1. Clonar o descargar el proyecto

```bash
# Si tienes git
git clone <tu-repo>
cd <tu-repo>
```

### 2. Crear entorno virtual (recomendado)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
```

### 5. Obtener credenciales de Reddit

1. Ve a https://www.reddit.com/prefs/apps
2. Click en "Create App" o "Create Another App"
3. Completa el formulario:
   - **name**: Nombre de tu bot
   - **App type**: Selecciona "script"
   - **redirect uri**: `http://localhost:8080` (puede ser cualquier URL)
4. Anota el **CLIENT_ID** (14 caracteres) y **CLIENT_SECRET**
5. Usa tu usuario y contraseña de Reddit

## Uso

### Ejecución básica

```bash
python reddit_bot.py
```

Esto inicializará el bot y mostrará las estadísticas. El bot estará listo para usar.

### Ejemplos de uso

#### 1. Responder a un post específico

```python
from reddit_bot import RedditBot

bot = RedditBot()

# Responder con mensaje personalizado
bot.reply_to_post('abc123', '¡Gracias por tu publicación sobre Python!')

# Responder con plantilla aleatoria
bot.reply_to_post('xyz789')
```

#### 2. Responder a un comentario

```python
bot = RedditBot()

# Responder a un comentario específico
bot.reply_to_comment('def456', 'Excelente punto de vista.')
```

#### 3. Monitorear un subreddit

```python
bot = RedditBot()

# Monitorear r/python en busca de posts sobre "machine learning"
bot.monitor_subreddit(
    subreddit_name='python',
    keywords=['machine learning', 'ml', 'tensorflow', 'pytorch'],
    limit=25  # Revisar últimos 25 posts
)
```

#### 4. Agregar plantillas personalizadas

```python
bot = RedditBot()

# Agregar nuevas plantillas de respuesta
bot.add_response_template("¡Excelente tutorial! {comment}")
bot.add_response_template("Esto es justo lo que buscaba. {comment}")
bot.add_response_template("Muy bien explicado. {comment}")
```

#### 5. Ver estadísticas

```python
bot = RedditBot()
stats = bot.get_stats()
print(stats)
# {'total_responded': 42, 'templates_count': 10, 'retry_count': 0, ...}
```

#### 6. Exportar IDs respondidos

```python
bot = RedditBot()
bot.export_responded_ids('backup_responded_ids.json')
```

## Estructura de archivos

```
.
├── reddit_bot.py              # Script principal del bot
├── .env                       # Variables de entorno (NO commitear)
├── .env.example               # Ejemplo de configuración
├── requirements.txt            # Dependencias de Python
├── responded_posts.json        # Almacenamiento local de IDs (auto-generado)
├── reddit_bot.log             # Logs del bot (auto-generado)
└── README_REDDIT_BOT.md       # Este archivo
```

## Configuración avanzada

### Modificar tiempo de espera entre respuestas

Edita la línea en `monitor_subreddit()`:

```python
# Actualmente: 30-120 segundos aleatorios
sleep_time = random.randint(30, 120)

# Cambiar a: 60-180 segundos
sleep_time = random.randint(60, 180)
```

### Modificar límite de reintentos

```python
bot = RedditBot()
bot.max_retries = 10  # Aumentar a 10 reintentos
```

### Agregar más plantillas

```python
bot = RedditBot()

# Agregar 20 plantillas nuevas
nuevas_plantillas = [
    "¡Perfecto! {comment}",
    "Justo lo que necesitaba. {comment}",
    # ... más plantillas
]

for plantilla in nuevas_plantillas:
    bot.add_response_template(plantilla)
```

## Almacenamiento

El bot usa un archivo JSON (`responded_posts.json`) para almacenar:

```json
{
  "responded_ids": ["abc123", "xyz789", "def456"],
  "last_updated": "2025-01-15T10:30:00",
  "total_responded": 3
}
```

### Exportar/Importar IDs

```python
# Exportar
bot.export_responded_ids('backup.json')

# Importar (cargar desde otro archivo)
# Simplemente reemplaza responded_posts.json con el backup
```

## Rate Limits

Reddit impone límites de tasa. El bot maneja esto automáticamente:

- **Primer intento**: Espera 1 minuto
- **Segundo intento**: Espera 2 minutos
- **Tercer intento**: Espera 4 minutos
- **Cuarto intento**: Espera 8 minutos
- **Quinto intento**: Espera 10 minutos (máximo)

Si se exceden los 5 reintentos, el bot lanza una excepción.

## Logging

El bot genera logs en dos lugares:

1. **Consola**: Salida en tiempo real
2. **Archivo**: `reddit_bot.log` con historial completo

Ejemplo de log:

```
2025-01-15 10:30:00 - INFO - ✅ Autenticado exitosamente como: MiBot
2025-01-15 10:30:05 - INFO - 🎯 Post encontrado: Cómo aprender Python...
2025-01-15 10:30:06 - INFO - 💬 Respondido al post abc123
2025-01-15 10:30:06 - INFO - 😴 Esperando 45 segundos antes de la próxima respuesta...
```

## Solución de problemas

### Error de autenticación

```
❌ Error de autenticación: 401 Unauthorized
```

**Solución**: Verifica que CLIENT_ID, CLIENT_SECRET, REDDIT_USER y REDDIT_PASS sean correctos en `.env`.

### Rate limit excedido

```
⏳ Rate limit excedido. Esperando 120 segundos...
```

**Solución**: El bot esperará automáticamente. Si persiste, reduce la frecuencia de uso.

### Archivo de almacenamiento corrupto

```
⚠️ Error al cargar almacenamiento: Expecting value: line 1 column 1
```

**Solución**: El bot iniciará con un almacenamiento vacío. Los IDs antiguos se perderán.

## Mejores prácticas

1. **No hagas spam**: Respeta las reglas de Reddit y los subreddits
2. **Varía tus respuestas**: Agrega suficientes plantillas (mínimo 10)
3. **Monitorea regularmente**: Revisa `reddit_bot.log` para detectar problemas
4. **Haz backup**: Exporta `responded_posts.json` regularmente
5. **Usa pausas largas**: 30-120 segundos mínimo entre respuestas
6. **Lee los términos de servicio**: Asegúrate de cumplir con Reddit's API Terms

## Licencia

Este proyecto es de código abierto y está disponible para uso educativo y comercial.

## Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Contacto

Para preguntas o soporte, abre un issue en el repositorio.