# Proyecto Tienda - Resumen de Trabajo (Session Map)

## Objective
- **Tras eliminar Mercado Pago y pasar a Webpay Plus + boletas SII** (fase anterior): (1) corregir un 401 en el panel admin (token viejo por cambio de `JWT_SECRET`) haciendo que el cliente maneje 401 globalmente, y (2) poblar la BD con un dataset demo completo.

## Important Details
- Proyecto: `C:\Users\crism\Desktop\proyecto_tienda` (Node/Express/Mongoose + React/Vite en `client/`). DB local `mongodb://127.0.0.1:27017/autopartes_pro`.
- **El 401 `/api/admin/dashboard` era por token desactualizado**: al reconstruir `.env` (quedó corrupto en una fase anterior) el `JWT_SECRET` cambió a `cambia-este-secreto-por-uno-largo-y-aleatorio`, invalidando tokens firmados antes. Login fresco + `/api/admin/dashboard` verificado OK.
- **Fix cliente**: interceptor global de axios en `client/src/App.jsx` — ante cualquier 401 (que no sea `/api/auth/*`), hace `logout()` (borra `apToken` y sesión persistida) y redirige a `/login`.
- **Seed demo**: nuevo `src/seed-demo.js` + `npm run seed:demo` (idempotente, no borra datos): admin y cliente demo, 30 repuestos con imágenes SVG generadas, descuentos, banners, 3 órdenes (paid/dispatched/delivered) + 3 reseñas. **No** borra auditlogs (al inicio se quitó un `dropCollection`).
- Cuentas: admin `admin@autopartespro.cl` / `CambiaEstaClave123!` (con 2FA de **desactivado** probado en smoke previos); demo `demo@autopartespro.cl` / `DemoClave123!`.
- BD tras seed: ~42 parts, 5 users, 7 orders, 3 discounts, 8 reviews, 1 site config (con banners). Reportes del admin (últimos 30 días) se ven poblados.
- Tests **26/26** y `npm run check` (build Vite) OK tras los cambios.

## Work State
### Completed
- App.jsx: interceptor 401 global (logout + redirección a /login).
- seed-demo.js creado y ejecutado; script agregado a package.json.
- Verificación: build OK, tests 26/26, login+admin dashboard OK vía API.

### Active
- (ninguno)

### Blocked
- (ninguno)

## Next Move
1. En el navegador: salir de sesión y volver a entrar (el 401 ya no se quedará "colgado"; la app redirige sola). Opcional: definir un `JWT_SECRET` real y estable en `.env`.
2. Configurar desde Admin > Config Avanzada las credenciales reales de Transbank y los datos SII (RUT, razón social, folios).

## Backlog / mejoras propuestas (priorizadas a petición del usuario)
- Quick fixes: (1) guard en `finalizePaidOrder` contra doble confirmación Webpay (doble descuento de stock); (2) el checkout recalcula `shippingCost` en servidor en vez de confiar en el body del cliente; (3) setear `orderNumber` secuencial (usado por mailer); (4) agregar índice y aggregate para `/api/admin/customers` (N+1).
- Robustez: partir `server.js` en routers, unificar `/api/config` y `/api/site-config`, retención de auditlogs, validación con librería (Joi/Zod), tests de flujo Webpay (mock fetch) y contenido de boleta, ESLint en cliente.
- Funcionalidad: checkout de invitados, reserva de stock temporal, recovery codes 2FA, desuscripción de alertas de stock, mapa de transiciones de estado, CRUD de reseñas.
- Deploy: Dockerfile, PM2/systemd, HTTPS, cron de backups, JSON-LD/robots.txt/OG, PWA.

## Relevant Files
- `client/src/App.jsx` (interceptor 401).
- `src/seed-demo.js` + `package.json` (`seed:demo`).
- (Fase anterior) `src/payments.js`, `src/models.js`, `src/invoice.js`, `src/server.js`, `client/src/pages/admin/AdminDashboard.jsx`, `.env`, `.env.example`.