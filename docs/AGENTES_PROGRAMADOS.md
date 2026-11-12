# Agentes programados de Tropimahuix (sin equipo local)

## Calendario (America/Mexico_City, UTC-6)
| Agente | Hora local | Días | Agente original |
|---|---|---|---|
| Publicidad Facebook | 09:00 | diario | AGT-ADS-CA |
| Mensajes clientes | 10:00 | diario | AGT-NEG-WT |
| Distribuidores | 12:00 | diario | AGT-NEG-CA |
| Instagram | 15:00 | lunes, miércoles, viernes | AGT-SOC-IR |
| Ventas | 18:00 | lunes | AGT-ADS-AL |

GitHub Actions (`.github/workflows/agent-schedules.yml`) llama una vez por ejecución al endpoint privado de Vercel. El servidor valida horario y día local con `Intl.DateTimeFormat`. El programador puede retrasarse: fuera de la hora local correspondiente se rechaza sin ejecutar. La clave única (agente, fecha local) evita duplicados y consumo repetido.

## Activación obligatoria

1. Ejecutar `supabase/migrations/20261106_agent_scheduled_runs.sql` en el Supabase de Tropimahuix. No modifica órdenes ni productos.
2. Crear una clave aleatoria de al menos 32 bytes. Guardar **el mismo valor** como `AGENT_CRON_SECRET` en Vercel Production y como secreto de GitHub Actions del repositorio. Nunca usar una variable `VITE_*` ni incluir la clave en el código. No se crea automáticamente.
3. Configurar `OPENAI_API_KEY` **solo en Vercel Production**, y opcionalmente `OPENAI_MODEL` (predeterminado `gpt-4.1-mini`). La API OpenAI requiere una cuenta con facturación/cuota disponible.
4. Confirmar en GitHub → Actions que el workflow está habilitado en la rama predeterminada después de fusionar el PR. Los cron de GitHub Actions pueden retrasarse o saltarse ocasionalmente.
5. Acceder como administrador a `/admin/agentes` y consultar el calendario e historial.
6. Probar primero en un entorno no productivo con datos no sensibles, incluyendo intentos anónimos (401), horarios inválidos (409), solicitudes repetidas (no duplicados), errores de API y aprobación/rechazo.

## Seguridad y permisos

- **No se envían mensajes a clientes ni distribuidores**, ni se crean anuncios pagados, ni se publica contenido en Meta. Se generan borradores y un administrador puede marcarlos como aprobados o rechazados. **Aprobar no ejecuta publicación ni envío**.
- El límite de 10 para mensajes es una política futura; no se seleccionan ni exportan destinatarios ni se presupone consentimiento. Antes de integrar Messenger o WhatsApp se requiere autorización del canal, consentimiento de cada destinatario, cumplimiento de políticas de Meta y reglas para publicidad de alcohol, segmentación por edad y jurisdicción.
- Las propuestas de productos se basan en un subconjunto del catálogo activo; los informes usan importes agregados de órdenes (sin datos personales); los seguimientos de distribuidores usan solo el número de registros recientes. Ninguna clave ni dato de contacto se envía al proveedor de IA.
- Tabla `agent_scheduled_runs` protegida por RLS, sin permisos para `anon` ni `authenticated`; únicamente backend service role.
- El endpoint de cron exige secreto compartido y aplica verificación de hora; los endpoints de historial y revisión requieren `store_admins`.
- Una ejecución fallida queda marcada como `failed` y **no se reintenta automáticamente ese día**, para evitar duplicados. Los registros deben revisarse desde el panel.
- El programador usa un endpoint HTTPS y GitHub Actions: no requiere laptop encendida, pero GitHub Actions, Vercel y el proveedor IA están sujetos a sus cuotas, precios y políticas.
- No se han configurado secretos reales, aplicado migraciones ni publicado tareas automáticamente.

## Fase siguiente, previa autorización

Para enviar mensajes reales se necesitará integrar APIs oficiales de Meta, administrar consentimiento verificable, limitar envíos a 10 por día, registrar respuestas y bajas y exigir una segunda aprobación de destinatarios. Para anuncios pagados, Meta Ads API, cuenta publicitaria, permisos y presupuestos explícitos. No activar campañas de alcohol sin comprobar las políticas aplicables.
