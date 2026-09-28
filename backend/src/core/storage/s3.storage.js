import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export function createS3Storage({ region, endpoint, publicBaseUrl, accessKeyId, secretAccessKey, forcePathStyle }) {
  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
  });

  const publicUrl = (bucket, key) => {
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    if (publicBaseUrl) return `${publicBaseUrl.replace(/\/$/, "")}/${bucket}/${encoded}`;
    return `https://${bucket}.s3.${region}.amazonaws.com/${encoded}`;
  };

  return {
    name: "s3",

    async upload(bucket, key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "max-age=3600" }),
      );
      return { bucket, key, url: publicUrl(bucket, key) };
    },

    async remove(bucket, keys) {
      if (!keys.length) return;
      await client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }),
      );
    },

    publicUrl,
  };
}
