const { z } = require('zod');

const emailField = z.string().email('Correo inválido').toLowerCase();

const schemas = {
  register: z.object({
    name: z.string().min(2, 'Nombre muy corto'),
    email: emailField,
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    rut: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional()
  }),
  login: z.object({ email: emailField, password: z.string().min(1, 'Ingresa tu contraseña') }),
  login2fa: z.object({ otpKey: z.string().min(1), code: z.string().min(4, 'Código inválido') }),
  twofaPassword: z.object({ password: z.string().min(1, 'Ingresa tu contraseña') }),

  quote: z.object({
    items: z.array(z.object({ partId: z.string().min(1), qty: z.number().int().positive() })).min(1, 'Agrega al menos un producto'),
    discountCode: z.string().optional()
  }),

  checkout: z.object({
    items: z.array(z.object({ partId: z.string().min(1), qty: z.number().int().positive() })).min(1, 'Agrega al menos un producto'),
    discountCode: z.string().optional(),
    customerInfo: z.object({
      name: z.string().min(2, 'Ingresa tu nombre'),
      email: emailField,
      rut: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      region: z.string().optional()
    }),
    deliveryMethod: z.enum(['pickup', 'delivery']).optional()
  }),

  stockAlert: z.object({ partId: z.string().min(1), email: emailField }),
  review: z.object({ partId: z.string().min(1), rating: z.number().int().min(1, 'Calificación mínima 1').max(5, 'Calificación máxima 5'), comment: z.string().min(3, 'Comentario muy corto') }),
  reviewUpdate: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().min(3, 'Comentario muy corto').optional()
  }).refine(d => d.rating !== undefined || d.comment !== undefined, { message: 'Nada para actualizar' }),

  discount: z.object({
    code: z.string().min(1).toUpperCase(),
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive(),
    minimumAmount: z.number().min(0).optional(),
    startsAt: z.string().optional(),
    endAt: z.string().min(1, 'Define una fecha de término'),
    active: z.boolean().optional()
  }),

  orderStatus: z.object({ status: z.enum(['cancelled', 'refunded', 'dispatched', 'delivered']) })
};

// Asegura que el body del checkout tenga email en minúsculas (ya transformado por zod).
function validate(schemaName) {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Validación desconocida: ${schemaName}`);
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: result.error.issues.map(i => i.message) });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate, schemas };