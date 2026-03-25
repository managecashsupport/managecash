import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { roleCheck } from '../middleware/roleCheck.js';
import { validateFileUpload } from '../services/storage.js';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function uploadRoutes(fastify, options) {
  // POST /upload/presigned-url
  fastify.post('/presigned-url', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { fileName, fileType, fileSize } = request.body;

      if (!fileName || !fileType || !fileSize) {
        return reply.status(400).send({ error: 'File name, type, and size are required' });
      }

      const validation = validateFileUpload(fileName, fileType, fileSize);
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.errors.join(', ') });
      }

      const key = `${request.user.shopId}/${request.user.userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileName.split('.').pop()}`;

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: fileType,
        ContentLength: fileSize,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

      return reply.send({ uploadUrl: url, fileUrl, key });
    } catch (err) {
      console.error('Generate presigned URL error:', err);
      return reply.status(500).send({ error: 'Failed to generate upload URL' });
    }
  });

  // GET /upload/file/:key
  fastify.get('/file/:key', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { key } = request.params;
      const keyParts = key.split('/');
      if (keyParts.length < 3 || keyParts[0] !== request.user.shopId) {
        return reply.status(403).send({ error: 'Access denied' });
      }
      return reply.send({ fileUrl: `${process.env.R2_PUBLIC_URL}/${key}` });
    } catch (err) {
      console.error('Get file URL error:', err);
      return reply.status(500).send({ error: 'Failed to get file URL' });
    }
  });

  // DELETE /upload/file/:key
  fastify.delete('/file/:key', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const { key } = request.params;
      const keyParts = key.split('/');
      if (keyParts.length < 3 || keyParts[0] !== request.user.shopId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
      return reply.send({ success: true });
    } catch (err) {
      console.error('Delete file error:', err);
      return reply.status(500).send({ error: 'Failed to delete file' });
    }
  });
}
