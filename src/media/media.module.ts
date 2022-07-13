import { Module } from "@nestjs/common";
import { StorageModule } from "src/storage/storage.module";
import { StorageService } from "src/storage/storage.service";
import { MediaController } from "./media.controller";

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [StorageService]
})
export class MediaModule { }