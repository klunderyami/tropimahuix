# Integración agentes_tropi + fondo cañaveral — Tropimahuix

## Procedencia y alcance

Fuente: `https://github.com/klunderyami/agentes_tropi`.
Se incorporaron **los 35 System Prompts originales** en módulos privados del servidor
(`server/agentsNEG.ts`, `agentsSOC.ts`, `agentsADS.ts`, `agentsENG.ts`,
`agentsCON.ts`, `agentsSEO.ts`). No se copia Next.js ni se sustituye el panel
administrativo existente. Se preservan Vite/React, Supabase, catálogo, órdenes, chat,
carrito y métodos de pago existentes en la rama de partida.

### Panel administrativo

Ruta: `/admin/agentes` (acceso con `AdminRoute`, autorización real en middleware
`requireAdmin` usando Supabase `store_admins`). El panel previo `/admin` tiene
enlace "Centro de agentes".

- `GET /api/admin/agents`: catálogo público **solo para administradores autenticados**, con
  información de disponibilidad del proveedor, sin claves ni system prompts.
- `POST /api/admin/agents/:agentId/run`: recibe `{ "input": "tarea" }`, valida
  rol, identificador y límites, y envía un único pedido al proveedor de IA.
- Requiere `ANTHROPIC_API_KEY` **en el servidor de Vercel**. `ANTHROPIC_MODEL`
  es opcional; valor predeterminado `claude-sonnet-4-5`. Revisar que el modelo
  esté habilitado en la cuenta Anthropic.
- Sin clave, los agentes se muestran como *no configurados* y el botón de ejecución
  se deshabilita; no se fingen resultados ni se utilizan datos demo.
- Todo resultado es un **borrador para revisión**. No envía mensajes,
  no publica campañas, no llama a Make/n8n ni modifica datos de pedidos.

### Diferencia de negocio importante

El repositorio original fue redactado para **jugo de caña recién prensado**, mientras
Tropimahuix comercializa **licores y toritos artesanales**. El adaptador incorpora
contexto actualizado y prohíbe inventar márgenes, precios, promociones, agotamiento,
entregas o estadísticas sin evidencia. El contenido para bebidas alcohólicas debe
someterse a revisión antes de publicarse; no dirigirse a menores.

### Flujo opcional n8n

El formulario de distribuidores conserva el registro primario en
`public.distributors_leads`. Si se configura en Vercel
`TROPI_N8N_LEADS_WEBHOOK_URL` con la URL HTTPS del webhook de entrada de
`workflows/n8n-lead-whatsapp-supabase.json`, después de guardarse cada lead se
envían los campos: `name`, `phone`, `zona`, `origen`,
`nivel`, `estado`, `score`, `lead_id`.

La llamada n8n tiene un timeout de 3 segundos, y su error no impide la creación del lead.
**No activar** el workflow de WhatsApp, Make o ManyChat sin configurar sus propias
credenciales, consentimiento y reglas legales; nunca se insertan claves en el frontend.

Atención: el blueprint de origen incluye un nodo HTTP con URL
`$env.N8N_WEBHOOK_URL`; revisar ese destino para evitar auto-llamadas, y ajustar
credenciales, tablas y nombre de eventos a la instalación real. El blueprint es una
plantilla, no una automatización ya activa.

### Identidad visual

`public/cane-landscape.svg` es una ilustración original de plantación de caña.
`src/index.css` aplica capas traslúcidas y contraste a la portada y
"Nuestra Esencia", siguiendo la imagen de referencia compartida. Se adapta a móvil
y no depende de recursos externos, sin sustituir fotos reales de productos ni sus etiquetas.

## Lista de verificación antes de publicar

1. Compilar Vercel en una rama: validar TypeScript y Vite.
2. Revisar en vista previa móvil y escritorio los contrastes, fondo, navegación y fotos.
3. Confirmar `/api/health`, `/api/products`, catálogo, carrito, login, administrador,
   distribuidores y chat en el ambiente con variables de servidor configuradas.
4. Entrar como administrador a `/admin/agentes`: deben verse los 35 agentes.
5. Crear `ANTHROPIC_API_KEY` en Vercel Production/Preview correspondiente (no pegar
   claves en tickets, GitHub ni chats). Probar una generación real y límite de uso.
6. Verificar que `GET /api/admin/agents` y `POST /api/admin/agents/:id/run`
   rechazan usuarios anónimos o no administradores.
7. Revisar flujo de distribuidores y configurar n8n solo si se desea activar la
   automatización y se dispone de un webhook HTTPS autorizado.
8. No mezclar esta rama con la migración Stripe sin validar ambos cambios por separado.

