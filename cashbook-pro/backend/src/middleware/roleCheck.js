// Usage: fastify.addHook('preHandler', roleCheck(['admin']))
export function roleCheck(allowedRoles) {
  return async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
  };
}