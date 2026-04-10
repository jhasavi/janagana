import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];

@Injectable()
export class UploadService {
  private readonly maxImageBytes = 5 * 1024 * 1024;
  private readonly maxDocBytes = 10 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  private validateImage(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WEBP and GIF images are supported.');
    }
    if (file.size > this.maxImageBytes) {
      throw new BadRequestException('Image file size must be 5MB or smaller.');
    }
  }

  private validateDocument(file: Express.Multer.File) {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Document type is not supported.');
    }
    if (file.size > this.maxDocBytes) {
      throw new BadRequestException('Document size must be 10MB or smaller.');
    }
  }

  private buildUploadData(file: Express.Multer.File, folder: string) {
    const resource = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    return {
      file: resource,
      folder: folder.replace(/^\/+/, ''),
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
  }

  async uploadImage(file: Express.Multer.File, folder = 'images') {
    this.validateImage(file);
    const result = await cloudinary.uploader.upload(this.buildUploadData(file, folder), {
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
    });
    return this.toResponse(result);
  }

  async uploadDocument(file: Express.Multer.File, folder = 'documents') {
    this.validateDocument(file);
    const result = await cloudinary.uploader.upload(this.buildUploadData(file, folder), {
      resource_type: 'raw',
      chunk_size: 6000000,
    });
    return this.toResponse(result);
  }

  async deleteFile(publicId: string) {
    const response = await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    if (response.result !== 'ok' && response.result !== 'not found') {
      throw new BadRequestException('Failed to delete file.');
    }
  }

  private toResponse(result: UploadApiResponse) {
    return {
      url: result.secure_url ?? result.url,
      publicId: result.public_id,
    };
  }
}
