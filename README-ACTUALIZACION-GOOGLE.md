# Aurora – actualización de sincronización y auditoría

## Cambios de esta iteración
- Google Calendar solicita también eventos cancelados (`showDeleted=true`).
- Los eventos cancelados que ya tengan referencia académica se conservan en el registro con estado `cancelado_en_google`, en lugar de desaparecer silenciosamente o seguir pareciendo vigentes.
- Se conserva la deduplicación por `calendarId:eventId` y no se modifica ningún evento en Google.
- No se modificó la interfaz.

## Hallazgos que siguen abiertos
1. OAuth continúa usando `response_type=token` y guarda el access token en `localStorage`. No se debe describir como una autenticación moderna o plenamente segura.
2. No hay renovación silenciosa de tokens; al expirar se requiere volver a autorizar.
3. No existe sincronización en segundo plano cuando la app está cerrada. El chequeo cada seis horas solo ocurre mientras la app está abierta/visible.
4. La importación de Classroom no hace reconciliación de actividades eliminadas o que dejan de tener fecha límite.
5. La importación de Gmail usa fragmentos y metadatos; la extracción de fechas depende de revisión manual y del servicio Gemini configurado por la usuaria.
6. El keystore Android está incluido en el proyecto y el script configura una firma de depuración con credenciales predeterminadas. No cambiarlo a ciegas: podría impedir actualizar una instalación existente. Antes de distribuir/publicar, debe planearse una migración de firma con respaldo de datos y secretos de GitHub Actions.
7. Las políticas de Google Workspace de la UNAL y la conexión real no se pueden validar sin iniciar sesión con la cuenta institucional.

## Validación de esta iteración
- `node --check` sobre los scripts inline extraídos de `docs/index.html`.
- `node --check docs/sw.js`.
- Revisión estática del manejo de eventos cancelados.

No se ha probado con una cuenta real, dispositivo Android ni despliegue remoto.
