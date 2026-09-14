# Autopartes Pro

E-commerce full-stack de repuestos de vehículos con Node.js, Express, MongoDB/Mongoose y Mercado Pago.

## Inicio

1. Copia `.env.example` como `.env` y configura MongoDB, `JWT_SECRET` y `MP_ACCESS_TOKEN`.
2. Ejecuta `npm install`.
3. Carga datos iniciales con `npm run seed`.
4. Inicia con `npm run dev` y abre `http://localhost:3000`.

El administrador inicial se configura con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. En modo de prueba de Mercado Pago usa credenciales TEST. El webhook queda expuesto en `POST /api/payments/webhook` y debe registrarse con la URL pública de tu entorno.
