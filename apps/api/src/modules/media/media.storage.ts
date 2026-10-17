import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { Environment } from "../../config/env";

export interface StoredMediaObject {
  body: Readable;
  sizeBytes: number | null;
}

export interface MediaStorage {
  put(storageKey: string, content: Buffer, contentType: string): Promise<void>;
  get(storageKey: string): Promise<StoredMediaObject | null>;
  delete(storageKey: string): Promise<void>;
}

function assertSafeStorageKey(storageKey: string): void {
  if (!/^[a-z0-9][a-z0-9/_\-.]+$/i.test(storageKey) || storageKey.includes("..")) {
    throw new Error("Unsafe media storage key.");
  }
}

export class FileSystemMediaStorage implements MediaStorage {
  private readonly root: string;

  constructor(directory: string) {
    this.root = resolve(process.cwd(), directory);
  }

  async put(storageKey: string, content: Buffer): Promise<void> {
    const path = this.pathFor(storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { flag: "wx", mode: 0o600 });
  }

  async get(storageKey: string): Promise<StoredMediaObject | null> {
    const path = this.pathFor(storageKey);
    try {
      const information = await stat(path);
      if (!information.isFile()) return null;
      return { body: createReadStream(path), sizeBytes: information.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    const path = this.pathFor(storageKey);
    await rm(path, { force: true });
  }

  private pathFor(storageKey: string): string {
    assertSafeStorageKey(storageKey);
    const path = resolve(this.root, storageKey);
    const pathFromRoot = relative(this.root, path);
    if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === "..") {
      throw new Error("Media storage key escapes its configured root.");
    }
    return path;
  }
}

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    configuration: Pick<
      Environment,
      | "OBJECT_STORAGE_ENDPOINT"
      | "OBJECT_STORAGE_REGION"
      | "OBJECT_STORAGE_ACCESS_KEY"
      | "OBJECT_STORAGE_SECRET_KEY"
      | "OBJECT_STORAGE_FORCE_PATH_STYLE"
    >,
  ) {
    this.client = new S3Client({
      endpoint: configuration.OBJECT_STORAGE_ENDPOINT,
      region: configuration.OBJECT_STORAGE_REGION,
      forcePathStyle: configuration.OBJECT_STORAGE_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: configuration.OBJECT_STORAGE_ACCESS_KEY,
        secretAccessKey: configuration.OBJECT_STORAGE_SECRET_KEY,
      },
    });
  }

  async put(storageKey: string, content: Buffer, contentType: string): Promise<void> {
    assertSafeStorageKey(storageKey);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: content,
        ContentLength: content.length,
        ContentType: contentType,
      }),
    );
  }

  async get(storageKey: string): Promise<StoredMediaObject | null> {
    assertSafeStorageKey(storageKey);
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      if (!object.Body) return null;
      const body =
        object.Body instanceof Readable
          ? object.Body
          : Readable.fromWeb(object.Body.transformToWebStream() as ReadableStream<Uint8Array>);
      return { body, sizeBytes: object.ContentLength ?? null };
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (statusCode === 404) return null;
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    assertSafeStorageKey(storageKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

export class InMemoryMediaStorage implements MediaStorage {
  private readonly objects = new Map<string, Buffer>();

  async put(storageKey: string, content: Buffer): Promise<void> {
    assertSafeStorageKey(storageKey);
    if (this.objects.has(storageKey)) throw new Error("Media object already exists.");
    this.objects.set(storageKey, Buffer.from(content));
  }

  async get(storageKey: string): Promise<StoredMediaObject | null> {
    assertSafeStorageKey(storageKey);
    const content = this.objects.get(storageKey);
    return content ? { body: Readable.from(content), sizeBytes: content.length } : null;
  }

  async delete(storageKey: string): Promise<void> {
    assertSafeStorageKey(storageKey);
    this.objects.delete(storageKey);
  }

  async content(storageKey: string): Promise<Buffer | null> {
    const object = await this.get(storageKey);
    if (!object) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of object.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    return Buffer.concat(chunks);
  }
}

export function createMediaStorage(environment: Environment): MediaStorage {
  if (environment.MEDIA_STORAGE_DRIVER === "s3") {
    return new S3MediaStorage(environment.OBJECT_STORAGE_BUCKET, environment);
  }
  return new FileSystemMediaStorage(environment.MEDIA_STORAGE_DIR);
}
