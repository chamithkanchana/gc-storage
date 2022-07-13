import { StorageFile } from "./storage-file";
import { DownloadResponse, Storage } from "@google-cloud/storage";
import { Injectable } from "@nestjs/common";
import StorageConfig from "./storage-config";
import { get } from "https";

@Injectable()
export class StorageService {
    private storage: Storage;
    private bucket: string;

    constructor() {
        this.storage = new Storage({
            projectId: StorageConfig.projectId,
            credentials: {
                client_email: StorageConfig.client_email,
                private_key: StorageConfig.private_key,
            },
        });

        this.bucket = StorageConfig.mediaBucket;
    }

    async save(
        path: string,
        contentType: string,
        media: Buffer,
        metadata: { [key: string]: string }[]
    ) {
        const object = metadata.reduce((obj, item) => Object.assign(obj, item), {});
        const file = this.storage.bucket(this.bucket).file(path);
        const stream = file.createWriteStream();
        stream.on("finish", async () => {
            return await file.setMetadata({
                metadata: object,
            });
        });
        stream.end(media);
    }


    async bufferImageLink(
        mediaId: string,
        fileUrl: string,
    ) {
        const contentType = 'image/png'
        const imageBuffer = await this.urlToBuffer(fileUrl);

        const file = this.storage.bucket(this.bucket).file(`media/${mediaId}.png`);
        const stream = file.createWriteStream({
            metadata: {
                contentType: contentType,
            }
        });
        stream.on("finish", async () => {
            return await file.setMetadata({
                metadata: {
                    mediaId: mediaId
                }
            });
        });
        stream.end(imageBuffer);
    }

    urlToBuffer(url: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const data: Uint8Array[] = [];
            get(url, (res) => {
                res
                    .on("data", (chunk: Uint8Array) => {
                        data.push(chunk);
                    })
                    .on("end", () => {
                        resolve(Buffer.concat(data));
                    })
                    .on("error", (err) => {
                        reject(err);
                    });
            });
        });
    }


    async delete(path: string) {
        await this.storage
            .bucket(this.bucket)
            .file(path)
            .delete({ ignoreNotFound: true });
    }

    async get(path: string): Promise<StorageFile> {
        const fileResponse: DownloadResponse = await this.storage
            .bucket(this.bucket)
            .file(path)
            .download();
        const [buffer] = fileResponse;
        const storageFile = new StorageFile();
        storageFile.buffer = buffer;
        storageFile.metadata = new Map<string, string>();
        return storageFile;
    }

    async getWithMetaData(path: string): Promise<StorageFile> {
        const [metadata] = await this.storage
            .bucket(this.bucket)
            .file(path)
            .getMetadata();
        const fileResponse: DownloadResponse = await this.storage
            .bucket(this.bucket)
            .file(path)
            .download();
        const [buffer] = fileResponse;

        const storageFile = new StorageFile();
        storageFile.buffer = buffer;
        storageFile.metadata = new Map<string, string>(
            Object.entries(metadata || {})
        );
        storageFile.contentType = storageFile.metadata.get("contentType");
        return storageFile;
    }
}