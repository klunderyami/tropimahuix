# Prueba de Subida de Imágenes - Solución Bucket "productos"

## Estado del Servidor
✅ Servidor corriendo en http://localhost:9005
✅ Health check: {"status":"healthy"}
✅ Supabase Storage inicializado correctamente

## Cambios Realizados

### 1. Corregido: Orden de carga de variables de entorno
**Problema:** Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` se leían antes de que dotenv cargara el archivo `.env`.

**Solución:** Movida la lectura de estas variables al interior de la función `initializeServices()`, después de que dotenv haya cargado el archivo.

**Archivo:** `server/index.ts` (líneas 14-16 eliminadas, variables ahora leídas en línea 82)

### 2. Mejorado: Manejo del bucket "productos"
**Cambios en el endpoint `/api/upload/image`:**

- ✅ Ahora retorna errores detallados si el bucket no existe
- ✅ Mejor logging para diagnosticar problemas
- ✅ Instrucciones claras en el mensaje de error para crear el bucket manualmente
- ✅ Corregida la obtención de URL pública (ahora accede a `publicUrlData.data.publicUrl`)

### 3. Mejorado: Logging
Ahora el servidor muestra:
- 📤 [Upload] Verificando buckets en Supabase Storage...
- 📤 [Upload] Buckets disponibles: [lista de buckets]
- 📤 [Upload] Bucket "productos" existe: true/false
- ⚠️ [Upload] Bucket "productos" no existe, creándolo...
- ✅ [Upload] Bucket "productos" creado exitosamente

## Cómo Probar

### Opción 1: Desde el AdminDashboard (Recomendado)
1. Abre el navegador en http://localhost:5173/admin
2. Inicia sesión como administrador
3. Ve a la pestaña "Productos"
4. Click en "Haz clic para seleccionar imagen"
5. Selecciona una imagen (PNG, JPG o WebP)
6. Deberías ver:
   - ✅ "Imagen lista para subir: XX.XKB" en la consola del navegador
   - Preview de la imagen comprimida
7. Llena el formulario del producto
8. Click en "Crear producto"
9. **Resultado esperado:**
   - Si el bucket existe: ✅ Producto creado correctamente
   - Si el bucket no existe: Error con instrucciones para crearlo

### Opción 2: Verificar logs del servidor
Abre la terminal donde corre `npm run server:dev` y busca:
- `📤 [Upload] Verificando buckets en Supabase Storage...`
- `📤 [Upload] Buckets disponibles: [...]`
- `📤 [Upload] Bucket "productos" existe: true/false`

## Si el bucket "productos" no existe

### Crear bucket manualmente:
1. Ve a https://supabase.com/dashboard/project/tohpxpoxcsciiojcltal/storage/buckets
2. Click en "New bucket"
3. Nombre: `productos`
4. Marca "Public bucket" ✅
5. File size limit: 5 MB (opcional)
6. Click "Create bucket"

### O permitir que el servidor lo cree automáticamente:
El código ahora intentará crear el bucket automáticamente si no existe. Si tienes permisos de service_role, debería crearlo solo.

## Solución de Problemas

### Error: "Bucket not found"
**Causa:** El bucket "productos" no existe en Supabase Storage.

**Solución:** Crear el bucket manualmente siguiendo los pasos arriba.

### Error: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"
**Causa:** Variables de entorno no cargadas correctamente.

**Solución:** Verificar que el archivo `.env` existe en la raíz del proyecto con las credenciales correctas.

### Error: "Error de Supabase Storage: ..."
**Causa:** Posiblemente permisos insuficientes o bucket no existe.

**Solución:** 
1. Verificar que `SUPABASE_SERVICE_KEY` sea la service_role key (no la anon key)
2. Crear el bucket manualmente

## Próximos Pasos
1. Probar subida de imagen desde el AdminDashboard
2. Verificar logs del servidor
3. Si hay errores, revisar mensaje detallado en consola del navegador y terminal del servidor
4. Crear bucket manualmente si es necesario

## Notas Técnicas
- Las imágenes se comprimen automáticamente a 800px de ancho máximo
- Formato de salida: JPEG con 70% de calidad
- Tamaño máximo: 5MB
- Nombre de archivo: `{timestamp}-{nombre-original}.jpg`
- Ruta en Storage: `productos/{timestamp}-{nombre-original}.jpg`