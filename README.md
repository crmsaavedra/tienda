# Autopartes Pro

E-commerce full-stack de repuestos de vehículos con Node.js, Express, MongoDB/Mongoose y Webpay Plus de Transbank.

## Inicio

1. Copia `.env.example` como `.env` y configura MongoDB, `JWT_SECRET` y las credenciales de Transbank.
2. Ejecuta `npm install`.
3. Carga datos iniciales con `npm run seed`.
4. Inicia con `npm run dev` y abre `http://localhost:3000`.

El administrador inicial se configura con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El pago usa Webpay Plus de Transbank (en certificación con los valores de ejemplo de `.env`, o en producción con tus credenciales). Las credenciales de Transbank y los datos para emitir boletas (SII) se configuran en el panel de administración > Config Avanzada. La confirmación del pago llega por `POST /api/payments/webpay/return`.