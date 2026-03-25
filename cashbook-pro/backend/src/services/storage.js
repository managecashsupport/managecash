import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function isValidFileType(fileType) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(fileType);
}

function generateFileKey(shopId, userId, originalName) {
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const ext = originalName.split('.').pop();
  return `${shopId}/${userId}/${timestamp}-${randomId}.${ext}`;
}

export async function generatePresignedUrl(fileName, fileType, fileSize, shopId = 'temp', userId = 'temp') {
  try {
    if (!fileName || !fileType || !fileSize) {
      throw new Error('File name, type, and size are required');
    }
    if (!isValidFileType(fileType)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
    }
    if (fileSize > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const key = generateFileKey(shopId, userId, fileName);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return {
      uploadUrl: url,
      key,
      fileUrl: `${process.env.R2_PUBLIC_URL}/${key}`
    };
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    throw error;
  }
}

export function getFileUrl(key) {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteFile(key) {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
}

export function validateFileUpload(fileName, fileType, fileSize) {
  const errors = [];

  if (!fileName) errors.push('File name is required');
  if (!fileType) errors.push('File type is required');
  else if (!isValidFileType(fileType)) errors.push('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
  if (!fileSize) errors.push('File size is required');
  else if (fileSize > 5 * 1024 * 1024) errors.push('File size must be less than 5MB');

  return { isValid: errors.length === 0, errors };
}
